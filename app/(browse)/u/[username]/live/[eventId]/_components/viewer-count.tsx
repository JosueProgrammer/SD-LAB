"use client";

import { Eye } from "lucide-react";
import { useRoomPresence } from "@/hooks/use-room-presence";

interface ViewerCountProps {
  roomKey: string;
  hostIdentity: string;
}

export function ViewerCount({ roomKey, hostIdentity }: ViewerCountProps) {
  const viewers = useRoomPresence(roomKey, hostIdentity).length;

  return (
    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
      <Eye className="w-4 h-4 text-violet-400" />
      <span className="text-sm font-semibold text-white">
        {viewers} {viewers === 1 ? "espectador" : "espectadores"} en línea
      </span>
    </div>
  );
}
