"use server";

import { revalidatePath } from "next/cache";
import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";
import { createStreamCredentials, isPathPublishing } from "@/lib/mediamtx";
import { isObsStreaming } from "@/lib/obs-websocket";
import { allowRecordingRetry, startEventRecording } from "@/lib/recording";

export type ObsLinkStatus = "CONNECTED" | "BUFFERING" | "DISCONNECTED";

export type ObsLink = {
  serverUrl: string | null;
  streamKey: string | null;
  playbackUrl: string | null;
  status: ObsLinkStatus;
  connected: boolean;
};

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
  const { self } = await ownedEvent(eventId);
  const creds = createStreamCredentials("evt");

  await db.event.updateMany({
    where: { creatorId: self.id, NOT: { id: eventId } },
    data: {
      streamPath: null,
      serverUrl: null,
      streamKey: null,
      playbackUrl: null,
      obsConnected: false,
    },
  });

  await db.event.update({
    where: { id: eventId },
    data: {
      streamPath: creds.streamPath,
      serverUrl: creds.serverUrl,
      streamKey: creds.streamKey,
      playbackUrl: creds.playbackUrl,
      obsConnected: false,
    },
  });

  revalidatePath(`/u/${self.username}/live`);
  return {
    serverUrl: creds.serverUrl,
    streamKey: creds.streamKey,
    playbackUrl: creds.playbackUrl,
    status: "DISCONNECTED",
    connected: false,
  };
}

export async function syncEventObsStatus(eventId: string): Promise<ObsLink> {
  const { event } = await ownedEvent(eventId);
  if (!event.streamPath) {
    return {
      serverUrl: null,
      streamKey: null,
      playbackUrl: null,
      status: "DISCONNECTED",
      connected: false,
    };
  }

  let status: ObsLinkStatus = event.obsConnected ? "CONNECTED" : "DISCONNECTED";

  try {
    const publishing = await isPathPublishing(event.streamPath);
    if (publishing) {
      status = "CONNECTED";
    } else {
      const obs = await isObsStreaming();
      if (obs === true) status = "BUFFERING";
      else status = "DISCONNECTED";
    }
  } catch {
    status = event.obsConnected ? "CONNECTED" : "DISCONNECTED";
  }

  const connected = status === "CONNECTED";
  if (event.obsConnected !== connected) {
    await db.event.update({ where: { id: eventId }, data: { obsConnected: connected } });
  }
  if (connected && !event.egressId && !event.recordingUrl) {
    await startEventRecording(eventId);
  }
  if (!connected) await allowRecordingRetry(eventId);

  return {
    serverUrl: event.serverUrl,
    streamKey: event.streamKey,
    playbackUrl: event.playbackUrl,
    status,
    connected,
  };
}
