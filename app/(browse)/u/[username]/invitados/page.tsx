import { requireRole } from "@/lib/auth-service";
import { listUsers } from "@/actions/user";
import { UsersManager } from "@/components/users/users-manager";

export default async function InvitadosPage() {
  await requireRole("JEFE_DEPARTAMENTO", "ADMIN");
  const users = await listUsers({ role: "INVITADO" });
  return (
    <UsersManager
      users={users}
      allowedRoles={["INVITADO", "DOCENTE"]}
      title="Gestión de invitados"
    />
  );
}
