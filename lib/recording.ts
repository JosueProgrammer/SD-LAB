import { UTApi, UTFile } from "uploadthing/server";
import {
  EgressClient,
  EncodedFileType,
  EncodingOptionsPreset,
  type EgressInfo,
  type EncodedFileOutput,
} from "livekit-server-sdk";
import { EgressStatus } from "livekit-server-sdk/dist/proto/livekit_egress";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const livekitHost = (process.env.LIVEKIT_API_URL || "")
  .replace(/^wss:/i, "https:")
  .replace(/^ws:/i, "http:");

const egressClient = new EgressClient(
  livekitHost,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

const recordingStartFailed = new Set<string>();
const recordingStartError = new Map<string, string>();

function supabaseConfig() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
  const secret = process.env.SUPABASE_S3_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "recordings";
  const region = process.env.SUPABASE_S3_REGION;
  if (!projectUrl || !accessKey || !secret || !region) return null;

  const projectRef = projectUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  const endpoint =
    process.env.SUPABASE_S3_ENDPOINT ||
    (projectRef
      ? `https://${projectRef}.storage.supabase.co/storage/v1/s3`
      : `${projectUrl}/storage/v1/s3`);

  return { projectUrl, accessKey, secret, bucket, region, endpoint };
}

function hasUploadThing() {
  return Boolean(process.env.UPLOADTHING_TOKEN);
}

function livekitFileOutput(eventId: string): EncodedFileOutput | null {
  const filepath = `recordings/${eventId}-${Date.now()}.mp4`;
  const base = { fileType: EncodedFileType.MP4, filepath, disableManifest: true };

  const supabase = supabaseConfig();
  if (supabase) {
    return {
      ...base,
      s3: {
        accessKey: supabase.accessKey,
        secret: supabase.secret,
        region: supabase.region,
        bucket: supabase.bucket,
        endpoint: supabase.endpoint,
        forcePathStyle: true,
      },
    };
  }

  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;
  const container = process.env.AZURE_STORAGE_CONTAINER;
  if (account && accountKey && container && hasUploadThing()) {
    return { ...base, azure: { accountName: account, accountKey, containerName: container } };
  }

  const accessKey = process.env.S3_ACCESS_KEY;
  const secret = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  if (accessKey && secret && bucket && hasUploadThing()) {
    return {
      ...base,
      s3: {
        accessKey,
        secret,
        region: process.env.S3_REGION || "us-east-1",
        bucket,
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      },
    };
  }

  return null;
}

function supabasePublicUrl(objectPath: string) {
  const supabase = supabaseConfig();
  if (!supabase) return null;
  const clean = objectPath.replace(/^\/+/, "");
  return `${supabase.projectUrl}/storage/v1/object/public/${supabase.bucket}/${clean}`;
}

function resolveSupabasePlaybackUrl(filename?: string, location?: string) {
  const supabase = supabaseConfig();
  if (!supabase) return null;

  if (filename?.startsWith("recordings/")) {
    return supabasePublicUrl(filename);
  }

  if (!location) return null;
  if (location.includes("/storage/v1/object/public/")) return location;

  try {
    const url = new URL(location);
    const marker = `/${supabase.bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index >= 0) {
      return supabasePublicUrl(decodeURIComponent(url.pathname.slice(index + marker.length)));
    }
  } catch {
    /* ignore */
  }

  return null;
}

function isUploadThingUrl(url: string) {
  return /utfs\.io|ufs\.sh|uploadthing\.com/i.test(url);
}

async function copyToUploadThing(sourceUrl: string, fileName: string) {
  if (!hasUploadThing()) return null;
  const utapi = new UTApi();
  const result = await utapi.uploadFilesFromUrl({
    url: sourceUrl,
    name: fileName.endsWith(".mp4") ? fileName : `${fileName}.mp4`,
  });
  if (result.error || !result.data) {
    console.error("UploadThing rechazó la grabación", result.error);
    return null;
  }
  return result.data.ufsUrl || result.data.url || null;
}

async function downloadAndUploadToUploadThing(sourceUrl: string, fileName: string) {
  if (!hasUploadThing()) return null;
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la grabación temporal (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const name = fileName.endsWith(".mp4") ? fileName : `${fileName}.mp4`;
  const file = new UTFile([bytes], name, { type: "video/mp4" });
  const utapi = new UTApi();
  const result = await utapi.uploadFiles(file);
  if (result.error || !result.data) {
    console.error("UploadThing rechazó la grabación", result.error);
    return null;
  }
  return result.data.ufsUrl || result.data.url || null;
}

async function publishRecordingUrl(filename?: string, location?: string) {
  const supabaseUrl = resolveSupabasePlaybackUrl(filename, location);
  if (supabaseUrl) return supabaseUrl;

  if (!location?.startsWith("http")) return null;
  if (isUploadThingUrl(location)) return location;

  const name = filename?.split("/").pop() || `recording-${Date.now()}.mp4`;
  try {
    return (await copyToUploadThing(location, name)) || (await downloadAndUploadToUploadThing(location, name));
  } catch (error) {
    console.error("No se pudo publicar la grabación", error);
    return null;
  }
}

function missingStorageMessage() {
  if (!supabaseConfig() && !hasUploadThing()) {
    return "Configura Supabase Storage (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY, SUPABASE_S3_REGION, SUPABASE_STORAGE_BUCKET) para guardar la grabación.";
  }
  return "LiveKit necesita Supabase Storage (recomendado) o Azure/S3 como destino de la grabación.";
}

export async function startEventRecording(eventId: string) {
  if (recordingStartFailed.has(eventId)) return;

  const file = livekitFileOutput(eventId);
  if (!file) {
    recordingStartError.set(eventId, missingStorageMessage());
    return;
  }

  const claim = await db.event.updateMany({
    where: {
      id: eventId,
      egressId: null,
      recordingUrl: null,
      recordingEnabled: false,
      status: { in: ["APPROVED", "LIVE"] },
    },
    data: { recordingEnabled: true },
  });
  if (claim.count !== 1) return;

  const event = await db.event.findUnique({ where: { id: eventId }, select: { creatorId: true } });
  if (!event) return;

  try {
    const info = await egressClient.startParticipantEgress(
      event.creatorId,
      event.creatorId,
      { file },
      { screenShare: false, encodingOptions: EncodingOptionsPreset.H264_720P_30 }
    );
    if (!info.egressId) throw new Error("LiveKit no devolvió un identificador de grabación");
    recordingStartError.delete(eventId);
    await db.event.update({ where: { id: eventId }, data: { egressId: info.egressId } });
  } catch (error) {
    await db.event.update({ where: { id: eventId }, data: { recordingEnabled: false } });
    const message = error instanceof Error ? error.message : "";
    if (/output|upload|storage|bucket|azure|s3|gcp|credentials|permission|denied/i.test(message)) {
      recordingStartFailed.add(eventId);
      recordingStartError.set(eventId, message || "LiveKit rechazó el almacenamiento de la grabación.");
    }
    console.error("No se pudo iniciar la grabación", error);
  }
}

export function allowRecordingRetry(eventId: string) {
  recordingStartFailed.delete(eventId);
  recordingStartError.delete(eventId);
}

export async function attachRecordingFile(egressId: string, info: EgressInfo) {
  const event = await db.event.findFirst({
    where: { egressId },
    include: { creator: { select: { username: true } } },
  });
  if (!event) return null;
  if (event.recordingUrl) return event.recordingUrl;

  const file = info.fileResults?.find((item) => item.location || item.filename) ?? info.file;
  if (!file?.location && !file?.filename) return null;

  const recordingUrl = await publishRecordingUrl(file?.filename, file?.location);
  if (!recordingUrl) return null;

  await db.event.update({
    where: { id: event.id },
    data: { recordingUrl, recordingEnabled: true },
  });
  revalidatePath(`/u/${event.creator.username}/repository`);
  revalidatePath(`/u/${event.creator.username}/repository/${event.id}`);
  return recordingUrl;
}

export async function finalizeEventRecording(eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return { url: null as string | null, error: null as string | null };
  if (event.recordingUrl) return { url: event.recordingUrl, error: null };
  if (!event.egressId) {
    const startError = recordingStartError.get(eventId);
    let error = missingStorageMessage();
    if (startError) error = `No se pudo iniciar la grabación: ${startError}`;
    else if (livekitFileOutput(eventId)) {
      error =
        "La transmisión terminó antes de que comenzara la grabación. Conecta OBS y espera a que figure como conectado.";
    }
    return { url: null, error };
  }

  try {
    let info: EgressInfo | undefined;
    try {
      info = await egressClient.stopEgress(event.egressId);
    } catch {
      const listed = await egressClient.listEgress({ egressId: event.egressId });
      info = listed[0];
    }

    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (!info) break;
      const done =
        info.status === EgressStatus.EGRESS_COMPLETE ||
        info.status === EgressStatus.EGRESS_FAILED ||
        info.status === EgressStatus.EGRESS_ABORTED ||
        info.status === EgressStatus.EGRESS_LIMIT_REACHED;
      if (done) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const listed = await egressClient.listEgress({ egressId: event.egressId });
      if (listed[0]) info = listed[0];
    }

    if (!info) return { url: null, error: "No se pudo obtener la grabación." };
    if (
      info.status === EgressStatus.EGRESS_FAILED ||
      info.status === EgressStatus.EGRESS_ABORTED ||
      info.status === EgressStatus.EGRESS_LIMIT_REACHED
    ) {
      return { url: null, error: info.error || "LiveKit no pudo guardar la grabación." };
    }

    if (info.status !== EgressStatus.EGRESS_COMPLETE) {
      return { url: null, error: null };
    }

    const url = await attachRecordingFile(event.egressId, info);
    return {
      url,
      error: url ? null : "La grabación terminó, pero no se pudo publicar el archivo.",
    };
  } catch (error) {
    console.error(error);
    return {
      url: null,
      error: error instanceof Error ? error.message : "No se pudo cerrar la grabación.",
    };
  }
}
