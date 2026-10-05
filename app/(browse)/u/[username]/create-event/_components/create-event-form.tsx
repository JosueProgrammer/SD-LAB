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
  FISICO: [
    "Mesas",
    "Sillas",
    "Manteles",
    "Agua",
  ],
  INSTITUCIONAL: [
    "Reserva de auditorios o aulas",
    "Invitación o coordinación con otros departamentos",
    "Participación de centros tecnológicos u otras instituciones",
  ]
};

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
    extraRequirements: "",
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      // Unselect all filtered
      const filteredIds = filteredGuests.map(g => g.id);
      setSelectedGuests(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      const newIds = new Set(selectedGuests);
      filteredGuests.forEach(g => newIds.add(g.id));
      setSelectedGuests(Array.from(newIds));
    }
  };

  const handleResourceToggle = (category: string, name: string) => {
    setSelectedResources((prev) => {
      const exists = prev.find(r => r.category === category && r.name === name);
      if (exists) {
        return prev.filter(r => !(r.category === category && r.name === name));
      }
      return [...prev, { category, name }];
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const eventDate = new Date(formData.date);
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      // Validate date
      const now = new Date();
      if (eventDate < new Date(now.toDateString())) {
        toast.error("La fecha del evento no puede ser en el pasado.");
        return;
      }
      if (startDateTime < now) {
         toast.error("La hora de inicio no puede ser en el pasado.");
         return;
      }
      if (endDateTime <= startDateTime) {
         toast.error("La hora de finalización debe ser posterior a la de inicio.");
         return;
      }

      const resources: { category: string; name: string; quantity: number; details?: string }[] = selectedResources.map(r => ({
        category: r.category,
        name: r.name,
        quantity: 1
      }));

      if (formData.extraRequirements.trim()) {
        resources.push({
          category: "EXTRA",
          name: "Requisitos adicionales",
          quantity: 1,
          details: formData.extraRequirements
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
        .catch(() => toast.error("Error al crear la solicitud de evento"));
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8 bg-background border rounded-xl p-8 w-full max-w-4xl mx-auto mt-6 shadow-sm">
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">1. Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Título del evento *</label>
            <Input required name="title" value={formData.title} onChange={handleChange} placeholder="Ej. Conferencia de Inteligencia Artificial" disabled={isPending} className="bg-muted/50" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Tipo de evento *</label>
            <select required name="type" value={formData.type} onChange={handleChange} disabled={isPending} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
          <Textarea required name="description" value={formData.description} onChange={handleChange} placeholder="Propósito y contenido de la actividad" disabled={isPending} className="bg-muted/50 h-24" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">2. Programación y Lugar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Fecha *</label>
            <Input required type="date" name="date" value={formData.date} onChange={handleChange} disabled={isPending} className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Hora de inicio *</label>
            <Input required type="time" name="startTime" value={formData.startTime} onChange={handleChange} disabled={isPending} className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Hora de finalización *</label>
            <Input required type="time" name="endTime" value={formData.endTime} onChange={handleChange} disabled={isPending} className="bg-muted/50" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Lugar del evento *</label>
          <Input required name="location" value={formData.location} onChange={handleChange} placeholder="Ej. Auditorio Principal" disabled={isPending} className="bg-muted/50" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">3. Invitación de Participantes</h2>
        <div className="relative">
           <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="Buscar por nombre, apellidos, carné o carrera..." 
             className="pl-9 bg-muted/50" 
             value={guestSearch}
             onChange={(e) => setGuestSearch(e.target.value)}
             disabled={isPending}
           />
        </div>
        <div className="border rounded-md p-4 bg-muted/20">
          <div className="flex justify-between items-center mb-3">
             <span className="text-sm font-medium text-muted-foreground">{filteredGuests.length} estudiantes encontrados</span>
             <Button type="button" variant="outline" size="sm" onClick={toggleAllGuests} disabled={isPending || filteredGuests.length === 0}>
                {selectedGuests.length === filteredGuests.length && filteredGuests.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
             </Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {filteredGuests.length === 0 && <p className="text-sm text-center py-4 text-muted-foreground">No se encontraron estudiantes.</p>}
              {filteredGuests.map((guest) => (
                  <label key={guest.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition">
                     <div className="flex items-center gap-x-3">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedGuests.includes(guest.id)}
                            onChange={() => handleGuestToggle(guest.id)}
                            disabled={isPending}
                        />
                        <div>
                           <p className="font-medium text-sm">{guest.firstName || guest.username} {guest.lastName || ""}</p>
                           <p className="text-xs text-muted-foreground">{guest.career || "Estudiante"} {guest.studentId ? `• Carné: ${guest.studentId}` : ""}</p>
                        </div>
                     </div>
                  </label>
              ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">4. Recursos y Requisitos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(RESOURCE_OPTIONS).map(([category, items]) => (
            <div key={category} className="space-y-3">
               <h3 className="font-semibold text-sm text-primary">{category.charAt(0) + category.slice(1).toLowerCase()}</h3>
               <div className="space-y-2">
                 {items.map(item => (
                    <label key={item} className="flex items-start gap-x-2 text-sm cursor-pointer hover:text-primary transition">
                       <input 
                         type="checkbox" 
                         className="mt-1 h-3.5 w-3.5 rounded border-gray-300"
                         checked={selectedResources.some(r => r.category === category && r.name === item)}
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
          <Textarea name="extraRequirements" value={formData.extraRequirements} onChange={handleChange} placeholder="Especificar cualquier otro requisito no listado" disabled={isPending} className="bg-muted/50" />
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

      <Button variant="default" size="lg" type="submit" disabled={isPending || thumbnailUploading} className="w-full text-base font-semibold shadow-md">
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
