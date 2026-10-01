"use client";

import { useMemo, useState, useTransition } from "react";
import { Award, CalendarDays, Check, ChevronDown, Download, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { issueCertificate, removeEventParticipant, setParticipantAttendance } from "@/actions/participant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EventItem = {
  id: string; title: string; type: string; date: Date; startTime: Date; endTime: Date; status: string;
  participants: Array<{ id: string; status: string; attended: boolean; certificateIssuedAt: Date | null; user: { username: string; email: string | null; firstName: string | null; lastName: string | null; career: string | null } }>;
};

const labels: Record<string, string> = { CONFERENCIA: "Conferencia", TALLER: "Taller", SIMPOSIO: "Simposio", CONGRESO: "Congreso", CAPACITACION: "Capacitación", EXPOSICION: "Exposición", RETROALIMENTACION: "Retroalimentación" };
const status: Record<string, string> = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado", LIVE: "En vivo", FINISHED: "Finalizado" };
const formatDate = (date: Date) => new Intl.DateTimeFormat("es-NI", { dateStyle: "long" }).format(new Date(date));
const formatTime = (date: Date) => new Intl.DateTimeFormat("es-NI", { hour: "numeric", minute: "2-digit" }).format(new Date(date));
const nameOf = (user: EventItem["participants"][number]["user"]) => `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

export function ParticipantManagement({ events }: { events: EventItem[] }) {
  const [day, setDay] = useState(""); const [month, setMonth] = useState(""); const [year, setYear] = useState("");
  const [type, setType] = useState(""); const [openEvent, setOpenEvent] = useState<string | null>(events[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => events.filter(event => {
    const date = new Date(event.date);
    return (!type || event.type === type) && (!day || date.getDate() === Number(day)) && (!month || date.getMonth() + 1 === Number(month)) && (!year || date.getFullYear() === Number(year));
  }), [events, day, month, year, type]);
  const clear = () => { setDay(""); setMonth(""); setYear(""); setType(""); };
  const run = (work: () => Promise<unknown>, message: string) => startTransition(async () => { try { await work(); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo completar la operación"); } });

  return <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
    <header><h1 className="text-3xl font-bold tracking-tight">Gestión de participantes</h1><p className="mt-1 text-muted-foreground">Consulta invitaciones confirmadas, registra asistencia y emite certificados.</p></header>
    <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
      <select aria-label="Día" value={day} onChange={e => setDay(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Día</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
      <select aria-label="Mes" value={month} onChange={e => setMonth(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Mes</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Intl.DateTimeFormat("es", { month: "long" }).format(new Date(2026, i))}</option>)}</select>
      <select aria-label="Año" value={year} onChange={e => setYear(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Año</option>{Array.from(new Set(events.map(e => new Date(e.date).getFullYear()))).sort().map(value => <option key={value} value={value}>{value}</option>)}</select>
      <select aria-label="Tipo de evento" value={type} onChange={e => setType(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos los tipos</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <Button variant="outline" onClick={clear}>Limpiar filtros</Button>
    </CardContent></Card>
    <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "evento encontrado" : "eventos encontrados"}</p>
    <section className="space-y-4">{filtered.length === 0 ? <Card><CardContent className="p-12 text-center text-muted-foreground">No hay eventos que coincidan con los filtros.</CardContent></Card> : filtered.map(event => {
      const isOpen = openEvent === event.id; const finished = event.status === "FINISHED";
      return <Card key={event.id} className="overflow-hidden"><CardHeader className="cursor-pointer p-5" onClick={() => setOpenEvent(isOpen ? null : event.id)}><div className="flex items-start justify-between gap-4"><div className="space-y-2"><CardTitle className="text-xl">{event.title}</CardTitle><div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(event.date)}</span><span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span><span>{labels[event.type]}</span><span className={finished ? "text-emerald-600" : "text-amber-600"}>{status[event.status]}</span></div></div><ChevronDown className={`mt-1 h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} /></div></CardHeader>
      {isOpen && <CardContent className="border-t p-0"><div className="flex items-center gap-2 px-5 py-4 text-sm font-medium"><Users className="h-4 w-4" />Participantes confirmados ({event.participants.length}) {finished && <span className="ml-auto text-xs font-normal text-muted-foreground">El evento finalizó: puedes emitir certificados.</span>}</div>
      {event.participants.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No hay participantes con invitación confirmada.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/30 text-left text-muted-foreground"><tr><th className="p-4 font-medium">Participante</th><th className="p-4 font-medium">Correo</th><th className="p-4 font-medium">Carrera</th><th className="p-4 font-medium">Participación</th><th className="p-4 font-medium">Asistencia</th><th className="p-4 font-medium text-right">Acciones</th></tr></thead><tbody>{event.participants.map(participant => <tr key={participant.id} className="border-b last:border-0"><td className="p-4 font-medium">{nameOf(participant.user)}</td><td className="p-4 text-muted-foreground">{participant.user.email || participant.user.username}</td><td className="p-4 text-muted-foreground">{participant.user.career || "No registrada"}</td><td className="p-4"><span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-700">Confirmada</span></td><td className="p-4"><button disabled={pending} onClick={() => run(() => setParticipantAttendance(participant.id, !participant.attended), participant.attended ? "Asistencia retirada" : "Asistencia registrada")} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${participant.attended ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{participant.attended && <Check className="h-3 w-3" />}{participant.attended ? "Asistió" : "No asistió"}</button></td><td className="p-4"><div className="flex justify-end gap-2">{finished && participant.attended && (participant.certificateIssuedAt ? <Button size="sm" variant="outline" asChild><a href={`/api/certificates/${participant.id}`}><Download className="mr-1 h-4 w-4" />PDF</a></Button> : <Button size="sm" disabled={pending} onClick={() => run(async () => { await issueCertificate(participant.id); window.open(`/api/certificates/${participant.id}`, "_blank", "noopener,noreferrer"); }, "Certificado emitido y disponible para descarga")}><Award className="mr-1 h-4 w-4" />Certificar</Button>)}<Button size="icon" variant="ghost" disabled={pending} aria-label={`Eliminar a ${nameOf(participant.user)}`} onClick={() => { if (window.confirm(`¿Retirar a ${nameOf(participant.user)} del evento?`)) run(() => removeEventParticipant(participant.id), "Participante retirado del evento"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>)}</tbody></table></div>}</CardContent>}</Card>;
    })}</section>
  </main>;
}
