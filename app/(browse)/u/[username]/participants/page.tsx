import { getSelf } from "@/lib/auth-service";
import { getParticipantManagementEvents } from "@/lib/event-service";
import { ParticipantManagement } from "./_components/participant-management";

export default async function ParticipantsPage() {
  const self = await getSelf();
  const events = await getParticipantManagementEvents(self.id);
  return <ParticipantManagement events={events} />;
}
