import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const PAGE_W = 841.89;
const PAGE_H = 595.28;

const PURPLE = rgb(123 / 255, 31 / 255, 161 / 255);
const NAME_CYAN = rgb(91 / 255, 192 / 255, 222 / 255);
const BG = rgb(246 / 255, 246 / 255, 246 / 255);
const TEXT = rgb(0.12, 0.12, 0.12);

export type CertificatePdfInput = {
  fullName: string;
  eventTitle: string;
  eventDateLine: string;
  certificateId: string;
  issuedAtLine: string;
};

const ascii = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = TEXT
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (PAGE_W - width) / 2,
    y,
    size,
    font,
    color,
  });
}

/** Nombre centrado, con tamaño adaptable y hasta 2 líneas para varios participantes. */
function drawParticipantName(page: PDFPage, name: string, font: PDFFont) {
  const maxWidth = PAGE_W - 160;
  let size = 34;
  while (size > 18 && font.widthOfTextAtSize(name, size) > maxWidth) {
    size -= 1;
  }

  if (font.widthOfTextAtSize(name, size) <= maxWidth) {
    drawCentered(page, name, PAGE_H - 225, font, size, NAME_CYAN);
    return;
  }

  const parts = name.split(" ").filter(Boolean);
  let top = name;
  let bottom = "";
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    top = parts.slice(0, mid).join(" ");
    bottom = parts.slice(mid).join(" ");
  }

  size = 28;
  while (
    size > 16 &&
    (font.widthOfTextAtSize(top, size) > maxWidth ||
      (bottom && font.widthOfTextAtSize(bottom, size) > maxWidth))
  ) {
    size -= 1;
  }

  if (!bottom) {
    drawCentered(page, top, PAGE_H - 225, font, size, NAME_CYAN);
    return;
  }

  drawCentered(page, top, PAGE_H - 212, font, size, NAME_CYAN);
  drawCentered(page, bottom, PAGE_H - 244, font, size, NAME_CYAN);
}

function drawRoundedBar(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  page.drawRectangle({ x: x + r, y, width: width - 2 * r, height, color: PURPLE });
  page.drawRectangle({ x, y: y + r, width, height: height - 2 * r, color: PURPLE });
  page.drawCircle({ x: x + r, y: y + r, size: r, color: PURPLE });
  page.drawCircle({ x: x + width - r, y: y + r, size: r, color: PURPLE });
  page.drawCircle({ x: x + r, y: y + height - r, size: r, color: PURPLE });
  page.drawCircle({ x: x + width - r, y: y + height - r, size: r, color: PURPLE });
}

export async function buildCertificatePdf(input: CertificatePdfInput) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BG });

  const barWidth = 30;
  const barMargin = 18;
  drawRoundedBar(page, barMargin, barMargin, barWidth, PAGE_H - barMargin * 2, 14);
  drawRoundedBar(
    page,
    PAGE_W - barMargin - barWidth,
    barMargin,
    barWidth,
    PAGE_H - barMargin * 2,
    14
  );

  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public", "certificates", "sd-lab-logo.png")
    );
    const logo = await doc.embedPng(logoBytes);
    const logoSize = 92;
    page.drawImage(logo, {
      x: PAGE_W - 145,
      y: PAGE_H - 130,
      width: logoSize,
      height: logoSize,
    });
  } catch (error) {
    console.error("No se pudo cargar el logo del certificado", error);
  }

  const fullName = ascii(input.fullName);
  const eventTitle = ascii(input.eventTitle);
  const eventDateLine = ascii(input.eventDateLine);
  const certificateId = ascii(input.certificateId);
  const issuedAtLine = ascii(input.issuedAtLine);

  drawCentered(page, "CERTIFICADO DE PARTICIPACION", PAGE_H - 78, bold, 28, PURPLE);
  drawCentered(page, "UNAN-Managua, CUR-Carazo", PAGE_H - 108, regular, 13, PURPLE);
  drawCentered(
    page,
    "Departamento de Ciencias, Tecnologias y Salud",
    PAGE_H - 128,
    regular,
    13,
    PURPLE
  );

  drawCentered(page, "Se certifica que", PAGE_H - 175, regular, 15, TEXT);
  drawParticipantName(page, fullName || "Participante", boldItalic);
  drawCentered(
    page,
    "Participo activa y satisfactoriamente en el evento:",
    PAGE_H - 268,
    regular,
    14,
    TEXT
  );
  drawCentered(page, eventTitle, PAGE_H - 300, bold, 18, TEXT);
  drawCentered(page, eventDateLine, PAGE_H - 340, regular, 13, TEXT);
  drawCentered(
    page,
    "Desarrollado mediante la plataforma academica SD-LAB.",
    PAGE_H - 362,
    regular,
    13,
    TEXT
  );

  page.drawText(`ID del Certificado: ${certificateId}`, {
    x: 48,
    y: 42,
    size: 11,
    font: regular,
    color: TEXT,
  });

  const issuedWidth = regular.widthOfTextAtSize(`Fecha de emision: ${issuedAtLine}`, 11);
  page.drawText(`Fecha de emision: ${issuedAtLine}`, {
    x: PAGE_W - 48 - issuedWidth,
    y: 42,
    size: 11,
    font: regular,
    color: TEXT,
  });

  drawCentered(
    page,
    "Emitido por SD-LAB - UNAN-Managua, CUR-Carazo",
    22,
    italic,
    10,
    TEXT
  );

  return doc.save();
}

export function formatCertificateId(issuedAt: Date, sequence: number) {
  const year = issuedAt.getFullYear();
  return `SDLAB-${year}-${String(Math.max(1, sequence)).padStart(4, "0")}`;
}

export function certificateFileName(fullName: string, participantId: string) {
  const slug = ascii(fullName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `certificado-${slug || "participante"}-${participantId.slice(0, 8)}.pdf`;
}
