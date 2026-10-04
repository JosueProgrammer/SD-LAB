"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { approveEvent, rejectEvent, deleteEvent, updateEvent } from "@/actions/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/lib/uploadthing";
import { downloadEventPdf } from "@/lib/download-event-pdf";
import { eventTypeLabels, labelEventType, labelResourceCategory } from "@/lib/labels";
import Image from "next/image";
import { Search, X } from "lucide-react";

type RequestItem = {
  id: string;
  title: string;
  type: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location: string;
  status: string;
  thumbnailUrl?: string | null;
  creator: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  resources: { id: string; category: string; name: string; quantity: number; details: string | null }[];
  participants?: { userId: string; user: { id: string; username: string; firstName: string | null; lastName: string | null } }[];
  _count: { participants: number };
};

type Teacher = { id: string; username: string; firstName: string | null; lastName: string | null };
type Guest = {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  studentId?: string | null;
  career?: string | null;
};

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

function toLocalDate(value: Date) {
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function toLocalTime(value: Date) {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function teacherName(teacher: Teacher) {
  return `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim() || teacher.username;
}

export function RequestsManager({
  requests,
  teachers,
  guests,
}: {
  requests: RequestItem[];
  teachers: Teacher[];
  guests: Guest[];
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState("");

  const editingRequest = useMemo(
    () => requests.find((item) => item.id === editingId) || null,
    [editingId, requests]
  );

  const [draft, setDraft] = useState({
    title: "",
    type: "CONFERENCIA",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    thumbnailUrl: "" as string | null,
    guestIds: [] as string[],
    resources: [] as { category: string; name: string }[],
    extraRequirements: "",
  });

  function beginEdit(request: RequestItem) {
    const extra = request.resources.find((r) => r.category === "EXTRA");
    setEditingId(request.id);
    setGuestSearch("");
    setDraft({
      title: request.title,
      type: request.type,
      description: request.description,
      date: toLocalDate(request.date),
      startTime: toLocalTime(request.startTime),
      endTime: toLocalTime(request.endTime),
      location: request.location,
      thumbnailUrl: request.thumbnailUrl || "",
      guestIds: request.participants?.map((p) => p.userId) || [],
      resources: request.resources
        .filter((r) => r.category !== "EXTRA")
        .map((r) => ({ category: r.category, name: r.name })),
      extraRequirements: extra?.details || "",
    });
  }

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

  function saveEdit(requestId: string) {
    startTransition(async () => {
      try {
        const startTime = new Date(`${draft.date}T${draft.startTime}`);
        const endTime = new Date(`${draft.date}T${draft.endTime}`);
        const resources: {
          category: string;
          name: string;
          quantity: number;
          details?: string;
        }[] = draft.resources.map((r) => ({
          category: r.category,
          name: r.name,
          quantity: 1,
        }));
        if (draft.extraRequirements.trim()) {
          resources.push({
            category: "EXTRA",
            name: "Requisitos adicionales",
            quantity: 1,
            details: draft.extraRequirements,
          });
        }

        await updateEvent(requestId, {
          title: draft.title,
          type: draft.type as never,
          description: draft.description,
          date: new Date(draft.date),
          startTime,
          endTime,
          location: draft.location,
          thumbnailUrl: draft.thumbnailUrl || null,
          guestIds: draft.guestIds,
          resources,
        });
        toast.success("Solicitud actualizada");
        setEditingId(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de solicitudes</h1>
      </div>
      <div className="space-y-4">
        {requests.map((request) => {
          const isEditing = editingId === request.id;
          return (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle className="text-lg">{request.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p>
                        Docente:{" "}
                        {`${request.creator.firstName ?? ""} ${request.creator.lastName ?? ""}`.trim() ||
                          request.creator.username}
                      </p>
                      <p>Tipo: {labelEventType(request.type)}</p>
                      <p>
                        Fecha:{" "}
                        {new Intl.DateTimeFormat("es-NI", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(request.startTime)}
                      </p>
                      <p>Lugar: {request.location}</p>
                      <p>Invitados: {request._count.participants}</p>
                    </div>
                    <p className="text-sm">{request.description}</p>
                    {request.resources.length > 0 && (
                      <div className="rounded-md border p-3 text-sm">
                        <p className="mb-2 font-medium">Recursos</p>
                        <ul className="space-y-1 text-muted-foreground">
                          {request.resources.map((resource) => (
                            <li key={resource.id}>
                              {labelResourceCategory(resource.category)}: {resource.name} ×{" "}
                              {resource.quantity}
                              {resource.details ? ` (${resource.details})` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={draft.title}
                        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Título"
                      />
                      <select
                        value={draft.type}
                        onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      >
                        {Object.entries(eventTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="time"
                          value={draft.startTime}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, startTime: e.target.value }))
                          }
                        />
                        <Input
                          type="time"
                          value={draft.endTime}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, endTime: e.target.value }))
                          }
                        />
                      </div>
                      <Input
                        className="md:col-span-2"
                        value={draft.location}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, location: e.target.value }))
                        }
                        placeholder="Lugar"
                      />
                    </div>
                    <Textarea
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Descripción"
                    />

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Equipos</p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {Object.entries(RESOURCE_OPTIONS).map(([category, items]) => (
                          <div key={category} className="space-y-2 rounded-md border p-3">
                            <p className="text-xs font-semibold">
                              {labelResourceCategory(category)}
                            </p>
                            {items.map((item) => {
                              const checked = draft.resources.some(
                                (r) => r.category === category && r.name === item
                              );
                              return (
                                <label key={item} className="flex items-start gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setDraft((prev) => ({
                                        ...prev,
                                        resources: checked
                                          ? prev.resources.filter(
                                              (r) => !(r.category === category && r.name === item)
                                            )
                                          : [...prev.resources, { category, name: item }],
                                      }))
                                    }
                                  />
                                  <span>{item}</span>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      <Textarea
                        value={draft.extraRequirements}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, extraRequirements: e.target.value }))
                        }
                        placeholder="Requisitos adicionales"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Invitados</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar"
                          className="pl-9"
                          value={guestSearch}
                          onChange={(e) => setGuestSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                        {filteredGuests.map((guest) => {
                          const checked = draft.guestIds.includes(guest.id);
                          return (
                            <label key={guest.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    guestIds: checked
                                      ? prev.guestIds.filter((id) => id !== guest.id)
                                      : [...prev.guestIds, guest.id],
                                  }))
                                }
                              />
                              <span>
                                {`${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim() ||
                                  guest.username}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Miniatura</p>
                      {draft.thumbnailUrl ? (
                        <div className="relative aspect-video overflow-hidden rounded-xl border">
                          <Image
                            src={draft.thumbnailUrl}
                            alt="Miniatura"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute right-2 top-2"
                            onClick={() => setDraft((prev) => ({ ...prev, thumbnailUrl: "" }))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <UploadDropzone
                          endpoint="eventImageUploader"
                          onClientUploadComplete={(res) => {
                            const url =
                              res?.[0]?.ufsUrl || res?.[0]?.url || res?.[0]?.serverData?.fileUrl;
                            if (!url) {
                              toast.error("No se pudo obtener la URL de la imagen");
                              return;
                            }
                            setDraft((prev) => ({ ...prev, thumbnailUrl: url }));
                            toast.success("Imagen actualizada");
                          }}
                          onUploadError={(error: Error) => {
                            toast.error(`Error al subir imagen: ${error.message}`);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    onValueChange={(creatorId) =>
                      startTransition(async () => {
                        try {
                          await updateEvent(request.id, { creatorId });
                          toast.success("Docente actualizado");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Error");
                        }
                      })
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Cambiar docente" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers
                        .filter((teacher) => teacher.id !== request.creator.id)
                        .map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacherName(teacher)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {!isEditing ? (
                    <Button variant="secondary" onClick={() => beginEdit(request)}>
                      Modificar
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        disabled={pending}
                        onClick={() => saveEdit(request.id)}
                      >
                        Guardar cambios
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </>
                  )}

                  <Button
                    variant="primary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await approveEvent(request.id);
                          toast.success("Solicitud aprobada");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Error");
                        }
                      })
                    }
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await rejectEvent(request.id);
                          toast.success("Solicitud rechazada");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Error");
                        }
                      })
                    }
                  >
                    Rechazar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      downloadEventPdf({
                        title: request.title,
                        type: request.type,
                        description: request.description,
                        date: request.date,
                        startTime: request.startTime,
                        endTime: request.endTime,
                        location: request.location,
                        creatorName:
                          `${request.creator.firstName ?? ""} ${request.creator.lastName ?? ""}`.trim() ||
                          request.creator.username,
                        resources: request.resources,
                      })
                    }
                  >
                    Descargar PDF
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await deleteEvent(request.id);
                          toast.success("Solicitud eliminada");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Error");
                        }
                      })
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {requests.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No hay solicitudes pendientes.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
