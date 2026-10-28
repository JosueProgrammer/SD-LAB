import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { recordingsDir } from "@/lib/mediamtx";
import { uploadMp4FileToSupabase } from "@/lib/recording-upload";

const recordingStartFailed = new Set<string>();
const recordingStartError = new Map<string, string>();
const uploadsInFlight = new Map<string, Promise<{ url: string | null; error: string | null }>>();

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

function missingStorageMessage() {
  return "Configura Supabase Storage (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY y SUPABASE_STORAGE_BUCKET) para guardar la grabación.";
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

async function findLargestRecording(streamPath: string): Promise<string | null> {
  const base = path.join(recordingsDir(), streamPath);
  const files = await walkFiles(base);
  if (files.length === 0) return null;

  const withStats = await Promise.all(
    files.map(async (file) => {
      const stat = await fs.stat(file);
      return { file, size: stat.size };
    })
  );

  withStats.sort((a, b) => b.size - a.size);
  const best = withStats.find((item) => item.size > 1024);
  return best?.file ?? null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Espera a que MediaMTX cierre el archivo: el tamaño deja de crecer. */
async function waitForStableRecording(streamPath: string) {
  let previousSize = -1;
  let stableHits = 0;
  let latest: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    latest = await findLargestRecording(streamPath);
    if (!latest) {
      await sleep(400);
      continue;
    }
    const { size } = await fs.stat(latest);
    if (size > 1024 && size === previousSize) {
      stableHits += 1;
      if (stableHits >= 2) return latest;
    } else {
      stableHits = 0;
      previousSize = size;
    }
    await sleep(400);
  }

  return findLargestRecording(streamPath);
}

const SUPABASE_SAFE_BYTES = 45 * 1024 * 1024;

function compressForStorage(input: string, output: string) {
  const inDir = path.dirname(path.resolve(input));
  const outDir = path.dirname(path.resolve(output));
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "run",
        "--rm",
        "-v",
        `${inDir}:/in`,
        "-v",
        `${outDir}:/out`,
        "jrottenberg/ffmpeg:6.1-alpine",
        "-y",
        "-i",
        `/in/${path.basename(input)}`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-b:v",
        "700k",
        "-maxrate",
        "900k",
        "-bufsize",
        "1400k",
        "-vf",
        "scale=1280:-2",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-movflags",
        "+faststart",
        `/out/${path.basename(output)}`,
      ],
      { stdio: "ignore" }
    );
    child.on("error", () => {
      reject(new Error("La grabación pesa más de lo que permite Supabase y no se pudo reducir."));
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("La grabación pesa más de lo que permite Supabase y no se pudo reducir."));
    });
  });
}

async function publishLocalRecording(filePath: string, eventId: string) {
  if (!supabaseConfig()) throw new Error(missingStorageMessage());
  const info = await fs.stat(filePath);
  let source = filePath;
  let temp: string | null = null;
  if (info.size > SUPABASE_SAFE_BYTES) {
    temp = path.join(path.dirname(filePath), `${eventId}-upload.mp4`);
    await compressForStorage(filePath, temp);
    source = temp;
  }
  try {
    return await uploadMp4FileToSupabase(`recordings/${eventId}.mp4`, source);
  } finally {
    if (temp) await fs.unlink(temp).catch(() => undefined);
  }
}

export async function startEventRecording(eventId: string) {
  if (recordingStartFailed.has(eventId)) return;

  if (!supabaseConfig()) {
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
  const current = uploadsInFlight.get(eventId);
  if (current) return current;

  const job = saveEventRecording(eventId).finally(() => {
    uploadsInFlight.delete(eventId);
  });
  uploadsInFlight.set(eventId, job);
  return job;
}

async function saveEventRecording(eventId: string) {
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
    const filePath = await waitForStableRecording(streamPath);

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
    return { url: recordingUrl, error: null };
  } catch (error) {
    console.error(error);
    return {
      url: null,
      error: error instanceof Error ? error.message : "No se pudo cerrar la grabación.",
    };
  }
}
