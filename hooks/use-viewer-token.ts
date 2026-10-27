import { toast } from "sonner";
import { useEffect, useState } from "react";
import { createViewerToken, type ViewerIdentity } from "@/actions/token";

export const useViewerToken = (hostIdentity: string) => {
  const [identity, setIdentity] = useState("");
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createViewerToken(hostIdentity)
      .then((token: ViewerIdentity) => {
        if (cancelled) return;
        setIdentity(token.identity);
        setName(token.name);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("No se pudo unir a la transmisión");
      });
    return () => {
      cancelled = true;
    };
  }, [hostIdentity]);

  return { identity, name, ready };
};
