import { requireRole } from "@/lib/auth-service";
import { getEligibleGuests } from "@/lib/user-service";
import { CreateEventForm } from "./_components/create-event-form";

export default async function CreateEventPage() {
  await requireRole("DOCENTE", "JEFE_DEPARTAMENTO", "ADMIN");
  const guests = await getEligibleGuests();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Crear evento</h1>
      </div>
      <CreateEventForm guests={guests} />
    </div>
  );
}
