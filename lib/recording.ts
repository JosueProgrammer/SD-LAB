import { promises as fs } from "fs";
import path from "path";
import { UTApi, UTFile } from "uploadthing/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { recordingsDir } from "@/lib/mediamtx";

const recordingStartFailed = new Set<string>();
const recordingStartError = new Map<string, string>();

function supabaseConfig() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
  const secret = process.env.SUPABASE_S3_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const region = process.env.SUPABASE_S3_REGION?.trim();
  if (!projectUrl || !accessKey || !secret || !bucket || !region) return null;

  const projectRef = projectUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  const endpoint =
    process.env.SUPABASE_S3_ENDPOINT?.replace(/\/$/, "") ||
    (projectRef
      ? `https://${projectRef}.storage.supabase.co/storage/v1/s3`
      : `${projectUrl}/storage/v1/s3`);

  return { projectUrl, accessKey, secret, bucket, region, endpoint };
}

function hasUploadThing() {
  return Boolean(process.env.UPLOADTHING_TOKEN);
}

function missingStorageMessage() {
  if (!supabaseConfig() && !hasUploadThing()) {
    return "Configura Supabase Storage (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY, SUPABASE_S3_REGION, SUPABASE_STORAGE_BUCKET) para guardar la grabación.";
  }
  return "Se necesita Supabase Storage o UploadThing para publicar la grabación.";
}

async function walkFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walkFiles(full)));
      else if (/\.(mp4|m4v|mkv)$/i.test(entry.name)) files.push(full);
    }
    return files;
  } catch {
    return [];
  }
}

async function findLatestRecording(streamPath: string): Promise<string | null> {
  const base = path.join(recordingsDir(), streamPath);
  const files = await walkFiles(base);
  if (files.length === 0) return null;

  const withStats = await Promise.all(
    files.map(async (file) => {
      const stat = await fs.stat(file);
      return { file, mtime: stat.mtimeMs, size: stat.size };
    })
  );

  withStats.sort((a, b) => b.mtime - a.mtime);
  const best = withStats.find((item) => item.size > 1024) ?? withStats[0];
  return best?.file ?? null;
}

async function uploadBytesToSupabase(objectPath: string, bytes: Uint8Array) {
  const { uploadMp4ToSupabase } = await import("@/lib/recording-upload");
  return uploadMp4ToSupabase(objectPath, bytes);
}

async function uploadToUploadThing(bytes: Uint8Array, fileName: string) {
  if (!hasUploadThing()) return null;
  const name = fileName.endsWith(".mp4") ? fileName : `${fileName}.mp4`;
  const file = new UTFile([Buffer.from(bytes)], name, { type: "video/mp4" });
  const utapi = new UTApi();
  const result = await utapi.uploadFiles(file);
  if (result.error || !result.data) {
    console.error("UploadThing rechazó la grabación", result.error);
    return null;
  }
  return result.data.ufsUrl || result.data.url || null;
}

async function publishLocalRecording(filePath: string, eventId: string) {
  const bytes = new Uint8Array(await fs.readFile(filePath));
  const fileName = `recordings/${eventId}-${Date.now()}.mp4`;

  const supabase = supabaseConfig();
  if (supabase) {
    // Subida vía S3-compatible firmada no está cableada aquí; usar UploadThing si falla.
    const viaPut = await uploadBytesToSupabase(fileName, bytes);
    if (viaPut) return viaPut;
  }

  return uploadToUploadThing(bytes, path.basename(fileName));
}

export async function startEventRecording(eventId: string) {
  if (recordingStartFailed.has(eventId)) return;

  if (!supabaseConfig() && !hasUploadThing()) {
    recordingStartError.set(eventId, missingStorageMessage());
    return;
  }

  const claim = await db.event.updateMany({
    where: {
      id: eventId,
      egressId: null,
      recordingUrl: null,
      status: { in: ["APPROVED", "LIVE"] },
      streamPath: { not: null },
    },
    data: { recordingEnabled: true },
  });
  if (claim.count !== 1) return;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { streamPath: true },
  });
  if (!event?.streamPath) return;

  try {
    // Marcamos el path de MediaMTX como "job" de grabación (record automático del servidor).
    recordingStartError.delete(eventId);
    await db.event.update({
      where: { id: eventId },
      data: { egressId: `mtx:${event.streamPath}` },
    });
    console.info("[recording] MediaMTX record activo", { eventId, streamPath: event.streamPath });
  } catch (error) {
    await db.event.update({
      where: { id: eventId },
      data: { recordingEnabled: false, egressId: null },
    });
    recordingStartFailed.add(eventId);
    recordingStartError.set(
      eventId,
      error instanceof Error ? error.message : "No se pudo preparar la grabación"
    );
    console.error("No se pudo iniciar la grabación", error);
  }
}

export async function allowRecordingRetry(eventId: string) {
  recordingStartFailed.delete(eventId);
  recordingStartError.delete(eventId);
  await db.event.updateMany({
    where: { id: eventId, egressId: null, recordingUrl: null },
    data: { recordingEnabled: false },
  });
}

export async function finalizeEventRecording(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { creator: { select: { username: true } } },
  });
  if (!event) return { url: null as string | null, error: null as string | null };
  if (event.recordingUrl) return { url: event.recordingUrl, error: null };

  if (!event.streamPath && !event.egressId) {
    const startError = recordingStartError.get(eventId);
    return {
      url: null,
      error: startError
        ? `No se pudo iniciar la grabación: ${startError}`
        : "No hay transmisión asociada para grabar. Genera la clave OBS y transmite antes de finalizar.",
    };
  }

  const streamPath =
    event.streamPath ||
    (event.egressId?.startsWith("mtx:") ? event.egressId.slice(4) : null);

  if (!streamPath) {
    return { url: null, error: missingStorageMessage() };
  }

  try {
    // Espera breve a que MediaMTX cierre el segmento
    let filePath: string | null = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      filePath = await findLatestRecording(streamPath);
      if (filePath) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (!filePath) {
      return {
        url: null,
        error:
          "No se encontró el archivo de grabación en MediaMTX. Verifica MEDIAMTX_RECORDINGS_DIR y que el volumen /recordings esté montado.",
      };
    }

    const recordingUrl = await publishLocalRecording(filePath, eventId);
    if (!recordingUrl) {
      return {
        url: null,
        error: "La grabación existe en disco, pero no se pudo publicar en el almacenamiento.",
      };
    }

    await db.event.update({
      where: { id: event.id },
      data: { recordingUrl, recordingEnabled: true },
    });
    revalidatePath(`/u/${event.creator.username}/repository`);
    revalidatePath(`/u/${event.creator.username}/repository/${event.id}`);
    return { url: recordingUrl, error: null };
  } catch (error) {
    console.error(error);
    return {
      url: null,
      error: error instanceof Error ? error.message : "No se pudo cerrar la grabación.",
    };
  }
}
