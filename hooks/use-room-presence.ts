"use client";

import { useEffect, useState } from "react";
import { heartbeatPresence, leavePresence, listPresence, type PresenceDto } from "@/actions/presence";
import { useStreamMetricsStore } from "@/store/use-stream-metrics";

export function useRoomPresence(roomKey: string, excludeUserId?: string) {
  const [viewers, setViewers] = useState<PresenceDto[]>([]);

  useEffect(() => {
    if (!roomKey) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const latencySec = useStreamMetricsStore.getState().latencySec;
        await heartbeatPresence(roomKey, {
          latencySec: latencySec ?? undefined,
        });
        const next = await listPresence(roomKey, excludeUserId);
        if (!cancelled) setViewers(next);
      } catch {
        // reintento en el siguiente intervalo
      }
    };

    tick();
    const timer = window.setInterval(tick, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void leavePresence(roomKey);
    };
  }, [roomKey, excludeUserId]);

  return viewers;
}
