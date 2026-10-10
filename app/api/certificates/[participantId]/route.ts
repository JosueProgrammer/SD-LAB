import { getSelf } from "@/lib/auth-service";
import {
  buildCertificatePdf,
  certificateFileName,
  formatCertificateId,
} from "@/lib/certificate-pdf";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/certificates/[participantId]">
) {
  const self = await getSelf();
  const { participantId } = await context.params;
  const participant = await db.eventParticipant.findUnique({
    where: { id: participantId },
    include: { user: true, event: { include: { creator: true } } },
  });
  if (!participant || !participant.certificateIssuedAt) {
    return new Response("Certificado no disponible", { status: 404 });
  }

  const isManager =
    self.role === "ADMIN" ||
    self.role === "JEFE_DEPARTAMENTO" ||
    participant.event.creatorId === self.id;
  if (!isManager && participant.userId !== self.id) {
    return new Response("No autorizado", { status: 403 });
  }

  const fullName =
    `${participant.user.firstName ?? ""} ${participant.user.lastName ?? ""}`.trim() ||
    participant.user.username;

  const date = new Intl.DateTimeFormat("es-NI", { dateStyle: "long" }).format(
    participant.event.date
  );
  const startTime = new Intl.DateTimeFormat("es-NI", {
    hour: "numeric",
    minute: "2-digit",
  }).format(participant.event.startTime);
  const endTime = new Intl.DateTimeFormat("es-NI", {
    hour: "numeric",
    minute: "2-digit",
  }).format(participant.event.endTime);
  const issuedAt = participant.certificateIssuedAt;
  const issuedAtLine = new Intl.DateTimeFormat("es-NI", { dateStyle: "long" }).format(issuedAt);

  const sequence = await db.eventParticipant.count({
    where: {
      certificateIssuedAt: { not: null, lte: issuedAt },
    },
  });

  const pdf = await buildCertificatePdf({
    fullName,
    eventTitle: participant.event.title,
    eventDateLine: `Realizado el ${date}, de ${startTime} a ${endTime}.`,
    certificateId: formatCertificateId(issuedAt, sequence),
    issuedAtLine,
  });

  const fileName = certificateFileName(fullName, participant.id);

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
