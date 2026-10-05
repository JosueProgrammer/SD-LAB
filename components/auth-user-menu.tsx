"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";

export function AuthUserMenu() {
  const router = useRouter();
  async function logout() {
    await signOut(firebaseAuth);
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/sign-in");
    router.refresh();
  }
  return <Button size="sm" variant="ghost" onClick={logout}>Salir</Button>;
}
