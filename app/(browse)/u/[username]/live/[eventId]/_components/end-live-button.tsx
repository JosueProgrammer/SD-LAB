"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Square } from "lucide-react";
import { endEventLive } from "@/actions/event";

interface EndLiveButtonProps {
  eventId: string;
  username: string;
}

export function EndLiveButton({ eventId, username }: EndLiveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleEnd = () => {
    startTransition(async () => {
      try {
        const recording = await endEventLive(eventId);
        if (recording.recordingUrl) {
          toast.success("Transmisión finalizada. La grabación quedó en el repositorio.");
        } else if (recording.recordingError) {
          toast.error(recording.recordingError);
        } else {
          toast.success("Transmisión finalizada. La grabación aparecerá en el repositorio en cuanto termine de guardarse.");
        }
        router.push(`/u/${username}/repository`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al finalizar transmisión";
        toast.error(msg);
      }
    });
  };

  return (
    <button
      onClick={handleEnd}
      disabled={isPending}
      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-600/30"
    >
      <Square className="w-4 h-4" />
      {isPending ? "Finalizando..." : "Finalizar transmisión"}
    </button>
  );
}
