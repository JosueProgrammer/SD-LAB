"use client";

import { useCallback, useEffect, useState } from "react";
import { listChatMessages, sendChatMessage, type ChatMessageDto } from "@/actions/chat";

export function useRoomChat(roomKey: string, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);

  useEffect(() => {
    if (!roomKey || !enabled) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const next = await listChatMessages(roomKey);
        if (!cancelled) setMessages(next);
      } catch {
        // ignore
      }
    };

    tick();
    const timer = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomKey, enabled]);

  const send = useCallback(
    async (body: string) => {
      const created = await sendChatMessage(roomKey, body);
      setMessages((current) => [created, ...current.filter((m) => m.id !== created.id)]);
    },
    [roomKey]
  );

  return { messages, send };
}
