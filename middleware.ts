import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.MC_JWT_SECRET ?? "mc-dev-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & public routes — always allow
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check JWT cookie
  const token = request.cookies.get("mc_auth")?.value;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      // Invalid/expired token → fall through to redirect
    }
  }

  // Not authenticated → redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
