import { db } from "@/lib/db";

/**
 * Devuelve los eventos APPROVED del docente autenticado,
 * ordenados por fecha ascendente. Usado en la vista previa del módulo En vivo.
 */
export async function getApprovedEventsByCreator(creatorId: string) {
  return db.event.findMany({
    where: {
      creatorId,
      status: { in: ["APPROVED", "LIVE"] },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              imageUrl: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { date: "asc" },
  });
}

/**
 * Devuelve un evento por ID incluyendo participantes, recursos y el creador.
 */
export async function getEventById(eventId: string) {
  return db.event.findUnique({
    where: { id: eventId },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          imageUrl: true,
          stream: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              imageUrl: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      resources: true,
      _count: {
        select: { participants: true },
      },
    },
  });
}

/** Eventos del docente para el módulo de gestión de participantes. */
export async function getParticipantManagementEvents(creatorId: string) {
  return db.event.findMany({
    where: { creatorId },
    include: {
      participants: {
        where: { status: "ACCEPTED" },
        include: {
          user: {
            select: {
              id: true, username: true, imageUrl: true, firstName: true,
              lastName: true, career: true, email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { date: "desc" },
  });
}

/** Eventos e invitaciones (sin excluir estados) para el módulo de asistencia. */
export async function getAttendanceEvents(creatorId: string) {
  return db.event.findMany({
    where: { creatorId },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { date: "desc" },
  });
}

/** Actividades aún no finalizadas, ordenadas para la planificación del docente. */
export async function getUpcomingEvents(creatorId: string) {
  return db.event.findMany({
    where: {
      creatorId,
      status: { notIn: ["FINISHED", "REJECTED"] },
    },
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      status: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getRepositoryRecordings(creatorId: string) {
  return db.event.findMany({
    where: { creatorId, status: "FINISHED", recordingUrl: { not: null } },
    select: { id: true, title: true, type: true, date: true, thumbnailUrl: true, recordingUrl: true },
    orderBy: { date: "desc" },
  });
}

export async function getRepositoryRecording(eventId: string, creatorId: string) {
  return db.event.findFirst({ where: { id: eventId, creatorId, status: "FINISHED", recordingUrl: { not: null } } });
}
