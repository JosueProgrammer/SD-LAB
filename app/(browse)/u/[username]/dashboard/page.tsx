import { getDashboardStats } from "@/actions/dashboard";
import { getSelf, requireRole } from "@/lib/auth-service";
import { getAdminDashboardStats } from "@/lib/event-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, GraduationCap, UserRound, CalendarDays } from "lucide-react";

export default async function DashboardPage() {
  const self = await getSelf();
  if (!self || (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO")) {
    return <div className="p-6">No tienes permisos para ver el dashboard.</div>;
  }

  if (self.role === "ADMIN") {
    await requireRole("ADMIN");
    const stats = await getAdminDashboardStats();
    const items = [
      { label: "Usuarios registrados", value: stats.totalUsers, icon: Users },
      { label: "Jefes registrados", value: stats.jefes, icon: UserRound },
      { label: "Docentes registrados", value: stats.docentes, icon: GraduationCap },
      { label: "Invitados registrados", value: stats.invitados, icon: Users },
      { label: "Eventos creados", value: stats.events, icon: CalendarDays },
    ];
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard administrativo</h1>
          <p className="text-muted-foreground">Comportamiento general de la plataforma.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { newUsersCount, connectedUsersCount } = await getDashboardStats();

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground">
          Bienvenido a tu resumen de actividad, {self.username}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Registrados (30 días)</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{newUsersCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Usuarios nuevos en la plataforma</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Conectados</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{connectedUsersCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Desde la creación de tu cuenta</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
