import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const PASSWORD = process.env.MC_PASSWORD ?? "mission2024";
const SECRET = new TextEncoder().encode(
  process.env.MC_JWT_SECRET ?? "mc-dev-secret-change-in-production"
);

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }

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
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
    path: "/",
  });
  return res;
}
