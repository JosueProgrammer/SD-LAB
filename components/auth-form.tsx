"use client";

import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function establishSession(user: typeof firebaseAuth.currentUser, username?: string) {
    if (!user) throw new Error("No se pudo iniciar sesión");
    const idToken = await user.getIdToken();
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, username }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo crear la sesión");
    router.push("/");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const username = String(form.get("username") || "");
    try {
      const credential = isSignUp ? await createUserWithEmailAndPassword(firebaseAuth, email, password) : await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (isSignUp && username) await updateProfile(credential.user, { displayName: username });
      await establishSession(credential.user, username);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo autenticar");
    } finally { setPending(false); }
  }

  async function googleLogin() {
    setPending(true); setError("");
    try { await establishSession((await signInWithPopup(firebaseAuth, googleProvider)).user); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar con Google"); }
    finally { setPending(false); }
  }

  return <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
    <h1 className="text-xl font-semibold">{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</h1>
    {isSignUp && <Input name="username" placeholder="Nombre de usuario" required minLength={3} />}
    <Input name="email" type="email" placeholder="correo@ejemplo.com" required />
    <Input name="password" type="password" placeholder="Contraseña (mínimo 6 caracteres)" required minLength={6} />
    {error && <p className="text-sm text-destructive">{error}</p>}
    <Button className="w-full" variant="primary" disabled={pending}>{isSignUp ? "Registrarme" : "Entrar"}</Button>
    <Button type="button" className="w-full" variant="outline" onClick={googleLogin} disabled={pending}>Continuar con Google</Button>
    <p className="text-center text-sm text-muted-foreground">{isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"} <Link className="text-primary" href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Inicia sesión" : "Regístrate"}</Link></p>
  </form>;
}
