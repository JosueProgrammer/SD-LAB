"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteEvent, updateEvent } from "@/actions/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

type EventRow = {
  id: string;
  title: string;
  type: string;
  date: Date;
  startTime: Date;
  location: string;
  status: string;
  creator: { id: string; username: string; firstName: string | null; lastName: string | null };
  _count: { participants: number };
};

type Teacher = { id: string; username: string; firstName: string | null; lastName: string | null };

export function EventsManager({
  events,
  teachers,
  username,
}: {
  events: EventRow[];
  teachers: Teacher[];
  username: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de eventos</h1>
          <p className="text-muted-foreground">Consultar, reasignar o eliminar eventos del departamento.</p>
        </div>
        <Button asChild variant="primary">
          <Link href={`/u/${username}/create-event`}>Crear evento</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="text-lg">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                <p>
                  {event.type} · {event.status} ·{" "}
                  {new Intl.DateTimeFormat("es-NI", { dateStyle: "medium", timeStyle: "short" }).format(event.startTime)}
                </p>
                <p>
                  Docente:{" "}
                  {`${event.creator.firstName ?? ""} ${event.creator.lastName ?? ""}`.trim() ||
                    event.creator.username}{" "}
                  · Invitados: {event._count.participants}
                </p>
                <p>{event.location}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  onValueChange={(creatorId) =>
                    startTransition(async () => {
                      try {
                        await updateEvent(event.id, { creatorId });
                        toast.success("Docente reasignado");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Error");
                      }
                    })
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Cambiar docente" />
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
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteEvent(event.id);
                        toast.success("Evento eliminado");
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
        {events.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">No hay eventos registrados.</CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
