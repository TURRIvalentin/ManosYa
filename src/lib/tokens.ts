import { randomBytes } from "crypto";
import { db } from "@/lib/db";

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Genera un token de verificación de email para el usuario con ese email.
 * Elimina cualquier token previo para ese email (solo un token activo a la vez).
 * Almacena el token en texto plano: es de un solo uso, expira en 24 h,
 * y solo es obtenible por el receptor del email.
 */
export async function generateVerificationToken(email: string): Promise<string> {
  // Limpiar tokens previos para este email
  await db.verificationToken.deleteMany({ where: { identifier: email } });

  const token = randomBytes(32).toString("hex"); // 64 hex chars = 256 bits de entropía
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  return token;
}

/**
 * Consume un token: lo busca, lo valida, lo elimina (single-use) y retorna true/false.
 * Si el token no existe o ya expiró, retorna false sin lanzar error.
 */
export async function consumeVerificationToken(
  email: string,
  token: string,
): Promise<boolean> {
  const stored = await db.verificationToken.findFirst({
    where: {
      identifier: email,
      token,
      expires: { gt: new Date() }, // no aceptar tokens expirados
    },
  });

  if (!stored) return false;

  // Eliminar token (single-use)
  await db.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return true;
}
