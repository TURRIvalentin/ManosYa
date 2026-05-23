const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  // Dev-only skip: NODE_ENV is the gate, not the absence of the key.
  // Missing key in staging/production → throw, never skip silently.
  if (!secret && process.env.NODE_ENV !== "development")
    throw new Error("CLOUDFLARE_TURNSTILE_SECRET_KEY is not set");
  if (!secret) return true;

  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
