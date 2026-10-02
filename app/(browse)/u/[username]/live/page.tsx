import { getSelf } from "@/lib/auth-service";
import {
  getApprovedEventsByCreator,
  getDepartmentLiveEvents,
  getLiveEventsForGuest,
} from "@/lib/event-service";
import { EventPreviewCard } from "./_components/event-preview-card";
import { Video, CalendarX } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LivePageProps {
  params: Promise<{ username: string }>;
}

export default async function LivePage({ params }: LivePageProps) {
  const { username } = await params;
  const self = await getSelf();

  if (self.role === "INVITADO") {
    const events = await getLiveEventsForGuest(self.id);
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">En vivo</h1>
          <p className="text-sm text-muted-foreground">
            Transmisiones de eventos a los que has sido invitado.
          </p>
        </div>
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No hay transmisiones disponibles ahora.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-base">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Docente:{" "}
                    {`${event.creator.firstName ?? ""} ${event.creator.lastName ?? ""}`.trim() ||
                      event.creator.username}
                  </p>
                  <p>Espectadores invitados: {event._count.participants}</p>
                  <Button asChild variant="primary">
                    <Link href={`/u/${username}/live/${event.id}`}>Unirse a la transmisión</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (self.role === "JEFE_DEPARTAMENTO" || self.role === "ADMIN") {
    const events = await getDepartmentLiveEvents();
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-violet-600/20 bg-violet-600/10 p-3">
            <Video className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Supervisión en vivo</h1>
            <p className="text-sm text-muted-foreground">Eventos actualmente en transmisión.</p>
          </div>
        </div>
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No hay eventos en vivo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-base">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Docente:{" "}
                    {`${event.creator.firstName ?? ""} ${event.creator.lastName ?? ""}`.trim() ||
                      event.creator.username}
                  </p>
                  <Button asChild variant="primary">
                    <Link href={`/u/${username}/live/${event.id}`}>Ver transmisión</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (self.role !== "DOCENTE") {
    redirect("/");
  }

  const events = await getApprovedEventsByCreator(self.id);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-violet-600/20 bg-violet-600/10 p-3">
          <Video className="h-6 w-6 text-violet-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo En Vivo</h1>
          <p className="text-muted-foreground text-sm">
            Selecciona un evento aprobado para iniciar o gestionar la transmisión.
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="rounded-2xl bg-muted p-5">
            <CalendarX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Sin eventos disponibles</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            No tienes eventos aprobados por el Jefe de Departamento. Crea una solicitud para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventPreviewCard
              key={event.id}
              username={username}
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
