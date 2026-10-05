"use client";

import { useEffect, useState, useTransition } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { Cast, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createViewerToken } from "@/actions/token";
import { createEventObsIngress, syncEventObsStatus, type ObsLink } from "@/actions/obs";
import { Video } from "@/components/stream-player/Video";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ObsTransmitButtonProps {
  eventId: string;
  hostId: string;
  serverUrl: string | null;
  streamKey: string | null;
  obsConnected: boolean;
}

const labels = {
  CONNECTED: "OBS Conectado",
  BUFFERING: "Conectando OBS",
  DISCONNECTED: "Desconectado",
} as const;

export function ObsTransmitButton({
  eventId,
  hostId,
  serverUrl,
  streamKey,
  obsConnected,
}: ObsTransmitButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<ObsLink>({
    serverUrl,
    streamKey,
    status: obsConnected ? "CONNECTED" : "DISCONNECTED",
    connected: obsConnected,
  });
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "key" | null>(null);

  const hasKey = Boolean(link.streamKey);

  useEffect(() => {
    if (!open && !hasKey) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const next = await syncEventObsStatus(eventId);
        if (!cancelled) {
          setLink((current) => ({
            ...next,
            serverUrl: next.serverUrl ?? current.serverUrl,
            streamKey: next.streamKey ?? current.streamKey,
          }));
        }
      } catch {
        // La consulta se reintenta en el siguiente intervalo.
      }
    };

    tick();
    const timer = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, hasKey, eventId]);

  useEffect(() => {
    if (!open || !link.connected) return;
    let cancelled = false;
    createViewerToken(hostId)
      .then((value) => {
        if (!cancelled) setToken(value);
      })
      .catch(() => {
        if (!cancelled) setToken(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, link.connected, hostId]);

  const generate = () => {
    startTransition(async () => {
      try {
        const next = await createEventObsIngress(eventId);
        setLink(next);
        toast.success("Clave de OBS lista. Configúrala y empieza a transmitir.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo preparar OBS");
      }
    });
  };

  const copy = async (value: string, field: "url" | "key") => {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1200);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            link.connected
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${link.connected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          {labels[link.status]}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
      >
        <Cast className="h-4 w-4" />
        Transmitir con OBS
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Transmitir con OBS</DialogTitle>
            <DialogDescription>
              Usa esta URL RTMP y la clave de este evento en OBS. Al iniciar la transmisión el estado pasa a OBS Conectado y verás la vista previa. Al detener OBS vuelve a Desconectado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className={`text-sm font-medium ${link.connected ? "text-emerald-400" : "text-muted-foreground"}`}>
              Estado: {labels[link.status]}
            </p>

            {link.serverUrl && link.streamKey ? (
              <div className="space-y-3">
                <Credential label="URL RTMP" value={link.serverUrl} copied={copied === "url"} onCopy={() => copy(link.serverUrl!, "url")} />
                <Credential label="Clave del evento" value={link.streamKey} secret copied={copied === "key"} onCopy={() => copy(link.streamKey!, "key")} />
                <Button type="button" variant="outline" onClick={generate} disabled={pending}>
                  Generar otra clave
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={generate} disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cast className="mr-2 h-4 w-4" />}
                Generar URL y clave
              </Button>
            )}

            <div className="overflow-hidden rounded-xl border bg-black">
              {link.connected && token ? (
                <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!} connect>
                  <Video hostName="Transmisión" hostIdentity={hostId} />
                </LiveKitRoom>
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {link.status === "BUFFERING"
                    ? "OBS está conectando. La vista previa aparecerá en cuanto llegue la señal."
                    : "La vista previa del video aparecerá aquí cuando OBS se conecte."}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Credential({
  label,
  value,
  secret,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  secret?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  const [visible, setVisible] = useState(!secret);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {secret && (
          <button type="button" className="text-xs text-violet-300" onClick={() => setVisible((current) => !current)}>
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={visible ? value : "•".repeat(Math.min(value.length, 24))}
          className="h-10 w-full rounded-md border bg-muted px-3 text-sm"
        />
        <Button type="button" variant="outline" size="icon" onClick={onCopy} aria-label={`Copiar ${label}`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
