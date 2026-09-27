import { getDashboardStats } from "@/actions/dashboard";
import { getSelf } from "@/lib/auth-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity } from "lucide-react";

export default async function DashboardPage() {
  const self = await getSelf();
  if (!self || (self.role !== "DOCENTE" && self.role !== "ADMIN" && self.role !== "JEFE_DEPARTAMENTO")) {
    return <div>No tienes permisos para ver el dashboard.</div>;
  }

  const { newUsersCount, connectedUsersCount } = await getDashboardStats();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
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
            <p className="text-xs text-muted-foreground mt-1">
              Usuarios nuevos en la plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Conectados</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{connectedUsersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Desde la creación de tu cuenta
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Espacio para futuros gráficos o tablas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 flex justify-center items-center h-[250px] text-muted-foreground">
            El gráfico de actividad estará disponible pronto.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
