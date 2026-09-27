"use client";

import { useParticipants } from "@livekit/components-react";
import { Eye } from "lucide-react";

interface ViewerCountProps {
  hostIdentity: string;
}

export function ViewerCount({ hostIdentity }: ViewerCountProps) {
  const participants = useParticipants();
  // Restamos 1 para no contar al host
  const viewers = Math.max(
    0,
    participants.filter(
      (p) => p.identity !== `host-${hostIdentity}` && p.identity !== hostIdentity
    ).length
  );

  return (
    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
      <Eye className="w-4 h-4 text-violet-400" />
      <span className="text-sm font-semibold text-white">
        {viewers} {viewers === 1 ? "espectador" : "espectadores"} en línea
      </span>
    </div>
  );
}
