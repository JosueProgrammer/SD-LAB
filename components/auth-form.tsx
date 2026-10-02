"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (mode === "sign-up") {
    return (
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Registro cerrado</h1>
        <p className="text-sm text-muted-foreground">
          Las cuentas de Invitado, Docente y demás roles solo pueden ser creadas por un Administrador o Jefe de Departamento.
        </p>
        <Button className="w-full" variant="primary" onClick={() => router.push("/sign-in")}>
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

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
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <Input name="email" type="email" placeholder="correo@ejemplo.com" required />
      <Input name="password" type="password" placeholder="Contraseña" required minLength={6} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" variant="primary" disabled={pending}>
        Entrar
      </Button>
      <Button type="button" className="w-full" variant="outline" onClick={googleLogin} disabled={pending}>
        Continuar con Google
      </Button>
    </form>
  );
}
