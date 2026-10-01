import { getSelf } from "@/lib/auth-service";
import { getUpcomingEvents } from "@/lib/event-service";
import { UpcomingEvents } from "./_components/upcoming-events";

export default async function UpcomingPage() {
  const self = await getSelf();
  const events = await getUpcomingEvents(self.id);
  return <UpcomingEvents events={events} />;
}
