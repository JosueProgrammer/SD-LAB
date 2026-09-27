"use client";

import { Pencil } from "lucide-react";
import { Separator } from "../ui/separator";
import Image from "next/image";
import { InfoModal } from "./info-modal";

interface InfoCardProps {
  name: string;
  thumbnaiUrl: string | null;
  hostIdentity: string;
  viewerIdentity: string;
}

export function InfoCard({
  hostIdentity,
  name,
  thumbnaiUrl,
  viewerIdentity,
}: InfoCardProps) {
  const hostAsViewer = `host-${hostIdentity}`;
  const isHost = viewerIdentity === hostAsViewer;

  if (!isHost) return null;

  return (
    <div className="px-4">
      <div className="rounded-xl bg-background">
        <div className="flex items-center gap-x-2.5 p-4">
          <div className="rounded-md bg-blue-600 p-2 h-auto w-auto">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm lg:text-lg font-semibold capitalize">
              Editar información del stream
            </h2>
            <p className="text-muted-foreground text-xs lg:text-sm">
              Maximiza tu visibilidad
            </p>
          </div>
          <InfoModal
            initialName={name}
            initialThumbnaiUrl={thumbnaiUrl}
          />
        </div>
        <Separator />
        <div className="p-4 lg:p-6 space-y-4">
          <div>
            <h3 className="text-sm text-muted-foreground mb-2">Nombre</h3>
            <p className="text-sm font-semibold">{name}</p>
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground mb-2">Miniatura</h3>
            <div className="text-sm font-semibold">
              {thumbnaiUrl && (
                <div className="relative aspect-video rounded-md overflow-hidden w-[200px] border border-white/10">
                    <Image src={thumbnaiUrl} fill alt={name} className="object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
