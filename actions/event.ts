"use server";

import { db } from "@/lib/db";
import { getSelf, requireRole } from "@/lib/auth-service";
import { EventStatus, EventType, InvitationStatus } from "@prisma/client";
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
  creatorId?: string;
}) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  if (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO") {
    throw new Error("No tienes permisos para crear eventos");
  }

  const isDirectApproval = self.role === "JEFE_DEPARTAMENTO" || self.role === "ADMIN";
  const creatorId = data.creatorId && isDirectApproval ? data.creatorId : self.id;

  const minStart = new Date(Date.now() + 10 * 60 * 1000);
  if (new Date(data.startTime) < minStart) {
    throw new Error("La hora de inicio debe tener al menos 10 minutos de anticipación.");
  }
  if (new Date(data.endTime) <= new Date(data.startTime)) {
    throw new Error("La hora de finalización debe ser posterior a la de inicio.");
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
      creatorId,
      status: isDirectApproval ? "APPROVED" : "PENDING",
      approverId: isDirectApproval ? self.id : null,
      participants: {
        create: data.guestIds.map((id) => ({
          userId: id,
          status: "PENDING",
        })),
      },
      resources: {
        create: data.resources,
      },
    },
  });

  const notifications: { userId: string; type: string; message: string }[] = [];

  if (!isDirectApproval) {
    const jefes = await db.user.findMany({ where: { role: "JEFE_DEPARTAMENTO" } });
    notifications.push(
      ...jefes.map((jefe) => ({
        userId: jefe.id,
        type: "EVENT_CREATED",
        message: `Nueva solicitud de evento "${event.title}" requiere revisión.`,
      }))
    );
    notifications.push({
      userId: self.id,
      type: "EVENT_CREATED",
      message: `Tu solicitud para el evento "${event.title}" ha sido registrada y está pendiente.`,
    });
  }

  if (data.guestIds.length > 0) {
    notifications.push(
      ...data.guestIds.map((userId) => ({
        userId,
        type: "INVITATION",
        message: `Has sido invitado al evento "${event.title}".`,
      }))
    );
  }

  if (notifications.length > 0) {
    await db.notification.createMany({ data: notifications });
  }

  revalidatePath(`/u/${self.username}/create-event`);
  revalidatePath(`/u/${self.username}/solicitudes`);
  return event;
}

export async function updateEvent(
  eventId: string,
  data: Partial<{
    title: string;
    type: EventType;
    description: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    location: string;
    thumbnailUrl: string | null;
    creatorId: string;
    status: EventStatus;
    guestIds: string[];
    resources: { category: string; name: string; quantity: number; details?: string }[];
  }>
) {
  const self = await requireRole("ADMIN", "JEFE_DEPARTAMENTO", "DOCENTE");
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Evento no encontrado");

  const canEdit =
    self.role === "ADMIN" ||
    self.role === "JEFE_DEPARTAMENTO" ||
    (self.role === "DOCENTE" && event.creatorId === self.id && event.status === "PENDING");

  if (!canEdit) throw new Error("No tienes permisos para modificar este evento");

  if (data.startTime) {
    const minStart = new Date(Date.now() + 10 * 60 * 1000);
    if (new Date(data.startTime) < minStart) {
      throw new Error("La hora de inicio debe tener al menos 10 minutos de anticipación.");
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.event.update({
      where: { id: eventId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl } : {}),
        ...(data.creatorId !== undefined && (self.role === "ADMIN" || self.role === "JEFE_DEPARTAMENTO")
          ? { creatorId: data.creatorId }
          : {}),
        ...(data.status !== undefined && (self.role === "ADMIN" || self.role === "JEFE_DEPARTAMENTO")
          ? { status: data.status }
          : {}),
      },
    });

    if (data.resources) {
      await tx.eventResource.deleteMany({ where: { eventId } });
      if (data.resources.length > 0) {
        await tx.eventResource.createMany({
          data: data.resources.map((resource) => ({
            eventId,
            category: resource.category,
            name: resource.name,
            quantity: resource.quantity,
            details: resource.details,
          })),
        });
      }
    }

    if (data.guestIds) {
      const uniqueGuestIds = Array.from(new Set(data.guestIds));
      const existing = await tx.eventParticipant.findMany({
        where: { eventId },
        select: { userId: true },
      });
      const existingIds = new Set(existing.map((item) => item.userId));
      const toAdd = uniqueGuestIds.filter((id) => !existingIds.has(id));
      const toRemove = existing
        .map((item) => item.userId)
        .filter((id) => !uniqueGuestIds.includes(id));

      if (toRemove.length > 0) {
        await tx.eventParticipant.deleteMany({
          where: { eventId, userId: { in: toRemove } },
        });
      }
      if (toAdd.length > 0) {
        await tx.eventParticipant.createMany({
          data: toAdd.map((userId) => ({
            eventId,
            userId,
            status: "PENDING",
          })),
        });
        await tx.notification.createMany({
          data: toAdd.map((userId) => ({
            userId,
            type: "INVITATION",
            message: `Has sido invitado al evento "${next.title}".`,
          })),
        });
      }
    }

    return next;
  });

  await db.notification.create({
    data: {
      userId: updated.creatorId,
      type: "EVENT_UPDATED",
      message: `El evento "${updated.title}" fue actualizado.`,
    },
  });

  revalidatePath(`/u/${self.username}/solicitudes`);
  revalidatePath(`/u/${self.username}/eventos`);
  revalidatePath(`/u/${self.username}/upcoming`);
  return updated;
}

/** Marca como rechazadas las invitaciones pendientes cuyo plazo (10 min antes) ya venció. */
export async function expirePendingInvitationsForUser(userId: string) {
  const deadline = new Date(Date.now() + 10 * 60 * 1000);
  await db.eventParticipant.updateMany({
    where: {
      userId,
      status: "PENDING",
      event: {
        startTime: { lte: deadline },
      },
    },
    data: { status: "REJECTED" },
  });
}

export async function approveEvent(eventId: string) {
  const self = await requireRole("JEFE_DEPARTAMENTO", "ADMIN");

  const event = await db.event.update({
    where: { id: eventId },
    data: {
      status: "APPROVED",
      approverId: self.id,
    },
    include: { participants: { select: { userId: true } } },
  });

  await db.notification.createMany({
    data: [
      {
        userId: event.creatorId,
        type: "REQUEST_STATUS",
        message: `Tu solicitud para "${event.title}" fue aprobada.`,
      },
      ...event.participants.map((p) => ({
        userId: p.userId,
        type: "EVENT_UPCOMING",
        message: `El evento "${event.title}" fue aprobado y está próximo.`,
      })),
    ],
  });

  revalidatePath(`/u/${self.username}/solicitudes`);
  return event;
}

export async function rejectEvent(eventId: string) {
  const self = await requireRole("JEFE_DEPARTAMENTO", "ADMIN");

  const event = await db.event.update({
    where: { id: eventId },
    data: {
      status: "REJECTED",
      approverId: self.id,
    },
  });

  await db.notification.create({
    data: {
      userId: event.creatorId,
      type: "REQUEST_STATUS",
      message: `Tu solicitud para "${event.title}" fue rechazada.`,
    },
  });

  revalidatePath(`/u/${self.username}/solicitudes`);
  return event;
}

export async function deleteEvent(eventId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Evento no encontrado");

  if (
    self.role !== "ADMIN" &&
    self.role !== "JEFE_DEPARTAMENTO" &&
    (self.role !== "DOCENTE" || event.creatorId !== self.id)
  ) {
    throw new Error("No tienes permisos para eliminar este evento");
  }

  const deletedEvent = await db.event.delete({ where: { id: eventId } });
  revalidatePath(`/u/${self.username}/solicitudes`);
  revalidatePath(`/u/${self.username}/upcoming`);
  return deletedEvent;
}

export async function respondInvitation(eventId: string, status: InvitationStatus) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");
  if (status !== "ACCEPTED" && status !== "REJECTED") {
    throw new Error("Estado de invitación inválido");
  }

  await expirePendingInvitationsForUser(self.id);

  const current = await db.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId: self.id } },
    include: { event: { select: { startTime: true, title: true } } },
  });
  if (!current) throw new Error("Invitación no encontrada");
  if (current.status !== "PENDING") {
    throw new Error("Esta invitación ya no está pendiente");
  }

  const responseDeadline = new Date(current.event.startTime.getTime() - 10 * 60 * 1000);
  if (new Date() > responseDeadline) {
    await db.eventParticipant.update({
      where: { eventId_userId: { eventId, userId: self.id } },
      data: { status: "REJECTED" },
    });
    throw new Error("El tiempo para responder venció. La invitación fue marcada como rechazada.");
  }

  const participant = await db.eventParticipant.update({
    where: {
      eventId_userId: {
        eventId,
        userId: self.id,
      },
    },
    data: { status },
    include: { event: { select: { title: true, creatorId: true } } },
  });

  await db.notification.create({
    data: {
      userId: participant.event.creatorId,
      type: "PARTICIPANT_RESPONSE",
      message: `${self.username} ${status === "ACCEPTED" ? "confirmó" : "rechazó"} la invitación a "${participant.event.title}".`,
    },
  });

  revalidatePath(`/u/${self.username}/asistencias`);
  revalidatePath(`/u/${self.username}/upcoming`);
  return participant;
}

export async function startEventLive(eventId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Evento no encontrado");

  if (event.creatorId !== self.id && self.role !== "ADMIN") {
    throw new Error("No tienes permisos para iniciar este evento");
  }

  if (event.status !== "APPROVED") {
    throw new Error("El evento no está aprobado para iniciar transmisión");
  }

  const updatedEvent = await db.event.update({
    where: { id: eventId },
    data: {
      status: "LIVE",
      isLive: true,
      actualStartTime: new Date(),
    },
  });

  const participants = await db.eventParticipant.findMany({
    where: { eventId },
    select: { userId: true },
  });

  if (participants.length > 0) {
    await db.notification.createMany({
      data: participants.map((p) => ({
        userId: p.userId,
        type: "EVENT_LIVE",
        message: `El evento "${event.title}" ha comenzado. ¡Conéctate ahora!`,
      })),
    });
  }

  revalidatePath(`/u/${self.username}/live`);
  revalidatePath(`/u/${self.username}/live/${eventId}`);
  return updatedEvent;
}

export async function endEventLive(eventId: string) {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Evento no encontrado");

  if (event.creatorId !== self.id && self.role !== "ADMIN") {
    throw new Error("No tienes permisos para finalizar este evento");
  }

  const updatedEvent = await db.event.update({
    where: { id: eventId },
    data: {
      status: "FINISHED",
      isLive: false,
      actualEndTime: new Date(),
    },
  });

  revalidatePath(`/u/${self.username}/live`);
  revalidatePath(`/u/${self.username}/live/${eventId}`);
  return updatedEvent;
}
