"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import React, { useState, useTransition, useRef, ElementRef } from "react";
import { updateStream } from "@/actions/stream";
import { toast } from "sonner";
import { UploadDropzone } from "@/lib/uploadthing";
import { useRouter } from "next/navigation";
import Hint from "../hint";
import { Trash } from "lucide-react";
import Image from "next/image";

interface InfoModalProps {
  initialName: string;
  initialThumbnaiUrl: string | null;
}

export function InfoModal({ initialName, initialThumbnaiUrl }: InfoModalProps) {
  const router = useRouter();
  const closeRef = useRef<ElementRef<"button">>(null);
  const [name, setName] = useState(initialName);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnaiUrl);

  const [isPending, startTransition] = useTransition();

  const onRemove = () => {
    startTransition(() => {
      updateStream({thumbnaiUrl: null})
      .then(() => {
        toast.success("Miniatura eliminada")
        setThumbnailUrl("")
        closeRef?.current?.click()
      })
      .catch(() => toast.error("Algo salió mal"))
    })
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(() => {
      updateStream({ name: name })
        .then(() => {
          toast.success("Stream actualizado");
          closeRef?.current?.click();
        })
        .catch(() => toast.error("Algo salió mal"));
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="ml-auto">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información del stream</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-14">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre del stream"
              onChange={onChange}
              value={name}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Miniatura</Label>
            {thumbnailUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                <div className="absolute top-2 right-2 z-[10]">
                  <Hint label="Eliminar miniatura" asChild side="left">
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={onRemove}
                      className="h-auto w-auto p-1.5"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </Hint>
                </div>
                <Image
                  alt="miniatura"
                  src={thumbnailUrl}
                  className="object-cover"
                  fill
                />
              </div>
            ) : (
              <div className="rounded-xl border outline-dashed outline-muted">
                <UploadDropzone
                  endpoint="thumbnailUploader"
                  appearance={{
                    label: {
                      color: "#FFFFFF",
                    },
                    allowedContent: {
                      color: "#FFFFFF",
                    },
                  }}
                  onClientUploadComplete={(res) => {
                    const url = res?.[0]?.ufsUrl || res?.[0]?.url;
                    if (!url) {
                      toast.error("No se pudo obtener la URL de la imagen");
                      return;
                    }
                    setThumbnailUrl(url);
                    toast.success("Imagen subida correctamente");
                    router.refresh();
                    closeRef?.current?.click();
                  }}
                  onUploadError={(error: Error) => {
                    toast.error(`Error al subir imagen: ${error.message}`);
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <DialogClose ref={closeRef} asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button disabled={isPending} variant="primary" type="submit">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
