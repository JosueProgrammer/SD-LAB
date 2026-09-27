"use client";

import { useState, useTransition } from "react";
import { createEvent } from "@/actions/event";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Guest {
  id: string;
  username: string;
}

interface CreateEventFormProps {
  guests: Guest[];
}

export const CreateEventForm = ({ guests }: CreateEventFormProps) => {
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    title: "",
    type: "CONFERENCIA",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuestToggle = (id: string) => {
    setSelectedGuests((prev) =>
      prev.includes(id) ? prev.filter((guestId) => guestId !== id) : [...prev, id]
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      // Combine date and time strings into Date objects
      const eventDate = new Date(formData.date);
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      createEvent({
        title: formData.title,
        type: formData.type as any,
        description: formData.description,
        date: eventDate,
        startTime: startDateTime,
        endTime: endDateTime,
        location: formData.location,
        guestIds: selectedGuests,
      })
        .then(() => {
          toast.success("¡Solicitud de evento creada exitosamente!");
          // Reset form or redirect
        })
        .catch(() => toast.error("Error al crear el evento"));
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-background border rounded-lg p-6 w-full max-w-2xl mx-auto mt-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Título del evento</label>
        <Input required name="title" value={formData.title} onChange={handleChange} placeholder="Ej. Taller de React" disabled={isPending} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Tipo</label>
        <select required name="type" value={formData.type} onChange={handleChange} disabled={isPending} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          <option value="CONFERENCIA">Conferencia</option>
          <option value="TALLER">Taller</option>
          <option value="SIMPOSIO">Simposio</option>
          <option value="CONGRESO">Congreso</option>
          <option value="CAPACITACION">Capacitación</option>
          <option value="EXPOSICION">Exposición</option>
          <option value="RETROALIMENTACION">Retroalimentación</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Descripción</label>
        <Textarea required name="description" value={formData.description} onChange={handleChange} placeholder="Breve descripción del evento" disabled={isPending} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Fecha</label>
          <Input required type="date" name="date" value={formData.date} onChange={handleChange} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Hora de inicio</label>
          <Input required type="time" name="startTime" value={formData.startTime} onChange={handleChange} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Hora de finalización</label>
          <Input required type="time" name="endTime" value={formData.endTime} onChange={handleChange} disabled={isPending} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Lugar y requerimientos</label>
        <Input required name="location" value={formData.location} onChange={handleChange} placeholder="Ej. Auditorio A, requiere proyector" disabled={isPending} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Invitar Estudiantes (Invitados)</label>
        <div className="border p-4 rounded-md max-h-48 overflow-y-auto space-y-2">
            {guests.length === 0 && <p className="text-sm text-muted-foreground">No hay estudiantes (INVITADOS) registrados.</p>}
            {guests.map((guest) => (
                <div key={guest.id} className="flex items-center gap-x-2">
                <input
                    type="checkbox"
                    id={`guest-${guest.id}`}
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => handleGuestToggle(guest.id)}
                    disabled={isPending}
                />
                <label htmlFor={`guest-${guest.id}`} className="text-sm cursor-pointer">{guest.username}</label>
                </div>
            ))}
        </div>
      </div>

      <Button variant="primary" type="submit" disabled={isPending} className="w-full">
        Enviar Solicitud
      </Button>
    </form>
  );
};
