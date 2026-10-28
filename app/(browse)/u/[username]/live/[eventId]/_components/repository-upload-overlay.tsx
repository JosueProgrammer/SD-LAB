"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

export function RepositoryUploadOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#16181f]/85 px-6 backdrop-blur-sm"
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="relative h-40 w-40">
          <span className="absolute inset-0 rounded-full border-4 border-violet-400/25 border-t-violet-400 animate-spin" />
          <span
            className="absolute inset-3 rounded-full border-2 border-dashed border-violet-200/50 animate-spin"
            style={{ animationDuration: "2.8s", animationDirection: "reverse" }}
          />
          <span className="absolute inset-7 overflow-hidden rounded-full bg-white shadow-xl shadow-violet-500/30">
            <Image
              src="/SD-LAB.png"
              alt="SD LAB"
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Subiendo a Repositorio
          </h2>
          <p className="text-sm leading-relaxed text-violet-100/80">
            La grabación de la clase se está guardando en el módulo. La plataforma espera a que
            termine.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
