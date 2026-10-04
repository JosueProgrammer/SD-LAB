"use client";

import { useMemo, useState, useTransition } from "react";
import { InvitationStatus } from "@prisma/client";
import { toast } from "sonner";
import { respondInvitation } from "@/actions/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invitationStatusLabels } from "@/lib/labels";
import { downloadEventPdf } from "@/lib/download-event-pdf";

type InvitationRow = {
  id: string;
  status: InvitationStatus;
  attended: boolean;
  event: {
    id: string;
    title: string;
    type: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    location: string;
    status: string;
    creator: { username: string; firstName: string | null; lastName: string | null };
  };
};

function canRespond(item: InvitationRow) {
  if (item.status !== "PENDING" || item.event.status === "FINISHED") return false;
  const deadline = new Date(new Date(item.event.startTime).getTime() - 10 * 60 * 1000);
  return new Date() <= deadline;
}

export function GuestAttendances({ invitations }: { invitations: InvitationRow[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "ALL") return invitations;
    return invitations.filter((item) => item.status === filter);
  }, [filter, invitations]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis asistencias</h1>
          <p className="text-muted-foreground">
            Consulta y responde tus invitaciones. Sin respuesta a 10 minutos del inicio se marca como
            rechazada.
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="ACCEPTED">Confirmado</SelectItem>
            <SelectItem value="REJECTED">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">{item.event.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("es-NI", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(item.event.startTime)}
                  {" · "}
                  {item.event.location}
                  {" · "}
                  {invitationStatusLabels[item.status]}
                  {item.attended ? " · Asistió" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadEventPdf({
                      title: item.event.title,
                      type: item.event.type,
                      description: "",
                      date: item.event.date,
                      startTime: item.event.startTime,
                      endTime: item.event.endTime,
                      location: item.event.location,
                      creatorName:
                        `${item.event.creator.firstName ?? ""} ${item.event.creator.lastName ?? ""}`.trim() ||
                        item.event.creator.username,
                    })
                  }
                >
                  Descargar PDF
                </Button>
                {canRespond(item) && (
                  <>
                    <Button
                      variant="primary"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await respondInvitation(item.event.id, "ACCEPTED");
                            toast.success("Invitación confirmada");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Error");
                          }
                        })
                      }
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await respondInvitation(item.event.id, "REJECTED");
                            toast.success("Invitación rechazada");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Error");
                          }
                        })
                      }
                    >
                      Rechazar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No hay registros para este filtro.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
