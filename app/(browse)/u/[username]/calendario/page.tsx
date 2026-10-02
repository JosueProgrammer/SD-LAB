import { requireRole } from "@/lib/auth-service";
import { getCalendarEvents } from "@/lib/event-service";
import { ActivitiesCalendar } from "@/components/calendar/activities-calendar";

export default async function CalendarioPage() {
  const self = await requireRole("JEFE_DEPARTAMENTO", "ADMIN");
  const events = await getCalendarEvents(self.role === "ADMIN" ? "all" : "department");
  return (
    <ActivitiesCalendar
      events={events}
      title={self.role === "ADMIN" ? "Calendario general" : "Calendario de actividades"}
      readOnly={self.role === "ADMIN"}
    />
  );
}
