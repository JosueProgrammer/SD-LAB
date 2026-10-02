"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReportsPanel() {
  const [type, setType] = useState("users");
  const [period, setPeriod] = useState("month");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Genera e imprime reportes administrativos en PDF.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configurar reporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">Usuarios</SelectItem>
              <SelectItem value="events">Eventos registrados</SelectItem>
              <SelectItem value="activity">Actividad de la plataforma</SelectItem>
              <SelectItem value="stats">Estadísticas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="primary">
            <a href={`/api/reports?type=${type}&period=${period}`} target="_blank" rel="noreferrer">
              Exportar / Imprimir PDF
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
