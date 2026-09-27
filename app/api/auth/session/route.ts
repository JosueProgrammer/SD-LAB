import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/db";

const SESSION_COOKIE = "firebase-session";
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000;

function usernameFrom(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "streamer";
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
  const { idToken, username } = await request.json();
  if (!idToken) return NextResponse.json({ error: "Missing ID token" }, { status: 400 });

  const auth = firebaseAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const firebaseUser = await auth.getUser(decoded.uid);
  const existing = await db.user.findUnique({ where: { externalUserId: decoded.uid } });
  const resolvedUsername = existing?.username ?? await uniqueUsername(username || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "streamer");

  await db.user.upsert({
    where: { externalUserId: decoded.uid },
    update: { imageUrl: firebaseUser.photoURL || existing?.imageUrl || "" },
    create: {
      externalUserId: decoded.uid,
      username: resolvedUsername,
      imageUrl: firebaseUser.photoURL || "",
      stream: { create: { name: `Streams de ${resolvedUsername}` } },
    },
  });

  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION });
  const response = NextResponse.json({ username: resolvedUsername });
  response.cookies.set(SESSION_COOKIE, sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: SESSION_DURATION / 1000, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
