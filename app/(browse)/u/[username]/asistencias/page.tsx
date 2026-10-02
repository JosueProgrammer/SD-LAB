import { getSelf } from "@/lib/auth-service";
import { getGuestInvitations } from "@/lib/event-service";
import { GuestAttendances } from "./_components/guest-attendances";
import { redirect } from "next/navigation";

export default async function AsistenciasPage() {
  const self = await getSelf();
  if (self.role !== "INVITADO" && self.role !== "ADMIN") {
    redirect(`/u/${self.username}`);
  }
  const invitations = await getGuestInvitations(self.id);
  return <GuestAttendances invitations={invitations} />;
}
