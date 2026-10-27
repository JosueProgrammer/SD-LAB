"use client";

import { OffLineVideo } from "./offline-video";
import { LiveVideo } from "./live-video";
import { Skeleton } from "../ui/skeleton";

interface VideoProps {
  hostName: string;
  playbackUrl: string | null | undefined;
  isLive?: boolean;
  fill?: boolean;
}

export function Video({ hostName, playbackUrl, isLive = false, fill = false }: VideoProps) {
  const content =
    isLive && playbackUrl ? (
      <LiveVideo playbackUrl={playbackUrl} />
    ) : (
      <OffLineVideo username={hostName} />
    );

  return (
    <div
      className={
        fill
          ? "relative h-full w-full min-h-[240px] bg-black group"
          : "aspect-video border-b group relative bg-black"
      }
    >
      {content}
    </div>
  );
}

export function VideoSkeleton() {
  return (
    <div className="aspect-video border-x border-background">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}
