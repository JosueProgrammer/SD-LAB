"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, Users, Radio, Play } from "lucide-react";
import { toast } from "sonner";
import { startEventLive } from "@/actions/event";

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCIA: "Conferencia",
  TALLER: "Taller",
  SIMPOSIO: "Simposio",
  CONGRESO: "Congreso",
  CAPACITACION: "Capacitación",
  EXPOSICION: "Exposición",
  RETROALIMENTACION: "Retroalimentación",
};

interface EventPreviewCardProps {
  event: {
    id: string;
    title: string;
    type: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    location: string;
    thumbnailUrl: string | null;
    status: string;
    isLive: boolean;
    participants: number;
  };
  username: string;
}

export function EventPreviewCard({ event, username }: EventPreviewCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isLive = event.status === "LIVE" || event.isLive;

  const handleStart = () => {
    if (isLive) {
      router.push(`/u/${username}/live/${event.id}`);
      return;
    }
    startTransition(async () => {
      try {
        await startEventLive(event.id);
        toast.success("¡Transmisión iniciada!");
        router.push(`/u/${username}/live/${event.id}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al iniciar transmisión";
        toast.error(msg);
      }
    });
  };

  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {event.thumbnailUrl ? (
          <Image
            src={event.thumbnailUrl}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/40 to-indigo-900/40">
            <Radio className="w-12 h-12 text-violet-400/60" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          {isLive ? (
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              EN VIVO
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-emerald-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
              Aprobado
            </span>
          )}
        </div>

        {/* Type pill */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
            <span>{format(new Date(event.date), "PPP", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400 shrink-0" />
            <span>
              {format(new Date(event.startTime), "HH:mm")} –{" "}
              {format(new Date(event.endTime), "HH:mm")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400 shrink-0" />
            <span>{event.participants} participantes invitados</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isPending}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
            isLive
              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
              : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/30"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {isPending ? (
            <span className="animate-pulse">Iniciando...</span>
          ) : isLive ? (
            <>
              <Radio className="w-4 h-4 animate-pulse" />
              Continuar transmisión
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Comenzar en vivo
            </>
          )}
        </button>
      </div>
    </div>
  );
}
