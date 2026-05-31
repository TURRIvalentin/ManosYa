import { z } from "zod";

// ── Datos personales ─────────────────────────────────────────────────────────

export const profileDataSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre no puede superar 100 caracteres.")
    .trim(),
  phone: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(8, "El teléfono debe tener al menos 8 caracteres.")
        .max(25, "El teléfono no puede superar 25 caracteres.")
        .regex(/^[+\d][\d\s\-().]+$/, "Ingresá un número de teléfono válido."),
    ),
});

// ── Cambio de contraseña ─────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(72, "La contraseña no puede superar 72 caracteres.")
      .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula.")
      .regex(/[0-9]/, "Debe contener al menos un número."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

// ── Bio del prestador ────────────────────────────────────────────────────────

export const providerBioSchema = z.object({
  bio: z
    .string()
    .max(500, "La bio no puede superar 500 caracteres.")
    .optional()
    .transform((v) => v?.trim() || undefined),
});

// ── Servicios ────────────────────────────────────────────────────────────────

const serviceCoreSchema = z.object({
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
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("El precio debe ser mayor a 0.").optional(),
  ),
});

export const updateServiceSchema = serviceCoreSchema.extend({
  serviceId: z.string().min(1, "ID de servicio inválido."),
});

export const toggleServiceSchema = z.object({
  serviceId: z.string().min(1, "ID de servicio inválido."),
  // FormData transmite strings; parseamos a boolean
  isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export const deleteServiceSchema = z.object({
  serviceId: z.string().min(1, "ID de servicio inválido."),
});

// ── Eliminación de cuenta ────────────────────────────────────────────────────

export const deleteAccountSchema = z.object({
  confirmation: z.literal("ELIMINAR", {
    errorMap: () => ({ message: 'Escribí "ELIMINAR" para confirmar.' }),
  }),
});
