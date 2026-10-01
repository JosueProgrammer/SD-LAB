import { getSelf } from "@/lib/auth-service";
import { getUpcomingEvents } from "@/lib/event-service";
import { redirect } from "next/navigation";
import { UpcomingEvents } from "./_components/upcoming-events";

export default async function UpcomingPage() {
  const self = await getSelf();
  if (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO") {
    redirect(`/u/${self.username}/home`);
  }
  const events = await getUpcomingEvents(self.id);
  return <UpcomingEvents events={events} />;
}
