import { getSelf } from "@/lib/auth-service";
import { getAttendanceEvents } from "@/lib/event-service";
import { getEligibleGuests } from "@/lib/user-service";
import { AttendanceManagement } from "./_components/attendance-management";

export default async function AttendancePage() {
  const self = await getSelf();
  const [events, guests] = await Promise.all([getAttendanceEvents(self.id), getEligibleGuests()]);
  return <AttendanceManagement events={events} guests={guests} />;
}
