"use client";

import { FormEvent, useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { createManagedUser, deleteManagedUser, updateManagedUser } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ManagedUserRow = {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  studentId: string | null;
  career: string | null;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count: { createdEvents: number; participations: number };
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  JEFE_DEPARTAMENTO: "Jefe de departamento",
  DOCENTE: "Docente",
  INVITADO: "Invitado",
};

export function UsersManager({
  users,
  allowedRoles,
  title,
}: {
  users: ManagedUserRow[];
  allowedRoles: Role[];
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [createRole, setCreateRole] = useState<Role>(allowedRoles[0]);

  const filtered = users.filter((user) => {
    if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
    if (statusFilter === "ACTIVE" && !user.isActive) return false;
    if (statusFilter === "INACTIVE" && user.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [user.username, user.email, user.firstName, user.lastName, user.studentId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await createManagedUser({
          email: String(form.get("email")),
          password: String(form.get("password")),
          role: createRole,
          username: String(form.get("username") || ""),
          firstName: String(form.get("firstName") || ""),
          lastName: String(form.get("lastName") || ""),
          studentId: String(form.get("studentId") || ""),
          career: String(form.get("career") || ""),
        });
        toast.success("Usuario creado");
        event.currentTarget.reset();
        setCreateRole(allowedRoles[0]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">Crear, consultar, actualizar y desactivar cuentas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
            <Input name="firstName" placeholder="Nombre" />
            <Input name="lastName" placeholder="Apellido" />
            <Input name="username" placeholder="Usuario (opcional)" />
            <Input name="email" type="email" placeholder="Correo" required />
            <Input name="password" type="password" placeholder="Contraseña temporal" required minLength={6} />
            <Select value={createRole} onValueChange={(value) => setCreateRole(value as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="studentId" placeholder="Identificación institucional" />
            <Input name="career" placeholder="Carrera" />
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" disabled={pending}>
                Crear usuario
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row">
        <Input
          placeholder="Buscar por nombre, correo o carné"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="md:w-56">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los roles</SelectItem>
            {allowedRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabels[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="INACTIVE">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">
                  {user.firstName || user.lastName
                    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                    : user.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{user.username} · {user.email || "Sin correo"} · {roleLabels[user.role]} ·{" "}
                  {user.isActive ? "Activo" : "Inactivo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Eventos: {user._count.createdEvents} · Participaciones: {user._count.participations}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedRoles.length > 1 && (
                  <Select
                    defaultValue={user.role}
                    onValueChange={(role) =>
                      startTransition(async () => {
                        try {
                          await updateManagedUser(user.id, { role: role as Role });
                          toast.success("Rol actualizado");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Error");
                        }
                      })
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await updateManagedUser(user.id, { isActive: !user.isActive });
                        toast.success(user.isActive ? "Usuario desactivado" : "Usuario activado");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Error");
                      }
                    })
                  }
                >
                  {user.isActive ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteManagedUser(user.id);
                        toast.success("Usuario eliminado");
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
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No hay usuarios con esos filtros.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
