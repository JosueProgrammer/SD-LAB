import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/db";

const SESSION_COOKIE = "firebase-session";
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000;

function usernameFrom(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "admin";
}

async function uniqueUsername(preferred: string) {
  const base = usernameFrom(preferred);
  let candidate = base;
  let suffix = 1;
  while (await db.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base.slice(0, 16)}${suffix++}`;
  }
  return candidate;
}

export async function POST(request: Request) {
  const { idToken } = await request.json();
  if (!idToken) return NextResponse.json({ error: "Missing ID token" }, { status: 400 });

  const auth = firebaseAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const firebaseUser = await auth.getUser(decoded.uid);
  const existing = await db.user.findUnique({ where: { externalUserId: decoded.uid } });

  if (!existing) {
    const totalUsers = await db.user.count();
    // Bootstrap: el primer usuario de la plataforma se crea como ADMIN.
    if (totalUsers === 0) {
      const username = await uniqueUsername(
        firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "admin"
      );
      const created = await db.user.create({
        data: {
          externalUserId: decoded.uid,
          username,
          email: firebaseUser.email || null,
          imageUrl: firebaseUser.photoURL || "",
          role: "ADMIN",
          isActive: true,
          lastLoginAt: new Date(),
          stream: { create: { name: `Streams de ${username}` } },
        },
      });
      const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION });
      const response = NextResponse.json({ username: created.username });
      response.cookies.set(SESSION_COOKIE, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION / 1000,
        path: "/",
      });
      return response;
    }

    return NextResponse.json(
      { error: "Tu cuenta no está registrada. Solicita acceso al administrador o jefe de departamento." },
      { status: 403 }
    );
  }

  if (!existing.isActive) {
    return NextResponse.json({ error: "Tu cuenta está desactivada." }, { status: 403 });
  }

  await db.user.update({
    where: { id: existing.id },
    data: {
      imageUrl: firebaseUser.photoURL || existing.imageUrl || "",
      email: firebaseUser.email || existing.email || null,
      lastLoginAt: new Date(),
    },
  });

  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION });
  const response = NextResponse.json({ username: existing.username });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
