"use client";

import { VerifiedMark } from "../verified-mark";
import { BioModal } from "./bio-modal";

interface AboutCardProps {
  hostName: string;
  hostIdentity: string;
  viewerIdentity: string;
  bio: string | null;
  followedByCount: number;
}

export function AboutCard({
  bio,
  followedByCount,
  hostIdentity,
  hostName,
  viewerIdentity,
}: AboutCardProps) {
  const hostAsViewer = `host-${hostIdentity}`;
  const isHost = viewerIdentity === hostAsViewer;
  const followedByLabel = followedByCount === 1 ? "seguidor" : "seguidores";

  return (
    <div className="px-4">
      <div className="group rounded-xl bg-background p-6 lg:p-10 flex flex-col gap-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2 font-semibold text-lg lg:text-2xl">
            Acerca de {hostName}
            <VerifiedMark />
          </div>
          {isHost && (<BioModal initialValue={bio} />)}
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-primary">{followedByCount}</span>{" "}
          {followedByLabel}
        </div>
        <p>
            {bio || "Este usuario prefiere mantener un aire de misterio"}
        </p>
      </div>
    </div>
  );
}
