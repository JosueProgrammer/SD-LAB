import { getSelf } from "@/lib/auth-service";
import { getUpcomingEvents, getUpcomingInvitedEvents } from "@/lib/event-service";
import { UpcomingEvents } from "./_components/upcoming-events";

export default async function UpcomingPage() {
  const self = await getSelf();
  const events =
    self.role === "INVITADO"
      ? (await getUpcomingInvitedEvents(self.id)).map((event) => ({
          id: event.id,
          title: event.title,
          type: event.type,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          status: event.status,
        }))
      : await getUpcomingEvents(self.id);
  return <UpcomingEvents events={events} />;
}
