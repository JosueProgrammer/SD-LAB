"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState, useTransition, useRef, ElementRef } from "react";
import { createIntegress } from "@/actions/ingress";
import { toast } from "sonner";

export function ConnectModal() {
  const closeRef = useRef<ElementRef<"button">>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    startTransition(() => {
      createIntegress()
        .then(() => {
          toast.success("Credenciales OBS (RTMP) generadas");
          closeRef?.current?.click();
        })
        .catch(() => toast.error("No se pudieron generar las credenciales"));
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Generar conexión OBS</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar conexión OBS (RTMP)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Se creará una URL RTMP y una clave para configurar OBS Studio (Servicio → Personalizado).
        </p>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Aviso</AlertTitle>
          <AlertDescription>
            Esta acción reemplaza la clave activa anterior de tu canal.
          </AlertDescription>
        </Alert>
        <div className="flex justify-between">
          <DialogClose ref={closeRef} asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button disabled={isPending} onClick={onSubmit} variant="primary">
            Generar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
