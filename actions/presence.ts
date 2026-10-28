"use server";

import { getSelf } from "@/lib/auth-service";
import { isBlockedByUser } from "@/lib/block-service";
import { db } from "@/lib/db";

const PRESENCE_TTL_MS = 30_000;

export type PresenceDto = {
  userId: string;
  username: string;
  lastSeenAt: string;
  latencySec: number | null;
};

export type HeartbeatPayload = {
  latencySec?: number | null;
};

export async function heartbeatPresence(
  roomKey: string,
  payload?: HeartbeatPayload
): Promise<void> {
  let self;
  try {
    self = await getSelf();
  } catch {
    return;
  }

  const hostId = roomKey.startsWith("event:") ? null : roomKey;
  if (hostId) {
    const blocked = await isBlockedByUser(hostId);
    if (blocked) return;
  }

  const latencySec =
    typeof payload?.latencySec === "number" && Number.isFinite(payload.latencySec)
      ? Math.max(0, Math.min(payload.latencySec, 600))
      : null;

  await db.streamPresence.upsert({
    where: { roomKey_userId: { roomKey, userId: self.id } },
    create: {
      roomKey,
      userId: self.id,
      username: self.username,
      latencySec,
      lastSeenAt: new Date(),
    },
    update: {
      username: self.username,
      ...(latencySec !== null ? { latencySec } : {}),
      lastSeenAt: new Date(),
    },
  });
}

export async function listPresence(roomKey: string, excludeUserId?: string): Promise<PresenceDto[]> {
  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
  await db.streamPresence.deleteMany({
    where: { roomKey, lastSeenAt: { lt: cutoff } },
  });

  const rows = await db.streamPresence.findMany({
    where: {
      roomKey,
      lastSeenAt: { gte: cutoff },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    orderBy: { username: "asc" },
  });

  return rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    lastSeenAt: row.lastSeenAt.toISOString(),
    latencySec: row.latencySec,
  }));
}

export async function leavePresence(roomKey: string): Promise<void> {
  try {
    const self = await getSelf();
    await db.streamPresence.deleteMany({
      where: { roomKey, userId: self.id },
    });
  } catch {
    // sin sesión
  }
}

export async function averageLatencyForRoom(roomKey: string): Promise<number | null> {
  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
  const rows = await db.streamPresence.findMany({
    where: {
      roomKey,
      lastSeenAt: { gte: cutoff },
      latencySec: { not: null },
    },
    select: { latencySec: true },
  });
  const values = rows
    .map((r) => r.latencySec)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
