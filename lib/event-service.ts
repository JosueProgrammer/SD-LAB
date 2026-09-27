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
