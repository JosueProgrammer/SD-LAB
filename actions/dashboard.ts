"use server";

import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";

export async function getDashboardStats() {
  const self = await getSelf();
  if (!self) throw new Error("No autenticado");

  if (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO") {
    throw new Error("No tienes permisos para ver el dashboard");
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Usuarios registrados en los últimos 30 días
  const newUsersCount = await db.user.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      }
    }
  });

  // Usuarios conectados desde que se creó la cuenta del docente (o en tiempo real si implementamos websockets/SSE, pero por ahora usando lastLoginAt)
  const connectedUsersCount = await db.user.count({
    where: {
      lastLoginAt: {
        gte: self.createdAt
      }
    }
  });

  return {
    newUsersCount,
    connectedUsersCount
  };
}
