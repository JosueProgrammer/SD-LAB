"use client";

import { useRef, useState, useTransition } from "react";
import { EventType } from "@prisma/client";
import { createEvent } from "@/actions/event";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadFiles } from "@/lib/uploadthing";
import { FileImage, Search, Upload, X } from "lucide-react";

interface Guest {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  studentId?: string | null;
  career?: string | null;
}

interface CreateEventFormProps {
  guests: Guest[];
}

const RESOURCE_OPTIONS = {
  TECNOLOGICO: [
    "Computadoras",
    "Conexión a Internet",
    "Acceso a una red Wi-Fi",
    "Configuración de una VLAN",
    "Proyectores (Data show)",
    "Equipos de audio",
    "Cámaras para la transmisión",
  ],
  FISICO: ["Mesas", "Sillas", "Manteles", "Agua"],
  INSTITUCIONAL: [
    "Reserva de auditorios o aulas",
    "Invitación o coordinación con otros departamentos",
    "Participación de centros tecnológicos u otras instituciones",
  ],
};

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  TECNOLOGICO: "Tecnológico",
  FISICO: "Físico",
  INSTITUCIONAL: "Institucional",
};

function labelResourceCategory(category: string) {
  return RESOURCE_CATEGORY_LABELS[category] ?? category;
}

const emptyForm = {
  title: "",
  type: "CONFERENCIA",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  extraRequirements: "",
};

function resetFormState(
  setFormData: (value: typeof emptyForm) => void,
  setThumbnailUrl: (value: string) => void,
  setSelectedGuests: (value: string[]) => void,
  setGuestSearch: (value: string) => void,
  setSelectedResources: (value: { category: string; name: string }[]) => void
) {
  setFormData({ ...emptyForm });
  setThumbnailUrl("");
  setSelectedGuests([]);
  setGuestSearch("");
  setSelectedResources([]);
}

export const CreateEventForm = ({ guests }: CreateEventFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(emptyForm);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailPickerKey, setThumbnailPickerKey] = useState(0);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedResources, setSelectedResources] = useState<{ category: string; name: string }[]>([]);

  const filteredGuests = guests.filter((guest) => {
    const term = guestSearch.toLowerCase();
    return (
      guest.username.toLowerCase().includes(term) ||
      guest.firstName?.toLowerCase().includes(term) ||
      guest.lastName?.toLowerCase().includes(term) ||
      guest.studentId?.toLowerCase().includes(term) ||
      guest.career?.toLowerCase().includes(term)
    );
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuestToggle = (id: string) => {
    setSelectedGuests((prev) =>
      prev.includes(id) ? prev.filter((guestId) => guestId !== id) : [...prev, id]
    );
  };

  const toggleAllGuests = () => {
    if (selectedGuests.length === filteredGuests.length && filteredGuests.length > 0) {
      const filteredIds = filteredGuests.map((g) => g.id);
      setSelectedGuests((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const newIds = new Set(selectedGuests);
      filteredGuests.forEach((g) => newIds.add(g.id));
      setSelectedGuests(Array.from(newIds));
    }
  };

  const handleResourceToggle = (category: string, name: string) => {
    setSelectedResources((prev) => {
      const exists = prev.find((r) => r.category === category && r.name === name);
      if (exists) return prev.filter((r) => !(r.category === category && r.name === name));
      return [...prev, { category, name }];
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const eventDate = new Date(formData.date);
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
      const minStart = new Date(Date.now() + 10 * 60 * 1000);

      if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
        toast.error("Fecha u hora inválida.");
        return;
      }
      if (startDateTime < minStart) {
        toast.error("La fecha/hora debe tener al menos 10 minutos de anticipación.");
        return;
      }
      if (endDateTime <= startDateTime) {
        toast.error("La hora de finalización debe ser posterior a la de inicio.");
        return;
      }

      const resources: { category: string; name: string; quantity: number; details?: string }[] =
        selectedResources.map((r) => ({
          category: r.category,
          name: r.name,
          quantity: 1,
        }));

      if (formData.extraRequirements.trim()) {
        resources.push({
          category: "EXTRA",
          name: "Requisitos adicionales",
          quantity: 1,
          details: formData.extraRequirements,
        });
      }

      createEvent({
        title: formData.title,
        type: formData.type as EventType,
        description: formData.description,
        date: eventDate,
        startTime: startDateTime,
        endTime: endDateTime,
        location: formData.location,
        guestIds: selectedGuests,
        resources,
        thumbnailUrl: thumbnailUrl || null,
      })
        .then(() => {
          toast.success("¡Solicitud de evento enviada al Jefe de Departamento!");
          setFormData({
            title: "", type: "CONFERENCIA", description: "", date: "", startTime: "", endTime: "", location: "", extraRequirements: ""
          });
          setSelectedGuests([]);
          setSelectedResources([]);
          setThumbnailUrl("");
          setThumbnailPickerKey((current) => current + 1);
        })
        .catch((error) =>
          toast.error(error instanceof Error ? error.message : "Error al crear la solicitud")
        );
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-6 w-full max-w-4xl space-y-8 rounded-xl border bg-background p-8 shadow-sm"
    >
      <div className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-bold">1. Información general</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Título del evento *</label>
            <Input
              required
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej. Conferencia de Inteligencia Artificial"
              disabled={isPending}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Tipo de evento *</label>
            <select
              required
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={isPending}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
            >
              <option value="CONFERENCIA">Conferencia</option>
              <option value="TALLER">Taller</option>
              <option value="SIMPOSIO">Simposio</option>
              <option value="CONGRESO">Congreso</option>
              <option value="CAPACITACION">Capacitación</option>
              <option value="EXPOSICION">Exposición</option>
              <option value="RETROALIMENTACION">Retroalimentación</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Descripción del evento *</label>
          <Textarea
            required
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Propósito y contenido de la actividad"
            disabled={isPending}
            className="h-24 bg-muted/50"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-bold">2. Programación y lugar</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Fecha *</label>
            <Input
              required
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              disabled={isPending}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Hora de inicio *</label>
            <Input
              required
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              disabled={isPending}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Hora de finalización *</label>
            <Input
              required
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              disabled={isPending}
              className="bg-muted/50"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Puedes seleccionar el mismo día, con al menos 10 minutos de anticipación.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Lugar del evento *</label>
          <Input
            required
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Ej. Auditorio Principal"
            disabled={isPending}
            className="bg-muted/50"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-bold">3. Invitación de participantes</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar"
            className="bg-muted/50 pl-9"
            value={guestSearch}
            onChange={(e) => setGuestSearch(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="rounded-md border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {filteredGuests.length} estudiantes encontrados
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAllGuests}
              disabled={isPending || filteredGuests.length === 0}
            >
              {selectedGuests.length === filteredGuests.length && filteredGuests.length > 0
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </Button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-2">
            {filteredGuests.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No se encontraron estudiantes.
              </p>
            )}
            {filteredGuests.map((guest) => (
              <label
                key={guest.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
              >
                <div className="flex items-center gap-x-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedGuests.includes(guest.id)}
                    onChange={() => handleGuestToggle(guest.id)}
                    disabled={isPending}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {guest.firstName || guest.username} {guest.lastName || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {guest.career || "Estudiante"}
                      {guest.studentId ? ` • Carné: ${guest.studentId}` : ""}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="border-b pb-2 text-xl font-bold">4. Recursos y requisitos</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Object.entries(RESOURCE_OPTIONS).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">
                {labelResourceCategory(category)}
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-start gap-x-2 text-sm transition hover:text-primary"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-3.5 w-3.5 rounded border-gray-300"
                      checked={selectedResources.some(
                        (r) => r.category === category && r.name === item
                      )}
                      onChange={() => handleResourceToggle(category, item)}
                      disabled={isPending}
                    />
                    <span className="leading-tight">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2">
          <label className="text-sm font-semibold">Requisitos adicionales</label>
          <Textarea
            name="extraRequirements"
            value={formData.extraRequirements}
            onChange={handleChange}
            placeholder="Especificar cualquier otro requisito no listado"
            disabled={isPending}
            className="bg-muted/50"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">5. Miniatura del Evento</h2>
        <ThumbnailPicker
          key={thumbnailPickerKey}
          value={thumbnailUrl}
          disabled={isPending}
          onChange={setThumbnailUrl}
          onUploadingChange={setThumbnailUploading}
        />
      </div>

      <Button
        variant="default"
        size="lg"
        type="submit"
        disabled={isPending || thumbnailUploading}
        className="w-full text-base font-semibold shadow-md"
      >
        {isPending ? "Enviando solicitud..." : "Enviar solicitud de evento"}
      </Button>
    </form>
  );
};

function ThumbnailPicker({
  value,
  disabled,
  onChange,
  onUploadingChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const clear = () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview("");
    setFileName("");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setFileName(file.name);
    setUploading(true);
    onUploadingChange(true);
    try {
      const uploaded = await uploadFiles("eventImageUploader", { files: [file] });
      const url = uploaded[0]?.url;
      if (!url) throw new Error("No se recibió la imagen");
      onChange(url);
      toast.success("Imagen lista");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
      onChange("");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  };

  if (!preview) {
    return (
      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-muted/10 p-8 text-center transition hover:bg-muted/30">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Selecciona una imagen para la miniatura</span>
        <span className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Subir 1 archivo</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </label>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
        {/* blob: no puede pasar por el optimizador de next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Vista previa de la miniatura" className="h-full w-full object-cover" />
        <Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 z-10" onClick={clear} disabled={disabled || uploading} aria-label="Quitar imagen">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileImage className="h-4 w-4 shrink-0" />
        <span className="truncate">{fileName || "Imagen seleccionada"}</span>
        {uploading && <span className="shrink-0">Subiendo...</span>}
      </div>
    </div>
  );
}
