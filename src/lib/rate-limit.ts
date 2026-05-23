import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Cliente Redis compartido (singleton implícito de la librería)
function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// 5 intentos de login por IP en 10 minutos (sliding window)
export const authRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "manosya:rl:auth",
});

// 3 registros por IP por hora
export const registerRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "manosya:rl:register",
});

// 5 reenvíos de email por IP por hora (para evitar abuso de Resend)
export const emailRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "manosya:rl:email",
});

// Obtener identificador de rate limiting: preferir IP forwarded de Vercel/Cloudflare
export async function getRateLimitIdentifier(): Promise<string> {
  const headersList = await headers();
  // Vercel pone la IP real en x-forwarded-for (primer elemento)
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "anonymous";
  return headersList.get("x-real-ip") ?? "anonymous";
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp
  limit: number;
};
