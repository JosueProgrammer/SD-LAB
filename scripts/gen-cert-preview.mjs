import { writeFileSync } from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const PURPLE = rgb(123 / 255, 31 / 255, 161 / 255);
const NAME_CYAN = rgb(91 / 255, 192 / 255, 222 / 255);
const BG = rgb(246 / 255, 246 / 255, 246 / 255);
const TEXT = rgb(0.12, 0.12, 0.12);

const doc = await PDFDocument.create();
const page = doc.addPage([PAGE_W, PAGE_H]);
const regular = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BG });

function bar(x, y, w, h, r) {
  page.drawRectangle({ x: x + r, y, width: w - 2 * r, height: h, color: PURPLE });
  page.drawRectangle({ x, y: y + r, width: w, height: h - 2 * r, color: PURPLE });
  page.drawCircle({ x: x + r, y: y + r, size: r, color: PURPLE });
  page.drawCircle({ x: x + w - r, y: y + r, size: r, color: PURPLE });
  page.drawCircle({ x: x + r, y: y + h - r, size: r, color: PURPLE });
  page.drawCircle({ x: x + w - r, y: y + h - r, size: r, color: PURPLE });
}
bar(18, 18, 30, PAGE_H - 36, 14);
bar(PAGE_W - 48, 18, 30, PAGE_H - 36, 14);

const logoBytes = await readFile(path.join(process.cwd(), "public", "certificates", "sd-lab-logo.png"));
const logo = await doc.embedPng(logoBytes);
page.drawImage(logo, { x: PAGE_W - 145, y: PAGE_H - 130, width: 92, height: 92 });

function center(text, y, font, size, color = TEXT) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - width) / 2, y, size, font, color });
}

center("CERTIFICADO DE PARTICIPACION", PAGE_H - 78, bold, 28, PURPLE);
center("UNAN-Managua, CUR-Carazo", PAGE_H - 108, regular, 13, PURPLE);
center("Departamento de Ciencias, Tecnologias y Salud", PAGE_H - 128, regular, 13, PURPLE);
center("Se certifica que", PAGE_H - 175, regular, 15);
center("Josue Bermudez", PAGE_H - 225, boldItalic, 34, NAME_CYAN);
center("Participo activa y satisfactoriamente en el evento:", PAGE_H - 268, regular, 14);
center("Pruebas de la Plataforma Integrador", PAGE_H - 300, bold, 18);
center("Realizado el 09 de octubre de 2026, de 4:40 p. m. a 4:55 p. m.", PAGE_H - 340, regular, 13);
center("Desarrollado mediante la plataforma academica SD-LAB.", PAGE_H - 362, regular, 13);
page.drawText("ID del Certificado: SDLAB-2026-0001", { x: 48, y: 42, size: 11, font: regular, color: TEXT });
const issued = "Fecha de emision: 10 de octubre de 2026";
page.drawText(issued, {
  x: PAGE_W - 48 - regular.widthOfTextAtSize(issued, 11),
  y: 42,
  size: 11,
  font: regular,
  color: TEXT,
});
center("Emitido por SD-LAB - UNAN-Managua, CUR-Carazo", 22, italic, 10);

const bytes = await doc.save();
writeFileSync("assets/certificado-generado-preview.pdf", bytes);
console.log("ok", bytes.length);
