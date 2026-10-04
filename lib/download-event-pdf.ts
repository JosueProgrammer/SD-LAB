import { labelEventType, labelResourceCategory } from "@/lib/labels";

type PdfResource = {
  category: string;
  name: string;
  quantity: number;
  details?: string | null;
};

type PdfEvent = {
  title: string;
  type: string;
  description: string;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  location: string;
  creatorName: string;
  resources?: PdfResource[];
};

export function downloadEventPdf(event: PdfEvent, filename?: string) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const date = new Date(event.date);
  const resources = event.resources || [];
  const safeName = (filename || event.title).replace(/[^\w\-]+/g, "_").slice(0, 60);

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>${event.title}</title>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#111}
  h1{font-size:22px;margin:0 0 12px}
  h2{font-size:16px;margin:24px 0 8px}
  p{margin:6px 0;line-height:1.4}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
  th{background:#f3f3f3}
</style></head><body>
  <h1>Solicitud / evento: ${event.title}</h1>
  <p><strong>Docente:</strong> ${event.creatorName}</p>
  <p><strong>Tipo:</strong> ${labelEventType(event.type)}</p>
  <p><strong>Fecha:</strong> ${date.toLocaleDateString("es-NI")}</p>
  <p><strong>Horario:</strong> ${start.toLocaleTimeString("es-NI")} - ${end.toLocaleTimeString("es-NI")}</p>
  <p><strong>Lugar:</strong> ${event.location}</p>
  <p><strong>Descripción:</strong> ${event.description}</p>
  <h2>Equipos y recursos</h2>
  <table>
    <thead><tr><th>Categoría</th><th>Nombre</th><th>Cantidad</th><th>Detalles</th></tr></thead>
    <tbody>
      ${
        resources.length
          ? resources
              .map(
                (r) =>
                  `<tr><td>${labelResourceCategory(r.category)}</td><td>${r.name}</td><td>${r.quantity}</td><td>${r.details || ""}</td></tr>`
              )
              .join("")
          : "<tr><td colspan='4'>Sin recursos</td></tr>"
      }
    </tbody>
  </table>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // También abre para imprimir/guardar como PDF
  const win = window.open(url, "_blank");
  if (win) {
    win.focus();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
