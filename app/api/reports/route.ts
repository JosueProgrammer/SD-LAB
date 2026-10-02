import { NextResponse } from "next/server";
import { getSelf } from "@/lib/auth-service";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const ascii = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
const escapePdf = (value: string) => ascii(value).replace(/([\\()])/g, "\\$1");

function makePdf(title: string, lines: string[]) {
  const content = [
    `BT /F2 18 Tf 50 750 Td (${escapePdf(title)}) Tj ET`,
    ...lines.map((line, i) => `BT /F1 11 Tf 50 ${720 - i * 16} Td (${escapePdf(line)}) Tj ET`),
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
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startXref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function GET(request: Request) {
  const self = await getSelf();
  if (self.role !== "ADMIN") return new Response("No autorizado", { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "users";
  const period = searchParams.get("period") || "month";
  const from = new Date();
  if (period === "week") from.setDate(from.getDate() - 7);
  else from.setMonth(from.getMonth() - 1);

  let title = "Reporte SD Lab";
  let lines: string[] = [];

  if (type === "users") {
    title = "Reporte de usuarios";
    const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
    lines = users.map(
      (user) =>
        `${user.username} | ${user.role} | ${user.email || "-"} | ${user.isActive ? "Activo" : "Inactivo"}`
    );
  } else if (type === "events") {
    title = "Reporte de eventos";
    const events = await db.event.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
    lines = events.map((event) => `${event.title} | ${event.type} | ${event.status}`);
  } else if (type === "activity") {
    title = "Reporte de actividad";
    const [users, events, participants] = await Promise.all([
      db.user.count({ where: { createdAt: { gte: from } } }),
      db.event.count({ where: { createdAt: { gte: from } } }),
      db.eventParticipant.count({ where: { createdAt: { gte: from } } }),
    ]);
    lines = [
      `Periodo: ${period}`,
      `Usuarios nuevos: ${users}`,
      `Eventos creados: ${events}`,
      `Participantes registrados: ${participants}`,
    ];
  } else {
    title = "Reporte de estadisticas";
    const stats = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "JEFE_DEPARTAMENTO" } }),
      db.user.count({ where: { role: "DOCENTE" } }),
      db.user.count({ where: { role: "INVITADO" } }),
      db.event.count(),
    ]);
    lines = [
      `Total usuarios: ${stats[0]}`,
      `Jefes: ${stats[1]}`,
      `Docentes: ${stats[2]}`,
      `Invitados: ${stats[3]}`,
      `Eventos: ${stats[4]}`,
    ];
  }

  const pdf = makePdf(title, lines.length ? lines : ["Sin datos"]);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${type}.pdf"`,
    },
  });
}
