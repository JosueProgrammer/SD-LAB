"use client";

import { toast } from "sonner";
import { useTransition } from "react";
import { MinusCircle } from "lucide-react";
import Hint from "@/components/hint";
import { onBlock } from "@/actions/block";
import { cn, stringToColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CommunityItemProps {
  hostName: string;
  viewerName: string;
  participantName?: string;
  participantIdentity: string;
}

export function CommunityItem({
  hostName,
  participantIdentity,
  viewerName,
  participantName,
}: CommunityItemProps) {
  const [isPending, startTransition] = useTransition();
  const color = stringToColor(participantName || "");
  const isSelf = participantName === viewerName;
  const isHost = viewerName === hostName;

  const handleBlock = () => {
    if (!participantName || isSelf || !isHost) return;

    startTransition(() => {
      onBlock(participantIdentity)
        .then(() => toast.success(`Se bloqueó a ${participantName}`))
        .catch(() => toast.error("Algo salió mal"));
    });
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between w-full p-2 rounded-md text-sm hover:bg-white/5",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <p style={{ color: color }}>{participantName}</p>
      {isHost && !isSelf && (
        <Hint label="Bloquear">
          <Button
            variant="ghost"
            disabled={isPending}
            className="h-auto wauto p-1 opacity-0 group-hover:opacity-100 transition"
            onClick={handleBlock}
          >
            <MinusCircle className="h-4 w-5 text-muted-foreground" />
          </Button>
        </Hint>
      )}
    </div>
  );
}
