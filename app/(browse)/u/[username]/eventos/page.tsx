import { requireRole } from "@/lib/auth-service";
import { getDepartmentEvents } from "@/lib/event-service";
import { db } from "@/lib/db";
import { EventsManager } from "./_components/events-manager";

export default async function EventosPage() {
  const self = await requireRole("JEFE_DEPARTAMENTO", "ADMIN");
  const [events, teachers] = await Promise.all([
    getDepartmentEvents(),
    db.user.findMany({
      where: { role: "DOCENTE", isActive: true },
      select: { id: true, username: true, firstName: true, lastName: true },
      orderBy: { username: "asc" },
    }),
  ]);

  return <EventsManager events={events} teachers={teachers} username={self.username} />;
}
