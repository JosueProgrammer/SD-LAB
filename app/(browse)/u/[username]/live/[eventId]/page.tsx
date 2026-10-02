import { getSelf } from "@/lib/auth-service";
import { getEventById } from "@/lib/event-service";
import { notFound, redirect } from "next/navigation";
import { LiveRoom } from "./_components/live-room";

interface LiveEventPageProps {
  params: Promise<{
    username: string;
    eventId: string;
  }>;
}

export default async function LiveEventPage({ params }: LiveEventPageProps) {
  const { username, eventId } = await params;
  const self = await getSelf();

  if (!self) {
    redirect("/sign-in");
  }

  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const isHost = event.creatorId === self.id || self.role === "ADMIN";
  const isGuestInvitee = event.participants.some(
    (participant) =>
      participant.userId === self.id &&
      (participant.status === "ACCEPTED" || participant.status === "PENDING")
  );
  const isSupervisor = self.role === "JEFE_DEPARTAMENTO" || self.role === "ADMIN";

  if (!isHost && !isGuestInvitee && !isSupervisor) {
    redirect(`/u/${username}/live`);
  }

  if (event.status !== "APPROVED" && event.status !== "LIVE") {
    redirect(`/u/${username}/live`);
  }

  if (!isHost && event.status !== "LIVE") {
    redirect(`/u/${username}/live`);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
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
        username={username}
        canManage={isHost}
      />
    </div>
  );
}
