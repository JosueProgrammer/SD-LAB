"use server";

import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";
import { revalidatePath } from "next/cache";

async function managedParticipant(participantId: string) {
  const self = await getSelf();
  const participant = await db.eventParticipant.findUnique({
    where: { id: participantId },
    include: { event: true },
  });
  if (!participant) throw new Error("Participante no encontrado");
  if (self.role !== "ADMIN" && participant.event.creatorId !== self.id) {
    throw new Error("No tienes permisos para gestionar este participante");
  }
  return { self, participant };
}

async function managedEvent(eventId: string) {
  const self = await getSelf();
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Evento no encontrado");
  if (self.role !== "ADMIN" && event.creatorId !== self.id) throw new Error("No tienes permisos para gestionar este evento");
  return { self, event };
}

function revalidateParticipantViews(username: string) {
  revalidatePath(`/u/${username}/participants`);
  revalidatePath(`/u/${username}/attendance`);
}

export async function setParticipantAttendance(participantId: string, attended: boolean) {
  const { self, participant } = await managedParticipant(participantId);
  if (participant.status !== "ACCEPTED") throw new Error("El participante no confirmó la invitación");
  const updated = await db.eventParticipant.update({ where: { id: participantId }, data: { attended } });
  revalidateParticipantViews(self.username);
  return updated;
}

export async function removeEventParticipant(participantId: string) {
  const { self } = await managedParticipant(participantId);
  await db.eventParticipant.delete({ where: { id: participantId } });
  revalidateParticipantViews(self.username);
}

export async function issueCertificate(participantId: string) {
  const { self, participant } = await managedParticipant(participantId);
  if (participant.event.status !== "FINISHED") throw new Error("El certificado solo está disponible al finalizar el evento");
  if (participant.status !== "ACCEPTED" || !participant.attended) {
    throw new Error("El participante debe haber confirmado y asistido al evento");
  }
  const updated = await db.eventParticipant.update({
    where: { id: participantId },
    data: { certificateIssuedAt: new Date() },
  });
  revalidateParticipantViews(self.username);
  return updated;
}

export async function addEventParticipant(eventId: string, userId: string) {
  const { self } = await managedEvent(eventId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Invitado no encontrado");
  await db.eventParticipant.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status: "PENDING" },
    update: { status: "PENDING", attended: false, certificateIssuedAt: null },
  });
  revalidateParticipantViews(self.username);
}
