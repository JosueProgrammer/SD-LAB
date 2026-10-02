import { getSelf, requireRole } from "@/lib/auth-service";
import { getAttendanceEvents, getDepartmentAttendanceEvents } from "@/lib/event-service";
import { getEligibleGuests } from "@/lib/user-service";
import { AttendanceManagement } from "./_components/attendance-management";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string; location?: string }>;
}) {
  const self = await getSelf();
  const params = await searchParams;

  if (self.role === "JEFE_DEPARTAMENTO" || self.role === "ADMIN") {
    await requireRole("JEFE_DEPARTAMENTO", "ADMIN");
    const events = await getDepartmentAttendanceEvents({
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
      type: params.type,
      location: params.location,
    });
    const guests = await getEligibleGuests();
    return <AttendanceManagement events={events} guests={guests} />;
  }

  const [events, guests] = await Promise.all([getAttendanceEvents(self.id), getEligibleGuests()]);
  return <AttendanceManagement events={events} guests={guests} />;
}
