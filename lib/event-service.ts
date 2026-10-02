import { InvitationStatus } from "@prisma/client";
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

export async function getLiveEventsForGuest(userId: string) {
  return db.event.findMany({
    where: {
      status: "LIVE",
      participants: {
        some: {
          userId,
          status: { in: ["ACCEPTED", "PENDING"] },
        },
      },
    },
    include: {
      creator: {
        select: { id: true, username: true, firstName: true, lastName: true, imageUrl: true, stream: true },
      },
      _count: { select: { participants: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getDepartmentLiveEvents() {
  return db.event.findMany({
    where: { status: "LIVE" },
    include: {
      creator: {
        select: { id: true, username: true, firstName: true, lastName: true, imageUrl: true, stream: true },
      },
      _count: { select: { participants: true } },
    },
    orderBy: { startTime: "asc" },
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
          firstName: true,
          lastName: true,
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

export async function getDepartmentAttendanceEvents(filters?: {
  from?: Date;
  to?: Date;
  type?: string;
  location?: string;
}) {
  return db.event.findMany({
    where: {
      ...(filters?.from || filters?.to
        ? {
            date: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters?.type ? { type: filters.type as never } : {}),
      ...(filters?.location ? { location: { contains: filters.location, mode: "insensitive" } } : {}),
    },
    include: {
      creator: { select: { id: true, username: true, firstName: true, lastName: true } },
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

export async function getUpcomingInvitedEvents(userId: string) {
  return db.event.findMany({
    where: {
      status: { notIn: ["FINISHED", "REJECTED"] },
      participants: { some: { userId } },
      startTime: { gte: new Date() },
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
      description: true,
      creator: { select: { username: true, firstName: true, lastName: true } },
      participants: {
        where: { userId },
        select: { status: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getGuestHomeData(userId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [upcoming, recentRecordings] = await Promise.all([
    getUpcomingInvitedEvents(userId),
    db.event.findMany({
      where: {
        status: "FINISHED",
        recordingUrl: { not: null },
        actualEndTime: { gte: weekAgo },
        participants: { some: { userId, status: "ACCEPTED" } },
      },
      select: { id: true, title: true, type: true, date: true, thumbnailUrl: true, recordingUrl: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  return { upcoming, recentRecordings };
}

export async function getGuestInvitations(userId: string, status?: InvitationStatus) {
  return db.eventParticipant.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          date: true,
          startTime: true,
          endTime: true,
          location: true,
          status: true,
          creator: { select: { username: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGuestCertificates(userId: string) {
  return db.eventParticipant.findMany({
    where: { userId, certificateIssuedAt: { not: null } },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          type: true,
          creator: { select: { firstName: true, lastName: true, username: true } },
        },
      },
      user: {
        select: { firstName: true, lastName: true, username: true, studentId: true },
      },
    },
    orderBy: { certificateIssuedAt: "desc" },
  });
}

export async function getRepositoryRecordings(creatorId: string) {
  return db.event.findMany({
    where: { creatorId, status: "FINISHED", recordingUrl: { not: null } },
    select: { id: true, title: true, type: true, date: true, thumbnailUrl: true, recordingUrl: true },
    orderBy: { date: "desc" },
  });
}

export async function getGuestRepositoryRecordings(userId: string, from?: Date, to?: Date) {
  return db.event.findMany({
    where: {
      status: "FINISHED",
      recordingUrl: { not: null },
      participants: { some: { userId, status: "ACCEPTED" } },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    select: { id: true, title: true, type: true, date: true, thumbnailUrl: true, recordingUrl: true },
    orderBy: { date: "desc" },
  });
}

export async function getRepositoryRecording(eventId: string, creatorId: string) {
  return db.event.findFirst({ where: { id: eventId, creatorId, status: "FINISHED", recordingUrl: { not: null } } });
}

export async function getGuestRepositoryRecording(eventId: string, userId: string) {
  return db.event.findFirst({
    where: {
      id: eventId,
      status: "FINISHED",
      recordingUrl: { not: null },
      participants: { some: { userId, status: "ACCEPTED" } },
    },
  });
}

export async function getPendingEventRequests() {
  return db.event.findMany({
    where: { status: "PENDING" },
    include: {
      creator: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
      resources: true,
      participants: {
        include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } },
      },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDepartmentEvents() {
  return db.event.findMany({
    include: {
      creator: { select: { id: true, username: true, firstName: true, lastName: true } },
      resources: true,
      _count: { select: { participants: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });
}

export async function getCalendarEvents(_scope: "department" | "all" = "all") {
  return db.event.findMany({
    where: {
      status: { notIn: ["REJECTED"] },
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
      creator: { select: { username: true, firstName: true, lastName: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getAdminDashboardStats() {
  const [totalUsers, jefes, docentes, invitados, events] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "JEFE_DEPARTAMENTO" } }),
    db.user.count({ where: { role: "DOCENTE" } }),
    db.user.count({ where: { role: "INVITADO" } }),
    db.event.count(),
  ]);
  return { totalUsers, jefes, docentes, invitados, events };
}

export async function getPlatformStatistics(from: Date) {
  const [users, events, participants] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: from } } }),
    db.event.count({ where: { createdAt: { gte: from } } }),
    db.eventParticipant.count({ where: { createdAt: { gte: from } } }),
  ]);
  return { users, events, participants };
}
