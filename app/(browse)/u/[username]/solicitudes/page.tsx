import { requireRole } from "@/lib/auth-service";
import { getPendingEventRequests } from "@/lib/event-service";
import { getEligibleGuests } from "@/lib/user-service";
import { db } from "@/lib/db";
import { RequestsManager } from "./_components/requests-manager";

export default async function SolicitudesPage() {
  await requireRole("JEFE_DEPARTAMENTO", "ADMIN");
  const [requests, teachers, guests] = await Promise.all([
    getPendingEventRequests(),
    db.user.findMany({
      where: { role: "DOCENTE", isActive: true },
      select: { id: true, username: true, firstName: true, lastName: true },
      orderBy: { username: "asc" },
    }),
    getEligibleGuests(),
  ]);

  return <RequestsManager requests={requests} teachers={teachers} guests={guests} />;
}
