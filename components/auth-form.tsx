"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type AuthError,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_PASSWORD = "123456";

function authErrorMessage(cause: unknown) {
  const code = typeof cause === "object" && cause && "code" in cause
    ? String((cause as AuthError).code)
    : "";
  const host = typeof window !== "undefined" ? window.location.hostname : "";

  if (code === "auth/unauthorized-domain" || /unauthorized.?domain/i.test(String(cause))) {
    return `Firebase no autoriza este dominio (${host || "IP local"}). En Firebase Console → Authentication → Settings → Authorized domains, agrega: ${host}. Si usas Google, también agrega http://${host}:3000 en orígenes de JavaScript OAuth.`;
  }
  if (code === "auth/email-already-in-use") {
    return "Ese correo ya está registrado. Usa Iniciar sesión.";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Correo o contraseña incorrectos.";
  }
  if (cause instanceof Error) return cause.message;
  return "No se pudo autenticar";
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";
  const hostHint = useMemo(() => {
    if (typeof window === "undefined") return null;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return null;
    return host;
  }, []);

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
    const destination =
      data.role === "ADMIN" ? `/u/${data.username}/dashboard` : `/u/${data.username}`;
    router.push(destination);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password") || DEMO_PASSWORD);
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password || DEMO_PASSWORD
        );
        const displayName = email.split("@")[0];
        await updateProfile(credential.user, { displayName });
        await establishSession(credential.user);
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        await establishSession(credential.user);
      }
    } catch (cause) {
      setError(authErrorMessage(cause));
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
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</h1>
      <p className="text-sm text-muted-foreground">
        {isSignUp
          ? "Regístrate con tu correo o Google. Se te asignará el rol de Invitado automáticamente."
          : "Continúa con Google o ingresa tu correo. La contraseña de acceso es 123456."}
      </p>
      {hostHint && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          Estás entrando por red local (<strong>{hostHint}</strong>). Para que Firebase permita
          login/registro, ese host debe estar en dominios autorizados del proyecto Firebase.
        </p>
      )}
      <Input name="email" type="email" placeholder="correo@ejemplo.com" required />
      <Input
        name="password"
        type="password"
        placeholder="Contraseña"
        defaultValue={DEMO_PASSWORD}
        required
        minLength={6}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" variant="primary" disabled={pending}>
        {isSignUp ? "Registrarse" : "Entrar"}
      </Button>
      <Button
        type="button"
        className="w-full"
        variant="outline"
        onClick={googleLogin}
        disabled={pending}
      >
        Continuar con Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "¿Ya tienes cuenta?" : "¿Primera vez?"}{" "}
        <Link className="text-primary" href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </form>
  );
}
