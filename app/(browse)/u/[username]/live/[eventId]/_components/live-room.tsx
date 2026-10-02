"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { Video } from "@/components/stream-player/Video";
import { Chat } from "@/components/stream-player/chat";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Radio, Calendar, Clock, MapPin } from "lucide-react";
import { EndLiveButton } from "./end-live-button";
import { ParticipantList } from "./participant-list";
import { ViewerCount } from "./viewer-count";
import { createViewerToken } from "@/actions/token";
import { onBlock } from "@/actions/block";

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONFERENCIA: "Conferencia",
  TALLER: "Taller",
  SIMPOSIO: "Simposio",
  CONGRESO: "Congreso",
  CAPACITACION: "Capacitación",
  EXPOSICION: "Exposición",
  RETROALIMENTACION: "Retroalimentación",
};

interface LiveRoomProps {
  event: {
    id: string;
    title: string;
    type: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    location: string;
    isLive: boolean;
  };
  hostId: string;
  hostUsername: string;
  username: string;
  canManage?: boolean;
}

export function LiveRoom({ event, hostId, hostUsername, username, canManage = true }: LiveRoomProps) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    createViewerToken(hostId).then(setToken).catch(console.error);
  }, [hostId]);

  const handleBlock = async (participantIdentity: string) => {
    await onBlock(participantIdentity);
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground animate-pulse">
        Conectando con LiveKit...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Top info bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <h1 className="font-bold text-lg leading-tight">{event.title}</h1>
            <span className="text-xs text-muted-foreground">
              {EVENT_TYPE_LABELS[event.type] ?? event.type}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              {format(new Date(event.date), "PPP", { locale: es })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              {format(new Date(event.startTime), "HH:mm")} –{" "}
              {format(new Date(event.endTime), "HH:mm")}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-violet-400" />
              {event.location}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/30 rounded-full px-3 py-1">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 tracking-widest">EN VIVO</span>
          </div>
          {canManage && <EndLiveButton eventId={event.id} username={username} />}
        </div>
      </div>

      {/* Main layout */}
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!}
        className="flex-1 grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 overflow-hidden"
      >
        {/* Video + viewer count */}
        <div className="lg:col-span-3 xl:col-span-4 flex flex-col overflow-hidden">
          <div className="relative flex-1">
            <Video hostName={hostUsername} hostIdentity={hostId} />
            <div className="absolute bottom-4 left-4 z-10">
              <ViewerCount hostIdentity={hostId} />
            </div>
          </div>
        </div>

        {/* Right sidebar: participants + chat */}
        <div className="lg:col-span-1 xl:col-span-1 flex flex-col border-l border-border bg-background overflow-hidden">
          {/* Participants */}
          <div className="h-[45%] border-b border-border overflow-hidden">
            <ParticipantList hostIdentity={hostId} onBlock={canManage ? handleBlock : undefined} />
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <Chat
              viewerName={hostUsername}
              hostName={hostUsername}
              hostIdentity={hostId}
              isFollowing={true}
              isChatEnabled={true}
              isChatDelayed={false}
              isChatFollowersOnly={false}
            />
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}
