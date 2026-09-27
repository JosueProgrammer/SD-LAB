import { getSelf } from "@/lib/auth-service";
import { getEventById } from "@/lib/event-service";
import { notFound, redirect } from "next/navigation";
import { LiveRoom } from "./_components/live-room";

interface LiveEventPageProps {
  params: {
    username: string;
    eventId: string;
  };
}

export default async function LiveEventPage({ params }: LiveEventPageProps) {
  const self = await getSelf();

  if (!self) {
    redirect("/sign-in");
  }

  const event = await getEventById(params.eventId);

  if (!event) {
    notFound();
  }

  // Solo el creador o admin puede gestionar la transmisión
  if (event.creatorId !== self.id && self.role !== "ADMIN") {
    redirect(`/u/${params.username}/live`);
  }

  // El evento debe estar aprobado o en vivo para poder entrar
  if (event.status !== "APPROVED" && event.status !== "LIVE") {
    redirect(`/u/${params.username}/live`);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <LiveRoom
        event={{
          id: event.id,
          title: event.title,
          type: event.type,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          isLive: event.isLive,
        }}
        hostId={event.creator.id}
        hostUsername={event.creator.username}
        username={params.username}
      />
    </div>
  );
}
