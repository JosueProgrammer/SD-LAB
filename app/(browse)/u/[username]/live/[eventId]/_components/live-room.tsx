"use client";

import { useEffect, useState } from "react";
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
    playbackUrl: string | null;
    streamPath: string | null;
    obsConnected: boolean;
  };
  hostId: string;
  hostUsername: string;
  username: string;
  viewerName: string;
  canManage?: boolean;
}

export function LiveRoom({
  event,
  hostId,
  hostUsername,
  username,
  viewerName,
  canManage = true,
}: LiveRoomProps) {
  const [identity, setIdentity] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const roomKey = `event:${event.id}`;

  useEffect(() => {
    createViewerToken(hostId)
      .then((token) => setIdentity(token.identity))
      .catch(console.error);
  }, [hostId]);

  const handleBlock = async (participantIdentity: string) => {
    await onBlock(participantIdentity);
  };

  if (!identity) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground animate-pulse">
        Preparando sala…
      </div>
    );
  }

  const isLive = event.isLive || event.obsConnected;
  const playbackUrl = event.streamPath
    ? `/api/hls/${event.streamPath}/index.m3u8`
    : event.playbackUrl;

  return (
    <div className="flex flex-col h-full gap-0">
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
          <div className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/30 rounded-full px-3 py-1">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 tracking-widest">EN VIVO</span>
          </div>
          {canManage && (
            <EndLiveButton eventId={event.id} username={username} onPendingChange={setUploading} />
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 overflow-hidden">
        <div className="lg:col-span-3 xl:col-span-4 flex flex-col overflow-hidden">
          <div className="relative flex-1 min-h-[50vh] bg-black">
            {!uploading && (
              <Video
                hostName={hostUsername}
                playbackUrl={playbackUrl}
                isLive={isLive}
                fill
              />
            )}
            <div className="absolute bottom-4 left-4 z-30">
              <ViewerCount roomKey={roomKey} hostIdentity={hostId} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 xl:col-span-1 flex flex-col border-l border-border bg-background overflow-hidden">
          <div className="h-[45%] border-b border-border overflow-hidden">
            <ParticipantList
              roomKey={roomKey}
              hostIdentity={hostId}
              onBlock={canManage ? handleBlock : undefined}
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <Chat
              roomKey={roomKey}
              viewerName={viewerName}
              hostName={hostUsername}
              hostIdentity={hostId}
              isFollowing={true}
              isChatEnabled={true}
              isChatDelayed={false}
              isChatFollowersOnly={false}
              isLive={isLive && !uploading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
