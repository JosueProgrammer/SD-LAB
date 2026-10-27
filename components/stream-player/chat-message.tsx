"use client";

import { stringToColor } from "@/lib/utils";
import { format } from "date-fns";
import type { ChatMessageDto } from "@/actions/chat";

interface ChatMessageProps {
  data: ChatMessageDto;
}

export function ChatMessage({ data }: ChatMessageProps) {
  const color = stringToColor(data.username || "");

  return (
    <div className="flex gap-2 p-2 rounded-md hover:bg-white/5">
      <p className="text-sm text-white/40">{format(new Date(data.createdAt), "HH:mm")}</p>
      <div className="flex flex-wrap items-baseline gap-1 grow">
        <p className="text-sm font-semibold whitespace-nowrap">
          <span className="truncate" style={{ color }}>
            {data.username}
          </span>
        </p>
        <p className="text-sm break-all">{data.body}</p>
      </div>
    </div>
  );
}
