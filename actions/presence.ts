"use server";

import { getSelf } from "@/lib/auth-service";
import { isBlockedByUser } from "@/lib/block-service";
import { db } from "@/lib/db";

const PRESENCE_TTL_MS = 30_000;

export type PresenceDto = {
  userId: string;
  username: string;
  lastSeenAt: string;
};

export async function heartbeatPresence(roomKey: string): Promise<void> {
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

  await db.streamPresence.upsert({
    where: { roomKey_userId: { roomKey, userId: self.id } },
    create: {
      roomKey,
      userId: self.id,
      username: self.username,
      lastSeenAt: new Date(),
    },
    update: {
      username: self.username,
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
