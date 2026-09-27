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
import Hint from "../hint";
import { Textarea } from "../ui/textarea";
import { ElementRef, useRef, useState, useTransition } from "react";
import { updateUser } from "@/actions/user";
import { toast } from "sonner";

interface BioModalProps {
  initialValue: string | null;
}

export function BioModal({ initialValue }: BioModalProps) {

  const closeRef = useRef<ElementRef<"button">>(null)
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(initialValue);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    startTransition(() => {
        updateUser({bio: value})
        .then(() => {
            toast.success("Biografía actualizada")
            closeRef?.current?.click()
        })
        .catch(() => toast.error("Algo salió mal"))
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="ml-auto" variant="link" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar biografía</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Textarea
            placeholder="Biografía del usuario"
            disabled={false}
            className="resize-none"
            onChange={(e) => setValue(e.target.value)}
            value={value || ""}
          ></Textarea>
          <div className="flex justify-between">
            <DialogClose asChild ref={closeRef}>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button disabled={isPending} type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
