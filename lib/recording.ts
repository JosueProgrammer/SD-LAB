import { randomUUID } from "crypto";
import { UTApi } from "uploadthing/server";
import { getStorage } from "firebase-admin/storage";
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
import { firebaseAdminApp } from "@/lib/firebase-admin";

const egressClient = new EgressClient(
  process.env.LIVEKIT_API_URL!,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

const recordingStartFailed = new Set<string>();
const recordingStartError = new Map<string, string>();

function firebaseConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.replace(/^gs:\/\//, "");
  if (!projectId || !clientEmail || !privateKey || !bucket) return null;
  return {
    bucket,
    credentials: JSON.stringify({
      type: "service_account",
      project_id: projectId,
      private_key: privateKey,
      client_email: clientEmail,
      token_uri: "https://oauth2.googleapis.com/token",
    }),
  };
}

function fileOutput(eventId: string): EncodedFileOutput | null {
  const filepath = `recordings/${eventId}-${Date.now()}.mp4`;
  const base = { fileType: EncodedFileType.MP4, filepath, disableManifest: true };

  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;
  const container = process.env.AZURE_STORAGE_CONTAINER;
  if (account && accountKey && container) {
    return { ...base, azure: { accountName: account, accountKey, containerName: container } };
  }

  const accessKey = process.env.S3_ACCESS_KEY;
  const secret = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  if (accessKey && secret && bucket) {
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

  const firebase = firebaseConfig();
  if (!firebase) return null;
  return { ...base, gcp: { bucket: firebase.bucket, credentials: firebase.credentials } };
}

function isPlayableUrl(url: string) {
  const publicBase = process.env.S3_PUBLIC_URL;
  const bucket = process.env.S3_BUCKET;
  if (url.includes("blob.core.windows.net")) return true;
  if (url.includes("utfs.io") || url.includes("ufs.sh") || url.includes("uploadthing.com")) return true;
  if (url.includes("firebasestorage.googleapis.com") && url.includes("token=")) return true;
  if (publicBase && url.startsWith(publicBase)) return true;
  if (bucket && url.includes(`/${bucket}/`) && url.startsWith("http")) return true;
  return false;
}

function objectPathFromFile(filename?: string, location?: string) {
  if (filename?.startsWith("recordings/")) return filename;
  const value = location || "";
  const gs = value.match(/^gs:\/\/[^/]+\/(.+)$/);
  if (gs?.[1]) return decodeURIComponent(gs[1]);
  const gcs = value.match(/storage\.googleapis\.com\/[^/]+\/([^?]+)/);
  if (gcs?.[1]) return decodeURIComponent(gcs[1]);
  const firebase = value.match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
  if (firebase?.[1]) return decodeURIComponent(firebase[1]);
  return null;
}

async function firebasePlaybackUrl(objectPath: string) {
  const config = firebaseConfig();
  if (!config) return null;
  const token = randomUUID();
  const file = getStorage(firebaseAdminApp()).bucket(config.bucket).file(objectPath);
  await file.setMetadata({
    contentType: "video/mp4",
    metadata: { firebaseStorageDownloadTokens: token },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${config.bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

async function copyToUploadThing(sourceUrl: string) {
  if (!process.env.UPLOADTHING_TOKEN) return null;
  const utapi = new UTApi();
  const result = await utapi.uploadFilesFromUrl(sourceUrl);
  if (!result || !("data" in result) || !result.data) return null;
  const data = result.data as { ufsUrl?: string; url?: string };
  return data.ufsUrl || data.url || null;
}

async function publishRecordingUrl(filename?: string, location?: string) {
  if (location && isPlayableUrl(location)) return location;

  const objectPath = objectPathFromFile(filename, location);
  if (objectPath && firebaseConfig()) {
    return firebasePlaybackUrl(objectPath);
  }

  if (location?.startsWith("http")) {
    return (await copyToUploadThing(location)) || location;
  }

  return null;
}

export async function startEventRecording(eventId: string) {
  if (recordingStartFailed.has(eventId)) return;

  const file = fileOutput(eventId);
  if (!file) return;

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
  if (!file) return null;

  const recordingUrl = await publishRecordingUrl(file.filename, file.location);
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
    let error = "No se guardó la grabación. Hace falta el bucket de Firebase o un almacenamiento Azure/S3 para subir el video.";
    if (startError) error = `No se pudo iniciar la grabación: ${startError}`;
    else if (fileOutput(eventId)) {
      error = "La transmisión terminó antes de que comenzara la grabación. Conecta OBS y espera a que figure como conectado.";
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
