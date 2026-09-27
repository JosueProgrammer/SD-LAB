import { getEligibleGuests } from "@/lib/user-service";
import { CreateEventForm } from "./_components/create-event-form";

export default async function CreateEventPage() {
    const guests = await getEligibleGuests();

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Crear Evento</h1>
                <p className="text-muted-foreground">Envía la solicitud para la creación de un nuevo evento. El Jefe de Departamento debe aprobarla para que entre en vigencia.</p>
            </div>
            <CreateEventForm guests={guests} />
        </div>
    )
}
