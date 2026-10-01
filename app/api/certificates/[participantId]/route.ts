import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const ascii = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
const escapePdf = (value: string) => ascii(value).replace(/([\\()])/g, "\\$1");

function makePdf(lines: string[]) {
  const content = [
    "BT /F1 30 Tf 120 700 Td (SD LAB) Tj ET",
    "BT /F2 23 Tf 145 640 Td (CERTIFICADO DE PARTICIPACION) Tj ET",
    ...lines.map((line, i) => `BT /F1 14 Tf 95 ${570 - i * 35} Td (${escapePdf(line)}) Tj ET`),
    "BT /F1 10 Tf 215 110 Td (Universidad - Departamento Academico) Tj ET",
    "BT /F1 9 Tf 85 65 Td (Documento emitido por SD LAB) Tj ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const startXref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function GET(_request: Request, context: RouteContext<"/api/certificates/[participantId]">) {
  const self = await getSelf();
  const { participantId } = await context.params;
  const participant = await db.eventParticipant.findUnique({
    where: { id: participantId },
    include: { user: true, event: { include: { creator: true } } },
  });
  if (!participant || !participant.certificateIssuedAt) return new Response("Certificado no disponible", { status: 404 });
  const isManager = self.role === "ADMIN" || participant.event.creatorId === self.id;
  if (!isManager && participant.userId !== self.id) return new Response("No autorizado", { status: 403 });
  const fullName = `${participant.user.firstName ?? ""} ${participant.user.lastName ?? ""}`.trim() || participant.user.username;
  const date = new Intl.DateTimeFormat("es-NI", { dateStyle: "long" }).format(participant.event.date);
  const time = new Intl.DateTimeFormat("es-NI", { hour: "numeric", minute: "2-digit" }).format(participant.event.startTime);
  const endTime = new Intl.DateTimeFormat("es-NI", { hour: "numeric", minute: "2-digit" }).format(participant.event.endTime);
  const pdf = makePdf([
    "Se certifica que", fullName, "participo en el evento:", participant.event.title,
    `Realizado el ${date}, de ${time} a ${endTime}.`,
    `Docente responsable: ${participant.event.creator.firstName ?? participant.event.creator.username} ${participant.event.creator.lastName ?? ""}`,
  ]);
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="certificado-${participant.event.id}.pdf"` } });
}
