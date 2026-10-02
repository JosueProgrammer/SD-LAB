"use client";

import { useParticipants } from "@livekit/components-react";
import { UserRound, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";

interface ParticipantListProps {
  hostIdentity: string;
  onBlock?: (participantIdentity: string) => Promise<void>;
}

export function ParticipantList({ hostIdentity, onBlock }: ParticipantListProps) {
  const participants = useParticipants();
  const [isPending, startTransition] = useTransition();

  // Excluir al host de la lista de espectadores
  const viewers = participants.filter(
    (p) => p.identity !== `host-${hostIdentity}` && p.identity !== hostIdentity
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <UserRound className="w-4 h-4 text-violet-400" />
          <span>Espectadores</span>
          <span className="ml-auto bg-violet-600/20 text-violet-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {viewers.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {viewers.length === 0 && (
          <p className="text-xs text-center py-8 text-muted-foreground">
            Aún no hay espectadores conectados
          </p>
        )}
        {viewers.map((viewer) => (
          <div
            key={viewer.identity}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 group transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserRound className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium truncate">
                {viewer.name ?? viewer.identity}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>

            {onBlock && (
              <button
                title="Bloquear espectador"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await onBlock(viewer.identity);
                      toast.success(`${viewer.name ?? viewer.identity} ha sido bloqueado`);
                    } catch {
                      toast.error("No se pudo bloquear al usuario");
                    }
                  });
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-600/20 text-red-400 hover:text-red-500 transition-all"
              >
                <ShieldBan className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ParticipantListSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-muted" />
          <div className="h-3 bg-muted rounded w-28" />
        </div>
      ))}
    </div>
  );
}
