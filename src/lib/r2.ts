import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REQUIRED_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

/**
 * Una var se considera inválida si:
 *   - es undefined o cadena vacía
 *   - contiene la palabra "placeholder" (case-insensitive)
 *
 * Eso cubre: undefined, "", "placeholder", "tu-account-id",
 * "https://placeholder.r2.dev", etc.
 */
function isInvalid(value: string | undefined): boolean {
  if (!value) return true;
  return value.toLowerCase().includes("placeholder");
}

function getInvalidVars(): string[] {
  return REQUIRED_VARS.filter((v) => isInvalid(process.env[v]));
}

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload a Buffer to Cloudflare R2 y devuelve la URL pública.
 *
 * Dev bypass — activa cuando CUALQUIERA de estas condiciones es verdadera:
 *   1. USE_R2_MOCK=true en el entorno (opt-in explícito, siempre tiene prioridad)
 *   2. Alguna var requerida de R2 es undefined, vacía, o contiene "placeholder"
 *
 * En producción, el bypass lanza excepción en vez de mockear silenciosamente.
 * El warn lista exactamente qué vars están ausentes o son inválidas.
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const explicitMock = process.env.USE_R2_MOCK === "true";
  const invalid = getInvalidVars();
  const shouldMock = explicitMock || invalid.length > 0;

  if (shouldMock) {
    if (process.env.NODE_ENV !== "development") {
      const reason = explicitMock
        ? "USE_R2_MOCK=true is set"
        : `invalid/missing vars: ${invalid.join(", ")}`;
      throw new Error(`R2 mock is not allowed in production (${reason})`);
    }

    const reason = explicitMock
      ? "USE_R2_MOCK=true"
      : `invalid/missing: ${invalid.join(", ")}`;
    console.warn(
      `[r2] R2 not configured (${reason}) — returning placeholder URL for key: ${key}`,
    );
    return `https://placeholder.r2.dev/${key}`;
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${process.env.R2_PUBLIC_URL!}/${key}`;
}
