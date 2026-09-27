import { getSelf } from "@/lib/auth-service";
import { getApprovedEventsByCreator } from "@/lib/event-service";
import { EventPreviewCard } from "./_components/event-preview-card";
import { Video, CalendarX } from "lucide-react";
import { redirect } from "next/navigation";

interface LivePageProps {
  params: { username: string };
}

export default async function LivePage({ params }: LivePageProps) {
  const self = await getSelf();

  if (
    !self ||
    (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO")
  ) {
    redirect("/");
  }

  const events = await getApprovedEventsByCreator(self.id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-violet-600/10 border border-violet-600/20 rounded-xl">
          <Video className="w-6 h-6 text-violet-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo En Vivo</h1>
          <p className="text-muted-foreground text-sm">
            Selecciona un evento aprobado para iniciar o gestionar la transmisión.
          </p>
        </div>
      </div>

      {/* Event grid */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="p-5 bg-muted rounded-2xl">
            <CalendarX className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Sin eventos disponibles</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            No tienes eventos aprobados por el Jefe de Departamento. Crea una solicitud
            para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventPreviewCard
              key={event.id}
              username={params.username}
              event={{
                id: event.id,
                title: event.title,
                type: event.type,
                date: event.date,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                thumbnailUrl: event.thumbnailUrl,
                status: event.status,
                isLive: event.isLive,
                participants: event._count.participants,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
