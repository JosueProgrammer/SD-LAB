import { requireRole } from "@/lib/auth-service";
import { listUsers } from "@/actions/user";
import { UsersManager } from "@/components/users/users-manager";

export default async function DocentesPage() {
  await requireRole("JEFE_DEPARTAMENTO", "ADMIN");
  const users = await listUsers({ role: "DOCENTE" });
  return <UsersManager users={users} allowedRoles={["DOCENTE"]} title="Gestión de docentes" />;
}
