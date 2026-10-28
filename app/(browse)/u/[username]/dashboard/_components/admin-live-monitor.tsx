"use client";

import { useEffect, useState, useTransition, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import {
  Activity,
  CalendarDays,
  Cpu,
  GraduationCap,
  HardDrive,
  Radio,
  UserRound,
  Users,
  Wifi,
  Gauge,
} from "lucide-react";
import { getAdminLiveMetrics, type AdminLiveMetrics } from "@/actions/admin-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatKey = "users" | "jefes" | "docentes" | "invitados" | "eventos";

type StatItem = {
  key: StatKey;
  label: string;
  value: number;
};

const statIcons: Record<StatKey, ComponentType<{ className?: string }>> = {
  users: Users,
  jefes: UserRound,
  docentes: GraduationCap,
  invitados: Users,
  eventos: CalendarDays,
};

function levelColor(level: "ok" | "warn" | "crit" | null | undefined) {
  if (level === "crit") return "text-red-500 border-red-500/40 bg-red-500/10";
  if (level === "warn") return "text-amber-500 border-amber-500/40 bg-amber-500/10";
  if (level === "ok") return "text-emerald-500 border-emerald-500/40 bg-emerald-500/10";
  return "text-muted-foreground border-border bg-muted/40";
}

function levelLabel(level: "ok" | "warn" | "crit" | null | undefined, kind: "cpu" | "ram" | "latency") {
  if (!level) return "Sin datos";
  if (kind === "latency") {
    if (level === "ok") return "Buena (<8s)";
    if (level === "warn") return "Aceptable (8–15s)";
    return "Atrasada (>15s)";
  }
  if (level === "ok") return "Normal (<70%)";
  if (level === "warn") return "Atención (70–85%)";
  return "Alerta (≥85%)";
}

function formatBytes(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(0)} MB`;
}

function qualityClass(q: string) {
  if (q === "Alta") return "text-emerald-500";
  if (q === "Baja") return "text-red-500";
  return "text-amber-500";
}

interface AdminLiveMonitorProps {
  initialStats: StatItem[];
}

export function AdminLiveMonitor({ initialStats }: AdminLiveMonitorProps) {
  const [metrics, setMetrics] = useState<AdminLiveMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      startTransition(async () => {
        try {
          const next = await getAdminLiveMetrics();
          if (!cancelled) {
            setMetrics(next);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas");
          }
        }
      });
    };

    tick();
    const timer = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const chartData =
    metrics?.history.map((sample) => ({
      time: format(new Date(sample.at), "HH:mm:ss"),
      cpu: sample.cpuPercent,
      ram: sample.ramPercent,
    })) ?? [];

  const latencyChart =
    metrics?.latencyHistory.map((sample) => ({
      time: format(new Date(sample.at), "HH:mm:ss"),
      latency: sample.avgLatencySec,
    })) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard administrativo</h1>
        <p className="text-muted-foreground">
          Comportamiento de la plataforma y monitoreo en vivo de transmisiones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialStats.map((item) => {
          const Icon = statIcons[item.key] ?? Users;
          return (
            <Card key={item.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="py-4 text-sm text-red-500">{error}</CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Salud del servidor</h2>
          <p className="text-sm text-muted-foreground">
            CPU del proceso Node y RAM de la máquina. Actualización cada 5 s.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" /> CPU del proceso
              </CardTitle>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  levelColor(metrics?.cpu.level)
                )}
              >
                {levelLabel(metrics?.cpu.level, "cpu")}
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics ? `${metrics.cpu.percent}%` : "—"}</div>
              <p className="mt-1 text-xs text-muted-foreground">process.cpuUsage()</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" /> RAM máquina
              </CardTitle>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  levelColor(metrics?.ram.level)
                )}
              >
                {levelLabel(metrics?.ram.level, "ram")}
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics ? `${metrics.ram.machinePercent}%` : "—"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics
                  ? `${formatBytes(metrics.ram.machineUsedBytes)} / ${formatBytes(metrics.ram.machineTotalBytes)}`
                  : "os.totalmem / freemem"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Proceso Next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">RSS</span>
                <span className="font-medium">
                  {metrics ? formatBytes(metrics.ram.processRssBytes) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heap usado</span>
                <span className="font-medium">
                  {metrics ? formatBytes(metrics.ram.processHeapUsedBytes) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">CPU % (histórico)</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU %"
                    stroke="#3b82f6"
                    fill="#3b82f633"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">RAM máquina % (histórico)</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    name="RAM %"
                    stroke="#10b981"
                    fill="#10b98133"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Latencia de video</h2>
          <p className="text-sm text-muted-foreground">
            Promedio de retraso HLS reportado por espectadores (pulso cada 8 s).
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Latencia media
              </CardTitle>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  levelColor(metrics?.latencyLevel)
                )}
              >
                {levelLabel(metrics?.latencyLevel, "latency")}
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics?.avgLatencySec != null ? `${metrics.avgLatencySec}s` : "—"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Promedio de salas en vivo</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Latencia (histórico)</CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    name="Latencia s"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Transmisiones en vivo</h2>
          <p className="text-sm text-muted-foreground">
            Eventos LIVE, OBS, MediaMTX, espectadores, latencia y calidad.
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Evento</th>
                    <th className="px-4 py-3 font-medium">OBS</th>
                    <th className="px-4 py-3 font-medium">MediaMTX</th>
                    <th className="px-4 py-3 font-medium">Espectadores</th>
                    <th className="px-4 py-3 font-medium">Latencia</th>
                    <th className="px-4 py-3 font-medium">Calidad</th>
                    <th className="px-4 py-3 font-medium">Señal</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics?.transmissions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No hay transmisiones en vivo ahora.
                      </td>
                    </tr>
                  )}
                  {metrics?.transmissions.map((row) => (
                    <tr key={row.eventId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.title}</div>
                        <div className="text-xs text-muted-foreground">@{row.creatorUsername}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                            row.obsConnected
                              ? "border-emerald-500/40 text-emerald-500"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          <Radio className="h-3 w-3" />
                          {row.obsConnected ? "Conectado" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            row.mtxReady ? "text-emerald-500" : "text-muted-foreground"
                          )}
                        >
                          {row.mtxReady ? "Ready" : "Offline"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.viewers}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            levelColor(row.latencyLevel)
                          )}
                        >
                          {row.avgLatencySec != null ? `${row.avgLatencySec}s` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 font-medium", qualityClass(row.quality))}>
                          <Gauge className="h-3.5 w-3.5" />
                          {row.quality}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{row.resolutionLabel}</div>
                        <div>{row.bitrateKbps != null ? `${row.bitrateKbps} kbps` : "bitrate —"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
