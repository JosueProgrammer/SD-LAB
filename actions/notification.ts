"use server";

import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";
import { revalidatePath } from "next/cache";

async function ensureEventRemindersForUser(userId: string) {
  const now = new Date();
  const in11 = new Date(now.getTime() + 11 * 60 * 1000);
  const in9 = new Date(now.getTime() + 9 * 60 * 1000);
  const in6 = new Date(now.getTime() + 6 * 60 * 1000);
  const in4 = new Date(now.getTime() + 4 * 60 * 1000);
  const in1 = new Date(now.getTime() + 1 * 60 * 1000);
  const past1 = new Date(now.getTime() - 1 * 60 * 1000);

  const windows = [
    {
      from: in9,
      to: in11,
      type: "EVENT_REMINDER_10",
      message: (title: string) => `El evento "${title}" comienza en 10 minutos.`,
    },
    {
      from: in4,
      to: in6,
      type: "EVENT_REMINDER_5",
      message: (title: string) => `El evento "${title}" comienza en 5 minutos.`,
    },
    {
      from: past1,
      to: in1,
      type: "EVENT_STARTING",
      message: (title: string) => `El evento "${title}" está por comenzar.`,
    },
  ] as const;

  for (const window of windows) {
    const events = await db.event.findMany({
      where: {
        status: { in: ["APPROVED", "LIVE"] },
        startTime: { gte: window.from, lte: window.to },
        participants: {
          some: {
            userId,
            status: { in: ["ACCEPTED", "PENDING"] },
          },
        },
      },
      select: { id: true, title: true },
    });

    for (const event of events) {
      const exists = await db.notification.findFirst({
        where: {
          userId,
          type: window.type,
          message: { contains: event.title },
          createdAt: { gte: new Date(now.getTime() - 30 * 60 * 1000) },
        },
      });
      if (exists) continue;

      await db.notification.create({
        data: {
          userId,
          type: window.type,
          message: window.message(event.title),
        },
      });
    }
  }
}

export async function getNotifications() {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  await ensureEventRemindersForUser(self.id);

  return db.notification.findMany({
    where: { userId: self.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationAsRead(notificationId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== self.id) {
    throw new Error("No encontrado o sin permisos");
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  revalidatePath("/");
}

export async function deleteAllNotifications() {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  await db.notification.deleteMany({
    where: { userId: self.id },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function createNotification(userId: string, message: string, type: string) {
  return db.notification.create({
    data: {
      userId,
      message,
      type,
    },
  });
}
