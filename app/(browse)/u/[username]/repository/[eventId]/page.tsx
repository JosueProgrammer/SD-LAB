import { getSelf } from "@/lib/auth-service";
import { getRepositoryRecording } from "@/lib/event-service";
import { notFound } from "next/navigation";
import { CalendarDays, Tag } from "lucide-react";

const labels: Record<string,string> = { CAPACITACION:"Capacitación", CONFERENCIA:"Conferencia", CONGRESO:"Congreso", EXPOSICION:"Exposición", RETROALIMENTACION:"Retroalimentación", SIMPOSIO:"Simposio", TALLER:"Taller" };

export default async function RecordingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const self = await getSelf();
  const { eventId } = await params;
  const event = await getRepositoryRecording(eventId, self.id);
  if (!event || !event.recordingUrl) notFound();
  return <main className="mx-auto max-w-5xl space-y-5 p-6 md:p-8"><div><h1 className="text-3xl font-bold">{event.title}</h1><div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Tag className="h-4 w-4"/>{labels[event.type] ?? event.type}</span><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4"/>{new Intl.DateTimeFormat("es-NI",{dateStyle:"long"}).format(event.date)}</span></div></div><video className="aspect-video w-full rounded-xl bg-black" controls preload="metadata" src={event.recordingUrl}>Tu navegador no admite la reproducción de video.</video></main>;
}
