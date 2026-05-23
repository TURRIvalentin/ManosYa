import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { authRatelimit } from "@/lib/rate-limit";
import type { Session } from "next-auth";

const { auth } = NextAuth(authConfig);

// Routes that require an authenticated session
const PROTECTED = ["/pedidos", "/mensajes", "/perfil", "/onboarding"];
// Routes only for unauthenticated users (redirect away if session exists)
const AUTH_ONLY = ["/auth/login", "/auth/register"];

export default auth(async function middleware(
  request: NextRequest & { auth: Session | null },
) {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // Rate-limit credential login attempts (sliding window, 5/10 min per IP)
  if (pathname === "/api/auth/callback/credentials" && request.method === "POST") {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    const rl = await authRatelimit.limit(ip);
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." },
        {
          status: 429,
          headers: { "Retry-After": retryAfter.toString() },
        },
      );
    }
  }

  // Redirect authenticated users away from auth pages
  if (session && AUTH_ONLY.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Guard admin routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const url = new URL("/auth/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Guard protected routes
  if (!session && PROTECTED.some((r) => pathname.startsWith(r))) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
