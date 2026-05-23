import { hash, verify, Algorithm } from "@node-rs/argon2";

// Parámetros Argon2id según OWASP Password Storage Cheat Sheet 2024:
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await verify(hash, password, ARGON2_OPTIONS);
  } catch {
    // Si el hash está malformado (no debería pasar en producción), denegar
    return false;
  }
}
