"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CalendarEvent = {
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

type ViewMode = "day" | "week" | "month";

export function ActivitiesCalendar({
  events,
  title,
  readOnly = false,
}: {
  events: CalendarEvent[];
  title: string;
  readOnly?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: endOfWeek(cursor, { weekStartsOn: 1 }) });
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor, view]);

  function eventsFor(day: Date) {
    return events.filter((event) => isSameDay(new Date(event.date), day));
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">
            {readOnly ? "Vista de solo consulta." : "Calendario de actividades del departamento."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={view === "day" ? "primary" : "outline"} onClick={() => setView("day")}>
            Día
          </Button>
          <Button variant={view === "week" ? "primary" : "outline"} onClick={() => setView("week")}>
            Semana
          </Button>
          <Button variant={view === "month" ? "primary" : "outline"} onClick={() => setView("month")}>
            Mes
          </Button>
          <Button variant="outline" onClick={() => setCursor(addDays(cursor, view === "month" ? -30 : view === "week" ? -7 : -1))}>
            Anterior
          </Button>
          <Button variant="outline" onClick={() => setCursor(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" onClick={() => setCursor(addDays(cursor, view === "month" ? 30 : view === "week" ? 7 : 1))}>
            Siguiente
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium capitalize">
        {format(cursor, view === "month" ? "MMMM yyyy" : "PPP", { locale: es })}
      </p>

      <div className={view === "month" ? "grid grid-cols-7 gap-2" : "grid gap-3"}>
        {view === "month" &&
          ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => (
            <div key={label} className="px-2 text-xs font-semibold text-muted-foreground">
              {label}
            </div>
          ))}
        {days.map((day) => {
          const dayEvents = eventsFor(day);
          return (
            <Card
              key={day.toISOString()}
              className={view === "month" ? `min-h-28 ${!isSameMonth(day, cursor) ? "opacity-50" : ""}` : ""}
            >
              <CardContent className="space-y-2 p-3">
                <p className="text-sm font-semibold">{format(day, view === "month" ? "d" : "EEEE d MMM", { locale: es })}</p>
                {dayEvents.map((event) => (
                  <div key={event.id} className="rounded-md bg-muted/60 p-2 text-xs">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(event.startTime), "HH:mm")} · {event.location}
                    </p>
                  </div>
                ))}
                {dayEvents.length === 0 && view !== "month" && (
                  <p className="text-xs text-muted-foreground">Sin actividades</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
