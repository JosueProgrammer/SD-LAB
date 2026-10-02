import { requireRole } from "@/lib/auth-service";
import { getPlatformStatistics } from "@/lib/event-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole("ADMIN");
  const { period } = await searchParams;
  const selected = period === "week" ? "week" : "month";
  const from = new Date();
  if (selected === "week") from.setDate(from.getDate() - 7);
  else from.setMonth(from.getMonth() - 1);

  const stats = await getPlatformStatistics(from);
  const max = Math.max(stats.users, stats.events, stats.participants, 1);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground">Indicadores de comportamiento de la plataforma.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant={selected === "week" ? "primary" : "outline"}>
            <Link href="?period=week">Semana</Link>
          </Button>
          <Button asChild variant={selected === "month" ? "primary" : "outline"}>
            <Link href="?period=month">Mes</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Usuarios registrados</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{stats.users}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Eventos creados</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{stats.events}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Participantes registrados</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{stats.participants}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Comparativa del período</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Usuarios", value: stats.users },
            { label: "Eventos", value: stats.events },
            { label: "Participantes", value: stats.participants },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
