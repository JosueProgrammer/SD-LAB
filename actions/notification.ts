"use server";

import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const notifications = await db.notification.findMany({
    where: { userId: self.id },
    orderBy: { createdAt: "desc" },
  });

  return notifications;
}

export async function markNotificationAsRead(notificationId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const notification = await db.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification || notification.userId !== self.id) {
    throw new Error("No encontrado o sin permisos");
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { read: true }
  });

  revalidatePath("/");
}

// Función auxiliar para ser usada internamente por otras acciones (no exportada para uso del cliente si no es necesario)
export async function createNotification(userId: string, message: string, type: string) {
  return await db.notification.create({
    data: {
      userId,
      message,
      type
    }
  });
}
