"use server";

import { Role, User } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSelf, requireRole } from "@/lib/auth-service";
import { db } from "@/lib/db";
import { firebaseAdminAuth } from "@/lib/firebase-admin";

function usernameFrom(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "usuario";
}

async function uniqueUsername(preferred: string) {
  const base = usernameFrom(preferred);
  let candidate = base;
  let suffix = 1;
  while (await db.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base.slice(0, 16)}${suffix++}`;
  }
  return candidate;
}

function canManageRole(actorRole: Role, targetRole: Role) {
  if (actorRole === "ADMIN") return true;
  if (actorRole === "JEFE_DEPARTAMENTO") {
    return targetRole === "DOCENTE" || targetRole === "INVITADO";
  }
  return false;
}

export async function updateUser(values: Partial<User>) {
  const self = await getSelf();
  const user = await db.user.update({
    where: { id: self.id },
    data: { bio: values.bio },
  });
  revalidatePath(`/${self.username}`);
  revalidatePath(`/u/${self.username}`);
  return user;
}

export async function listUsers(filters?: { role?: Role; isActive?: boolean; search?: string }) {
  const self = await requireRole("ADMIN", "JEFE_DEPARTAMENTO");
  const roleFilter =
    self.role === "JEFE_DEPARTAMENTO"
      ? filters?.role && (filters.role === "DOCENTE" || filters.role === "INVITADO")
        ? filters.role
        : { in: ["DOCENTE", "INVITADO"] as Role[] }
      : filters?.role;

  return db.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(typeof filters?.isActive === "boolean" ? { isActive: filters.isActive } : {}),
      ...(filters?.search
        ? {
            OR: [
              { username: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
              { firstName: { contains: filters.search, mode: "insensitive" } },
              { lastName: { contains: filters.search, mode: "insensitive" } },
              { studentId: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      studentId: true,
      career: true,
      imageUrl: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { createdEvents: true, participations: true } },
    },
  });
}

export async function createManagedUser(input: {
  email: string;
  password: string;
  role: Role;
  username?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  career?: string;
}) {
  const self = await requireRole("ADMIN", "JEFE_DEPARTAMENTO");
  if (!canManageRole(self.role, input.role)) {
    throw new Error("No puedes crear usuarios con ese rol");
  }

  const username = await uniqueUsername(
    input.username || `${input.firstName || ""}${input.lastName || ""}` || input.email.split("@")[0] || "usuario"
  );

  const auth = firebaseAdminAuth();
  const firebaseUser = await auth.createUser({
    email: input.email,
    password: input.password,
    displayName: `${input.firstName || ""} ${input.lastName || ""}`.trim() || username,
  });

  try {
    const user = await db.user.create({
      data: {
        externalUserId: firebaseUser.uid,
        username,
        email: input.email,
        role: input.role,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        studentId: input.studentId || null,
        career: input.career || null,
        imageUrl: "",
        isActive: true,
        stream: { create: { name: `Streams de ${username}` } },
      },
    });
    revalidatePath(`/u/${self.username}/usuarios`);
    revalidatePath(`/u/${self.username}/docentes`);
    revalidatePath(`/u/${self.username}/invitados`);
    return user;
  } catch (error) {
    await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
    throw error;
  }
}

export async function updateManagedUser(
  userId: string,
  input: {
    role?: Role;
    firstName?: string;
    lastName?: string;
    studentId?: string;
    career?: string;
    email?: string;
    isActive?: boolean;
  }
) {
  const self = await requireRole("ADMIN", "JEFE_DEPARTAMENTO");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Usuario no encontrado");
  if (!canManageRole(self.role, target.role)) throw new Error("No puedes gestionar este usuario");
  if (input.role && !canManageRole(self.role, input.role)) {
    throw new Error("No puedes asignar ese rol");
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.studentId !== undefined ? { studentId: input.studentId } : {}),
      ...(input.career !== undefined ? { career: input.career } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });

  if (input.email && input.email !== target.email) {
    await firebaseAdminAuth().updateUser(target.externalUserId, { email: input.email }).catch(() => undefined);
  }
  if (typeof input.isActive === "boolean") {
    await firebaseAdminAuth().updateUser(target.externalUserId, { disabled: !input.isActive }).catch(() => undefined);
  }

  revalidatePath(`/u/${self.username}/usuarios`);
  revalidatePath(`/u/${self.username}/docentes`);
  revalidatePath(`/u/${self.username}/invitados`);
  return user;
}

export async function deleteManagedUser(userId: string) {
  const self = await requireRole("ADMIN", "JEFE_DEPARTAMENTO");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Usuario no encontrado");
  if (!canManageRole(self.role, target.role)) throw new Error("No puedes eliminar este usuario");
  if (target.id === self.id) throw new Error("No puedes eliminar tu propia cuenta");

  await db.user.delete({ where: { id: userId } });
  await firebaseAdminAuth().deleteUser(target.externalUserId).catch(() => undefined);

  revalidatePath(`/u/${self.username}/usuarios`);
  revalidatePath(`/u/${self.username}/docentes`);
  revalidatePath(`/u/${self.username}/invitados`);
}
