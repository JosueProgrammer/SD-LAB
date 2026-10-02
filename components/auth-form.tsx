"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function establishSession(user: typeof firebaseAuth.currentUser) {
    if (!user) throw new Error("No se pudo iniciar sesión");
    const idToken = await user.getIdToken();
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo crear la sesión");
    router.push(`/u/${data.username}`);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await establishSession(credential.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo autenticar");
    } finally {
      setPending(false);
    }
  }

  async function googleLogin() {
    setPending(true);
    setError("");
    try {
      await establishSession((await signInWithPopup(firebaseAuth, googleProvider)).user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar con Google");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</h1>
      {isSignUp && (
        <p className="text-sm text-muted-foreground">
          Usa Google para registrarte. Se te asignará el rol de Invitado automáticamente.
        </p>
      )}
      {!isSignUp && (
        <>
          <Input name="email" type="email" placeholder="correo@ejemplo.com" required />
          <Input name="password" type="password" placeholder="Contraseña" required minLength={6} />
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!isSignUp && (
        <Button className="w-full" variant="primary" disabled={pending}>
          Entrar
        </Button>
      )}
      <Button type="button" className="w-full" variant={isSignUp ? "primary" : "outline"} onClick={googleLogin} disabled={pending}>
        Continuar con Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "¿Ya tienes cuenta?" : "¿Primera vez?"}{" "}
        <Link className="text-primary" href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? "Inicia sesión" : "Regístrate con Google"}
        </Link>
      </p>
    </form>
  );
}
