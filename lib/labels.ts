import { EventStatus, EventType, InvitationStatus, Role } from "@prisma/client";

export const eventStatusLabels: Record<EventStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  LIVE: "En vivo",
  FINISHED: "Finalizado",
};

export const eventTypeLabels: Record<EventType, string> = {
  CONFERENCIA: "Conferencia",
  TALLER: "Taller",
  SIMPOSIO: "Simposio",
  CONGRESO: "Congreso",
  CAPACITACION: "Capacitación",
  EXPOSICION: "Exposición",
  RETROALIMENTACION: "Retroalimentación",
};

export const invitationStatusLabels: Record<InvitationStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Confirmado",
  REJECTED: "Rechazado",
};

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  JEFE_DEPARTAMENTO: "Jefe de departamento",
  DOCENTE: "Docente",
  INVITADO: "Invitado",
};

export const resourceCategoryLabels: Record<string, string> = {
  TECNOLOGICO: "Tecnológico",
  FISICO: "Físico",
  INSTITUCIONAL: "Institucional",
  EXTRA: "Extra",
};

export function labelEventStatus(status: string) {
  return eventStatusLabels[status as EventStatus] || status;
}

export function labelEventType(type: string) {
  return eventTypeLabels[type as EventType] || type;
}

export function labelResourceCategory(category: string) {
  return resourceCategoryLabels[category] || category;
}
