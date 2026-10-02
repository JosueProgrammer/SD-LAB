"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { approveEvent, rejectEvent, deleteEvent, updateEvent } from "@/actions/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RequestItem = {
  id: string;
  title: string;
  type: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location: string;
  status: string;
  creator: { id: string; username: string; firstName: string | null; lastName: string | null; email: string | null };
  resources: { id: string; category: string; name: string; quantity: number; details: string | null }[];
  _count: { participants: number };
};

type Teacher = { id: string; username: string; firstName: string | null; lastName: string | null };

export function RequestsManager({
  requests,
  teachers,
}: {
  requests: RequestItem[];
  teachers: Teacher[];
}) {
  const [pending, startTransition] = useTransition();

  function printRequest(request: RequestItem) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Solicitud ${request.title}</title>
      <style>body{font-family:Arial;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style>
      </head><body>
      <h1>Solicitud de evento: ${request.title}</h1>
      <p><strong>Docente:</strong> ${request.creator.firstName || ""} ${request.creator.lastName || ""} (@${request.creator.username})</p>
      <p><strong>Tipo:</strong> ${request.type}</p>
      <p><strong>Fecha:</strong> ${new Date(request.date).toLocaleDateString("es-NI")}</p>
      <p><strong>Horario:</strong> ${new Date(request.startTime).toLocaleTimeString("es-NI")} - ${new Date(request.endTime).toLocaleTimeString("es-NI")}</p>
      <p><strong>Lugar:</strong> ${request.location}</p>
      <p><strong>Descripción:</strong> ${request.description}</p>
      <h2>Equipos y recursos</h2>
      <table><thead><tr><th>Categoría</th><th>Nombre</th><th>Cantidad</th><th>Detalles</th></tr></thead>
      <tbody>${request.resources.map((r) => `<tr><td>${r.category}</td><td>${r.name}</td><td>${r.quantity}</td><td>${r.details || ""}</td></tr>`).join("") || "<tr><td colspan=4>Sin recursos</td></tr>"}</tbody></table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de solicitudes</h1>
        <p className="text-muted-foreground">Aprobar, rechazar, modificar o asignar docentes.</p>
      </div>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="text-lg">{request.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <p>
                  Docente:{" "}
                  {`${request.creator.firstName ?? ""} ${request.creator.lastName ?? ""}`.trim() ||
                    request.creator.username}
                </p>
                <p>Tipo: {request.type}</p>
                <p>
                  Fecha: {new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "short" }).format(request.startTime)}
                </p>
                <p>Lugar: {request.location}</p>
                <p>Invitados: {request._count.participants}</p>
              </div>
              <p className="text-sm">{request.description}</p>
              {request.resources.length > 0 && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-2 font-medium">Recursos</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {request.resources.map((resource) => (
                      <li key={resource.id}>
                        {resource.category}: {resource.name} × {resource.quantity}
                        {resource.details ? ` (${resource.details})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  onValueChange={(creatorId) =>
                    startTransition(async () => {
                      try {
                        await updateEvent(request.id, { creatorId });
                        toast.success("Docente asignado");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Error");
                      }
                    })
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Asignar docente" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {`${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim() || teacher.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await approveEvent(request.id);
                        toast.success("Solicitud aprobada");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Error");
                      }
                    })
                  }
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await rejectEvent(request.id);
                        toast.success("Solicitud rechazada");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Error");
                      }
                    })
                  }
                >
                  Rechazar
                </Button>
                <Button variant="secondary" onClick={() => printRequest(request)}>
                  PDF / Imprimir
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteEvent(request.id);
                        toast.success("Solicitud eliminada");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Error");
                      }
                    })
                  }
                >
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No hay solicitudes pendientes.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
