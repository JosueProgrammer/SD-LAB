"use server";

import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";
import { EventType, InvitationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createEvent(data: {
  title: string;
  type: EventType;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location: string;
  thumbnailUrl?: string | null;
  guestIds: string[];
  resources: { category: string; name: string; quantity: number; details?: string }[];
}) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  if (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO") {
      throw new Error("No tienes permisos para crear eventos");
  }

  const event = await db.event.create({
      data: {
      title: data.title,
      type: data.type,
      description: data.description,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      thumbnailUrl: data.thumbnailUrl,
      creatorId: self.id,
      status: "PENDING",
      participants: {
          create: data.guestIds.map((id) => ({
          userId: id,
          status: "PENDING"
          }))
      },
      resources: {
          create: data.resources
      }
      }
  });

  // Notificar al docente sobre la creación del evento
  const jefes = await db.user.findMany({ where: { role: "JEFE_DEPARTAMENTO" }});
  
  const notifications = jefes.map(jefe => ({
    userId: jefe.id,
    type: "EVENT_CREATED",
    message: `Nueva solicitud de evento "${event.title}" requiere revisión.`
  }));

  notifications.push({
    userId: self.id,
    type: "EVENT_CREATED",
    message: `Tu solicitud para el evento "${event.title}" ha sido registrada y está PENDING.`,
  });

  await db.notification.createMany({
    data: notifications
  });

  revalidatePath(`/u/${self.username}/create-event`);
  return event;
}

export async function approveEvent(eventId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  if (self.role !== "JEFE_DEPARTAMENTO" && self.role !== "ADMIN") {
    throw new Error("No tienes permisos para aprobar eventos");
  }

  const event = await db.event.update({
    where: { id: eventId },
    data: { 
      status: "APPROVED",
      approverId: self.id
    }
  });

  revalidatePath(`/`); // TODO: update with exact path
  return event;
}

export async function rejectEvent(eventId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  if (self.role !== "JEFE_DEPARTAMENTO" && self.role !== "ADMIN") {
    throw new Error("No tienes permisos para rechazar eventos");
  }

  const event = await db.event.update({
    where: { id: eventId },
    data: { 
      status: "REJECTED",
      approverId: self.id
    }
  });

  revalidatePath(`/`);
  return event;
}

export async function deleteEvent(eventId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const event = await db.event.findUnique({ where: { id: eventId }});
  if (!event) throw new Error("Evento no encontrado");

  // Admin puede eliminar cualquiera, Docente solo los suyos, Jefe de Depto no especificaba eliminar pero Admin sí.
  if (self.role !== "ADMIN" && (self.role !== "DOCENTE" || event.creatorId !== self.id)) {
    throw new Error("No tienes permisos para eliminar este evento");
  }

  const deletedEvent = await db.event.delete({ where: { id: eventId }});
  revalidatePath(`/`);
  return deletedEvent;
}

export async function respondInvitation(eventId: string, status: InvitationStatus) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const participant = await db.eventParticipant.update({
    where: {
      eventId_userId: {
        eventId,
        userId: self.id
      }
    },
    data: { status }
  });

  revalidatePath(`/events/${eventId}`);
  return participant;
}
