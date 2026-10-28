"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Square } from "lucide-react";
import { endEventLive } from "@/actions/event";
import { RepositoryUploadOverlay } from "./repository-upload-overlay";

interface EndLiveButtonProps {
  eventId: string;
  username: string;
  onPendingChange?: (pending: boolean) => void;
}

export function EndLiveButton({ eventId, username, onPendingChange }: EndLiveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleEnd = () => {
    onPendingChange?.(true);
    startTransition(async () => {
      try {
        const recording = await endEventLive(eventId);
        if (recording.recordingUrl) {
          toast.success("Transmisión finalizada. La grabación quedó en el repositorio.");
          router.push(`/u/${username}/repository`);
          return;
        }
        onPendingChange?.(false);
        toast.error(recording.recordingError || "No se pudo guardar la grabación en el repositorio.");
      } catch (err: unknown) {
        onPendingChange?.(false);
        const msg = err instanceof Error ? err.message : "Error al finalizar transmisión";
        toast.error(msg);
      }
    });
  };

  return (
    <>
      {isPending && <RepositoryUploadOverlay />}
      <button
        onClick={handleEnd}
        disabled={isPending}
        aria-busy={isPending}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-600/30"
      >
        <Square className="w-4 h-4" />
        {isPending ? "Subiendo a Repositorio" : "Finalizar transmisión"}
      </button>
    </>
  );
}
