"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { generateVerificationToken, consumeVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { verifyTurnstile } from "@/lib/turnstile";
import { loginSchema, registerSchema, verifyEmailSchema, resendVerificationSchema } from "@/lib/validations/auth";
import {
  authRatelimit,
  registerRatelimit,
  emailRatelimit,
  getRateLimitIdentifier,
} from "@/lib/rate-limit";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const ip = await getRateLimitIdentifier();
  const rl = await authRatelimit.limit(ip);
  if (!rl.success) {
    return { ok: false, error: "Demasiados intentos. Esperá 10 minutos e intentá de nuevo." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisá los datos ingresados." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (err) {
    // signIn lanza NEXT_REDIRECT en éxito y cuando signIn callback retorna URL
    // (email no verificado → redirect a /auth/verify-email). Ambos deben propagarse.
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { ok: false, error: "Email o contraseña incorrectos. Verificá tus datos." };
      }
      return { ok: false, error: "Ocurrió un error al iniciar sesión. Intentá de nuevo." };
    }
    throw err; // re-throw redirect errors
  }

  return { ok: true, data: undefined };
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const ip = await getRateLimitIdentifier();
  const rl = await registerRatelimit.limit(ip);
  if (!rl.success) {
    return { ok: false, error: "Demasiados intentos. Intentá de nuevo en 1 hora." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos",
      field: first?.path[0] as string | undefined,
    };
  }

  const { name, email, password, turnstileToken } = parsed.data;

  const turnstileOk = await verifyTurnstile(turnstileToken);
  if (!turnstileOk) {
    return {
      ok: false,
      error: "Verificación de seguridad fallida. Recargá la página e intentá de nuevo.",
      field: "turnstileToken",
    };
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true, emailVerified: true },
  });

  if (existing && !existing.deletedAt) {
    if (existing.emailVerified) {
      // Account exists and is verified — tell them to log in
      return { ok: false, error: "Ya existe una cuenta con ese email.", field: "email" };
    }
    // Unverified account: resend verification silently (same response as success)
    const token = await generateVerificationToken(email);
    await sendVerificationEmail(email, token);
    return { ok: true, data: undefined };
  }

  const passwordHash = await hashPassword(password);
  await db.user.create({ data: { name, email, passwordHash } });

  const token = await generateVerificationToken(email);
  await sendVerificationEmail(email, token);

  return { ok: true, data: undefined };
}

export async function verifyEmailAction(formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const parsed = verifyEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enlace de verificación inválido." };
  }

  const { email, token } = parsed.data;

  const consumed = await consumeVerificationToken(email, token);
  if (!consumed) {
    return { ok: false, error: "El enlace expiró o ya fue usado. Solicitá uno nuevo." };
  }

  const user = await db.user.update({
    where: { email },
    data: { emailVerified: new Date() },
    select: { name: true },
  });

  // Welcome email is best-effort — verification already succeeded
  try {
    await sendWelcomeEmail(email, user.name ?? "");
  } catch {
    // Non-fatal: user is verified, they just won't get the welcome email
  }

  return { ok: true, data: undefined };
}

export async function resendVerificationAction(formData: FormData): Promise<ActionResult> {
  const ip = await getRateLimitIdentifier();
  const rl = await emailRatelimit.limit(ip);
  if (!rl.success) {
    return { ok: false, error: "Demasiados intentos. Intentá de nuevo en 1 hora." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = resendVerificationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { email, turnstileToken } = parsed.data;

  const turnstileOk = await verifyTurnstile(turnstileToken);
  if (!turnstileOk) {
    return { ok: false, error: "Verificación de seguridad fallida." };
  }

  // Always return OK to prevent email enumeration
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, deletedAt: true },
  });

  if (user && !user.emailVerified && !user.deletedAt) {
    const token = await generateVerificationToken(email);
    await sendVerificationEmail(email, token);
  }

  return { ok: true, data: undefined };
}
