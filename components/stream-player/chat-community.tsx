"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommunityItem } from "./community-item";
import { useRoomPresence } from "@/hooks/use-room-presence";

interface ChatCommunityProps {
  roomKey: string;
  hostName: string;
  viewerName: string;
  hostIdentity: string;
  isHidden: boolean;
}

export function ChatCommunity({
  roomKey,
  hostName,
  isHidden,
  viewerName,
  hostIdentity,
}: ChatCommunityProps) {
  const [value, setValue] = useState("");
  const debouncedValue = useDebounce<string>(value, 500);
  const participants = useRoomPresence(roomKey, hostIdentity);

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) =>
      participant.username.toLowerCase().includes(debouncedValue.toLowerCase())
    );
  }, [participants, debouncedValue]);

  if (isHidden) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">La comunidad está deshabilitada</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Input
        placeholder="Buscar en la comunidad"
        className="border-white/10"
        onChange={(e) => setValue(e.target.value)}
      />
      <ScrollArea className="gap-y-2 mt-4">
        <p className="text-center text-sm text-muted-foreground p-2 hidden last:block">Sin resultados</p>
        {filteredParticipants.map((participant) => (
          <CommunityItem
            key={participant.userId}
            hostName={hostName}
            viewerName={viewerName}
            participantName={participant.username}
            participantIdentity={participant.userId}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
