"use server";

import {
  IngressAudioEncodingPreset,
  IngressClient,
  IngressInput,
  IngressVideoEncodingPreset,
  type IngressInfo,
} from "livekit-server-sdk";
import { IngressState_Status } from "livekit-server-sdk/dist/proto/livekit_ingress";
import { TrackSource } from "livekit-server-sdk/dist/proto/livekit_models";
import { revalidatePath } from "next/cache";
import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";

const ingressClient = new IngressClient(process.env.LIVEKIT_API_URL!);

export type ObsLinkStatus = "CONNECTED" | "BUFFERING" | "DISCONNECTED";

export type ObsLink = {
  serverUrl: string | null;
  streamKey: string | null;
  status: ObsLinkStatus;
  connected: boolean;
};

function statusOf(ingress?: IngressInfo): ObsLinkStatus {
  if (ingress?.state?.status === IngressState_Status.ENDPOINT_PUBLISHING) return "CONNECTED";
  if (ingress?.state?.status === IngressState_Status.ENDPOINT_BUFFERING) return "BUFFERING";
  return "DISCONNECTED";
}

async function ownedEvent(eventId: string) {
  const self = await getSelf();
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Evento no encontrado");
  if (event.creatorId !== self.id && self.role !== "ADMIN") {
    throw new Error("No tienes permisos para transmitir este evento");
  }
  if (event.status !== "APPROVED" && event.status !== "LIVE") {
    throw new Error("El evento debe estar aprobado para transmitir con OBS");
  }
  return { self, event };
}

export async function createEventObsIngress(eventId: string): Promise<ObsLink> {
  const { self, event } = await ownedEvent(eventId);

  const existing = await ingressClient.listIngress({ roomName: self.id });
  for (const item of existing) {
    if (item.ingressId) await ingressClient.deleteIngress(item.ingressId);
  }

  const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
    name: event.title,
    roomName: self.id,
    participantIdentity: self.id,
    participantName: self.username,
    video: {
      source: TrackSource.CAMERA,
      preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
    },
    audio: {
      source: TrackSource.MICROPHONE,
      preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
    },
  });

  if (!ingress.ingressId || !ingress.url || !ingress.streamKey) {
    throw new Error("No se pudo generar la clave de OBS");
  }

  await db.event.updateMany({
    where: { creatorId: self.id, NOT: { id: eventId } },
    data: { ingressId: null, serverUrl: null, streamKey: null, obsConnected: false },
  });

  await db.event.update({
    where: { id: eventId },
    data: {
      ingressId: ingress.ingressId,
      serverUrl: ingress.url,
      streamKey: ingress.streamKey,
      obsConnected: false,
    },
  });

  revalidatePath(`/u/${self.username}/live`);
  return { serverUrl: ingress.url, streamKey: ingress.streamKey, status: "DISCONNECTED", connected: false };
}

export async function syncEventObsStatus(eventId: string): Promise<ObsLink> {
  const { event } = await ownedEvent(eventId);
  if (!event.ingressId) {
    return { serverUrl: null, streamKey: null, status: "DISCONNECTED", connected: false };
  }

  let status: ObsLinkStatus = event.obsConnected ? "CONNECTED" : "DISCONNECTED";
  try {
    const items = await ingressClient.listIngress({ ingressId: event.ingressId });
    status = statusOf(items[0]);
  } catch {
    status = event.obsConnected ? "CONNECTED" : "DISCONNECTED";
  }

  const connected = status === "CONNECTED";
  if (event.obsConnected !== connected) {
    await db.event.update({ where: { id: eventId }, data: { obsConnected: connected } });
  }

  return {
    serverUrl: event.serverUrl,
    streamKey: event.streamKey,
    status,
    connected,
  };
}
