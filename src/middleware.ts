import { type NextRequest, NextResponse } from "next/server";

// Middleware de Next.js — se ejecuta en el Edge antes de cada request
// Fase 1: implementar auth check con Auth.js
// Fase 2: implementar rate limiting con Upstash

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ["/pedidos", "/mensajes", "/perfil", "/admin"];

// Rutas solo para no-autenticados (redirigir si ya tiene sesión)
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TODO Fase 1: verificar sesión con Auth.js
  // const session = await auth();

  // Placeholder: dejar pasar todo por ahora
  // En Fase 1 se reemplaza con la lógica real de auth

  // Headers de seguridad adicionales (complementan los de next.config.ts)
  const response = NextResponse.next();

  // Prevenir clickjacking adicional
  response.headers.set("X-Frame-Options", "DENY");

  // Skip lint: pathname se usa en Fase 1
  void pathname;
  void PROTECTED_ROUTES;
  void AUTH_ROUTES;

  return response;
}

export const config = {
  // Aplicar middleware a todas las rutas excepto archivos estáticos y API de NextAuth
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
