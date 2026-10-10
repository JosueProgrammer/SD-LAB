import Image from "next/image";
import { getSelf } from "@/lib/auth-service";
import { getGuestRepositoryRecording, getRepositoryRecording } from "@/lib/event-service";
import { notFound } from "next/navigation";
import { CalendarDays, Tag } from "lucide-react";

const labels: Record<string, string> = {
  CAPACITACION: "Capacitación",
  CONFERENCIA: "Conferencia",
  CONGRESO: "Congreso",
  EXPOSICION: "Exposición",
  RETROALIMENTACION: "Retroalimentación",
  SIMPOSIO: "Simposio",
  TALLER: "Taller",
};

export default async function RecordingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const self = await getSelf();
  const { eventId } = await params;
  const event =
    self.role === "INVITADO"
      ? await getGuestRepositoryRecording(eventId, self.id)
      : await getRepositoryRecording(eventId, self.id);
  if (!event || !event.recordingUrl) notFound();
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            {labels[event.type] ?? event.type}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {new Intl.DateTimeFormat("es-NI", { dateStyle: "long" }).format(event.date)}
          </span>
        </div>
      </div>
      <video
        className="aspect-video w-full rounded-xl bg-black"
        controls
        preload="metadata"
        poster={event.thumbnailUrl ?? undefined}
        src={event.recordingUrl}
      >
        Tu navegador no admite la reproducción de video.
      </video>
      {event.thumbnailUrl && (
        <div className="relative aspect-video max-w-xs overflow-hidden rounded-xl border">
          <Image src={event.thumbnailUrl} alt={`Miniatura de ${event.title}`} fill className="object-cover" />
        </div>
      )}
    </main>
  );
}
