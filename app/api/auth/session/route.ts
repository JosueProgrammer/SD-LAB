import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/db";

const SESSION_COOKIE = "firebase-session";
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000;

function usernameFrom(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "usuario";
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

  if (existing && !existing.isActive) {
    return NextResponse.json({ error: "Tu cuenta está desactivada." }, { status: 403 });
  }

  let username = existing?.username;

  if (!existing) {
    const isFirstUser = (await db.user.count()) === 0;
    username = await uniqueUsername(
      firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "usuario"
    );

    await db.user.create({
      data: {
        externalUserId: decoded.uid,
        username,
        email: firebaseUser.email || null,
        imageUrl: firebaseUser.photoURL || "",
        role: isFirstUser ? "ADMIN" : "INVITADO",
        firstName: firebaseUser.displayName?.split(" ")[0] || null,
        lastName: firebaseUser.displayName?.split(" ").slice(1).join(" ") || null,
        isActive: true,
        lastLoginAt: new Date(),
        stream: { create: { name: `Streams de ${username}` } },
      },
    });
  } else {
    await db.user.update({
      where: { id: existing.id },
      data: {
        imageUrl: firebaseUser.photoURL || existing.imageUrl || "",
        email: firebaseUser.email || existing.email || null,
        lastLoginAt: new Date(),
      },
    });
  }

  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION });
  const response = NextResponse.json({ username });
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
