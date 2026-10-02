import { requireRole } from "@/lib/auth-service";
import { listUsers } from "@/actions/user";
import { UsersManager } from "@/components/users/users-manager";

export default async function UsuariosPage() {
  await requireRole("ADMIN");
  const users = await listUsers();
  return (
    <UsersManager
      users={users}
      allowedRoles={["ADMIN", "JEFE_DEPARTAMENTO", "DOCENTE", "INVITADO"]}
      title="Gestión de usuarios"
    />
  );
}
