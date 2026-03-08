import { NextResponse } from "next/server";
import { SignJWT } from "jose";

// Fix 1: Hard-fail wenn Env-Vars fehlen
if (!process.env.MC_JWT_SECRET) {
  console.error("FATAL: MC_JWT_SECRET environment variable is not set");
}
if (!process.env.MC_PASSWORD) {
  console.error("FATAL: MC_PASSWORD environment variable is not set");
}

const PASSWORD = process.env.MC_PASSWORD;
const SECRET = new TextEncoder().encode(
  process.env.MC_JWT_SECRET ?? ""
);

// Fix 2: In-Memory Rate-Limiter (5 Versuche / 15 Minuten pro IP)
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

export async function POST(req: Request) {
  // Fix 1: Block wenn keine Env-Vars gesetzt
  if (!PASSWORD || !process.env.MC_JWT_SECRET) {
    return NextResponse.json(
      { error: "Server nicht konfiguriert. Bitte MC_JWT_SECRET und MC_PASSWORD setzen." },
      { status: 503 }
    );
  }

  // Fix 2: Rate-Limiting prüfen
  const ip = getIP(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte 15 Minuten warten." },
      { status: 429 }
    );
  }

  const { password } = await req.json();

  if (password !== PASSWORD) {
    recordAttempt(ip);
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }

  clearAttempts(ip);

  const token = await new SignJWT({ sub: "daniel" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("mc_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
