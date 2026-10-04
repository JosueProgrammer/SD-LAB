"use client";

import { useMemo, useState, useTransition } from "react";
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
import { downloadEventPdf } from "@/lib/download-event-pdf";
import { eventTypeLabels, labelEventStatus, labelEventType } from "@/lib/labels";
import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

type EventRow = {
  id: string;
  title: string;
  type: string;
  description?: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  location: string;
  status: string;
  creator: { id: string; username: string; firstName: string | null; lastName: string | null };
  resources?: { category: string; name: string; quantity: number; details: string | null }[];
  _count: { participants: number };
};

type Teacher = { id: string; username: string; firstName: string | null; lastName: string | null };

function teacherName(teacher: Teacher) {
  return `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim() || teacher.username;
}

export function EventsManager({
  events,
  teachers,
}: {
  events: EventRow[];
  teachers: Teacher[];
  username: string;
}) {
  const [pending, startTransition] = useTransition();
  const [period, setPeriod] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  const [teacherFilter, setTeacherFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const now = new Date();
    return events.filter((event) => {
      if (teacherFilter !== "ALL" && event.creator.id !== teacherFilter) return false;
      if (typeFilter !== "ALL" && event.type !== typeFilter) return false;

      if (period === "WEEK") {
        const start = startOfWeek(now, { weekStartsOn: 1, locale: es });
        const end = endOfWeek(now, { weekStartsOn: 1, locale: es });
        return isWithinInterval(new Date(event.startTime), { start, end });
      }
      if (period === "MONTH") {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        return isWithinInterval(new Date(event.startTime), { start, end });
      }
      return true;
    });
  }, [events, period, teacherFilter, typeFilter]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de eventos</h1>
        <p className="text-muted-foreground">Consultar, reasignar o eliminar eventos del departamento.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
          <SelectTrigger>
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="WEEK">Esta semana</SelectItem>
            <SelectItem value="MONTH">Este mes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Docente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los docentes</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacherName(teacher)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            {Object.entries(eventTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setPeriod("ALL");
            setTeacherFilter("ALL");
            setTypeFilter("ALL");
          }}
        >
          Limpiar filtros
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="text-lg">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                <p>
                  {labelEventType(event.type)} · {labelEventStatus(event.status)} ·{" "}
                  {new Intl.DateTimeFormat("es-NI", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(event.startTime)}
                </p>
                <p>
                  Docente: {teacherName(event.creator)} · Invitados: {event._count.participants}
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
                    {teachers
                      .filter((teacher) => teacher.id !== event.creator.id)
                      .map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacherName(teacher)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadEventPdf({
                      title: event.title,
                      type: event.type,
                      description: event.description || "",
                      date: event.date,
                      startTime: event.startTime,
                      endTime: event.endTime || event.startTime,
                      location: event.location,
                      creatorName: teacherName(event.creator),
                      resources: event.resources || [],
                    })
                  }
                >
                  Descargar PDF
                </Button>
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
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No hay eventos con esos filtros.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
