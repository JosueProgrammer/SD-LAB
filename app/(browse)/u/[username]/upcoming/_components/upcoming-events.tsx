"use client";

import { CalendarDays, Clock3, MapPin, Printer, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EventItem = { id: string; title: string; type: string; date: Date; startTime: Date; endTime: Date; location: string; status: string };
const types: Record<string, string> = { CONFERENCIA: "Conferencia", TALLER: "Taller", SIMPOSIO: "Simposio", CONGRESO: "Congreso", CAPACITACION: "Capacitación", EXPOSICION: "Exposición", RETROALIMENTACION: "Retroalimentación" };
const states: Record<string, { label: string; className: string }> = { PENDING: { label: "Pendiente de aprobación", className: "bg-amber-500/10 text-amber-700" }, APPROVED: { label: "Aprobado", className: "bg-blue-500/10 text-blue-700" }, LIVE: { label: "En vivo", className: "bg-rose-500/10 text-rose-700" } };
const dateText = (value: Date) => new Intl.DateTimeFormat("es-NI", { dateStyle: "full" }).format(new Date(value));
const timeText = (value: Date) => new Intl.DateTimeFormat("es-NI", { hour: "numeric", minute: "2-digit" }).format(new Date(value));

export function UpcomingEvents({ events }: { events: EventItem[] }) {
  return <main className="upcoming-report mx-auto max-w-5xl space-y-6 p-6 md:p-8">
    <style>{`@media print { body * { visibility: hidden; } .upcoming-report, .upcoming-report * { visibility: visible; } .upcoming-report { position: absolute; inset: 0; width: 100%; max-width: none; padding: 24px; } .print-hidden { display: none !important; } .upcoming-item { break-inside: avoid; border: 1px solid #bbb; } }`}</style>
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-3xl font-bold tracking-tight">Próximos eventos</h1><p className="mt-1 text-muted-foreground">Actividades programadas que todavía no han finalizado, ordenadas por fecha.</p></div><Button className="print-hidden" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir reporte</Button></header>
    {events.length === 0 ? <Card><CardContent className="p-12 text-center"><CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><h2 className="font-semibold">No hay próximos eventos</h2><p className="mt-1 text-sm text-muted-foreground">Las actividades aprobadas o pendientes aparecerán aquí.</p></CardContent></Card> : <section className="space-y-4">{events.map(event => { const state = states[event.status] ?? { label: event.status, className: "bg-muted text-muted-foreground" }; return <Card key={event.id} className="upcoming-item overflow-hidden"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div className="space-y-3"><div><h2 className="text-xl font-semibold">{event.title}</h2><p className="mt-1 text-sm text-primary">{types[event.type] ?? event.type}</p></div><div className="grid gap-x-7 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{dateText(event.date)}</span><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{timeText(event.startTime)} – {timeText(event.endTime)}</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</span></div></div><span className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${state.className}`}>{event.status === "LIVE" && <Radio className="h-3 w-3" />}{state.label}</span></div></CardContent></Card>; })}</section>}
  </main>;
}
