"use server";

import { getSelf } from "@/lib/auth-service";
import { isBlockedByUser } from "@/lib/block-service";
import { db } from "@/lib/db";

export type ChatMessageDto = {
  id: string;
  roomKey: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
};

export async function sendChatMessage(roomKey: string, body: string): Promise<ChatMessageDto> {
  const self = await getSelf();
  const text = body.trim().slice(0, 500);
  if (!text) throw new Error("Mensaje vacío");

  const hostId = roomKey.startsWith("event:") ? null : roomKey;
  if (hostId) {
    const blocked = await isBlockedByUser(hostId);
    if (blocked) throw new Error("No puedes enviar mensajes en esta sala");
  }

  const message = await db.chatMessage.create({
    data: {
      roomKey,
      userId: self.id,
      username: self.username,
      body: text,
    },
  });

  return {
    id: message.id,
    roomKey: message.roomKey,
    userId: message.userId,
    username: message.username,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function listChatMessages(roomKey: string, limit = 80): Promise<ChatMessageDto[]> {
  const messages = await db.chatMessage.findMany({
    where: { roomKey },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });

  return messages.map((message) => ({
    id: message.id,
    roomKey: message.roomKey,
    userId: message.userId,
    username: message.username,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  }));
}
