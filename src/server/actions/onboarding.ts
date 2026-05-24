"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { cuilSchema } from "@/lib/validations/cuil";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

// ── Step 1: tipo-cuenta ───────────────────────────────────────────────────────

const accountTypeSchema = z.object({
  type: z.enum(["CLIENT", "PROVIDER", "BOTH"], {
    errorMap: () => ({ message: "Seleccioná un tipo de cuenta válido." }),
  }),
});

export async function saveAccountTypeAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = accountTypeSchema.safeParse({ type: formData.get("type") });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Seleccioná un tipo de cuenta.",
    };
  }

  const { type } = parsed.data;

  await db.$transaction(async (tx) => {
    if (type === "CLIENT" || type === "BOTH") {
      await tx.clientProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    }
    if (type === "PROVIDER" || type === "BOTH") {
      await tx.providerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    }
  });

  return { ok: true, data: undefined };
}

// ── Step 2: info-basica ───────────────────────────────────────────────────────

const basicInfoSchema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(8, "El teléfono debe tener al menos 8 caracteres.")
        .max(25, "El teléfono no puede superar 25 caracteres.")
        .regex(
          /^[+\d][\d\s\-().]+$/,
          "Ingresá un número de teléfono válido.",
        ),
    ),
});

export async function saveBasicInfoAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = basicInfoSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      field: "phone",
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: { phone: parsed.data.phone },
  });

  return { ok: true, data: undefined };
}

// ── Step 3 (provider): cuil + bio ────────────────────────────────────────────

const providerCuilSchema = z.object({
  cuil: cuilSchema,
  bio: z
    .string()
    .max(500, "La descripción no puede superar 500 caracteres.")
    .optional()
    .transform((v) => v?.trim() || undefined),
});

export async function saveProviderCuilAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = providerCuilSchema.safeParse({
    cuil: formData.get("cuil"),
    bio: (formData.get("bio") as string) || undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  // CUIL uniqueness check (cross-provider)
  const conflict = await db.providerProfile.findFirst({
    where: { cuil: parsed.data.cuil, userId: { not: user.id } },
    select: { id: true },
  });
  if (conflict) {
    return {
      ok: false,
      error: "Este CUIL/CUIT ya está registrado por otro prestador.",
      field: "cuil",
    };
  }

  await db.providerProfile.update({
    where: { userId: user.id },
    data: { cuil: parsed.data.cuil, bio: parsed.data.bio ?? null },
  });

  return { ok: true, data: undefined };
}

// ── Step 4 (provider): zonas ──────────────────────────────────────────────────

const providerZonesSchema = z.object({
  zoneIds: z
    .array(z.string())
    .min(1, "Seleccioná al menos una zona de trabajo."),
});

export async function saveProviderZonesAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const raw = formData.getAll("zoneIds").map(String).filter(Boolean);
  const parsed = providerZonesSchema.safeParse({ zoneIds: raw });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Seleccioná al menos una zona.",
    };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  // Verify all zone IDs exist
  const zones = await db.zone.findMany({
    where: { id: { in: parsed.data.zoneIds } },
    select: { id: true },
  });
  if (zones.length !== parsed.data.zoneIds.length) {
    return { ok: false, error: "Algunas zonas seleccionadas no son válidas." };
  }

  await db.$transaction([
    db.providerZone.deleteMany({ where: { providerProfileId: profile.id } }),
    db.providerZone.createMany({
      data: parsed.data.zoneIds.map((zoneId) => ({
        providerProfileId: profile.id,
        zoneId,
      })),
    }),
  ]);

  return { ok: true, data: undefined };
}

// ── Step 5 (provider): primer servicio ───────────────────────────────────────

const providerServiceSchema = z.object({
  categoryId: z.string().min(1, "Seleccioná una categoría."),
  title: z
    .string()
    .min(3, "El título debe tener al menos 3 caracteres.")
    .max(100, "El título no puede superar 100 caracteres."),
  description: z
    .string()
    .max(1000, "La descripción no puede superar 1000 caracteres.")
    .optional()
    .transform((v) => v?.trim() || undefined),
  priceUnit: z.enum(["POR_HORA", "POR_TRABAJO", "POR_M2", "A_CONVENIR"]),
  priceFrom: z.preprocess(
    (v) =>
      v === "" || v === null || v === undefined ? undefined : Number(v),
    z.number().positive("El precio debe ser mayor a 0.").optional(),
  ),
});

export async function saveProviderServiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = providerServiceSchema.safeParse({
    categoryId: formData.get("categoryId"),
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string) || undefined,
    priceUnit: formData.get("priceUnit"),
    priceFrom: formData.get("priceFrom"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  const category = await db.category.findFirst({
    where: { id: parsed.data.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, error: "La categoría seleccionada no es válida.", field: "categoryId" };
  }

  await db.providerService.create({
    data: {
      providerProfileId: profile.id,
      categoryId: parsed.data.categoryId,
      title: parsed.data.title,
      description: parsed.data.description,
      priceUnit: parsed.data.priceUnit,
      priceFrom: parsed.data.priceFrom,
      isActive: true,
      priceUpdatedAt: parsed.data.priceFrom != null ? new Date() : null,
    },
  });

  return { ok: true, data: undefined };
}

// ── Step 6 (provider): documentos ────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export async function saveProviderDocumentsAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const dniFile = formData.get("dni") as File | null;
  const licenseFile = formData.get("license") as File | null;

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  const updates: { dniUrl?: string; licenseUrl?: string } = {};

  const uploads: Array<["dni" | "license", File]> = [];
  if (dniFile && dniFile.size > 0) uploads.push(["dni", dniFile]);
  if (licenseFile && licenseFile.size > 0) uploads.push(["license", licenseFile]);

  for (const [field, file] of uploads) {
    if (file.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: "El archivo es demasiado grande. Máximo 10 MB.",
        field,
      };
    }
    if (!ACCEPTED_MIME.includes(file.type)) {
      return {
        ok: false,
        error: "Formato no aceptado. Usá JPG, PNG, WEBP o HEIC.",
        field,
      };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `providers/${profile.id}/${field}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const url = await uploadToR2(buffer, key, file.type);
      if (field === "dni") updates.dniUrl = url;
      else updates.licenseUrl = url;
    } catch {
      return {
        ok: false,
        error: "Error al subir el archivo. Intentá de nuevo.",
        field,
      };
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.providerProfile.update({
      where: { userId: user.id },
      data: updates,
    });
  }

  return { ok: true, data: undefined };
}
