/**
 * Edge-safe rate limiter for Next.js Middleware (Edge Runtime).
 *
 * Uses @upstash/redis/cloudflare instead of the Node.js client because
 * Edge Runtime does not support Node.js APIs (process.version, etc.).
 * The cloudflare client uses the Web Fetch API, which is available in
 * all Edge environments (Vercel Edge, Cloudflare Workers, etc.).
 *
 * Server Actions use src/lib/rate-limit.ts (Node.js client, full features).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";

// 5 credential login attempts per IP per 10 minutes (mirrors rate-limit.ts)
export const authRatelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "manosya:rl:auth",
});
