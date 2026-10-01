import { getSelf } from "@/lib/auth-service";
import { getParticipantManagementEvents } from "@/lib/event-service";
import { redirect } from "next/navigation";
import { ParticipantManagement } from "./_components/participant-management";

export default async function ParticipantsPage() {
  const self = await getSelf();
  if (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO") {
    redirect(`/u/${self.username}/home`);
  }
  const events = await getParticipantManagementEvents(self.id);
  return <ParticipantManagement events={events} />;
}
