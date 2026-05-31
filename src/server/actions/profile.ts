"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireVerifiedEmail } from "@/lib/session";
import {
  profileDataSchema,
  changePasswordSchema,
  providerBioSchema,
  updateServiceSchema,
  toggleServiceSchema,
  deleteServiceSchema,
  deleteAccountSchema,
} from "@/lib/validations/profile";
import {
  saveProviderServiceAction,
  saveProviderZonesAction,
  saveProviderDocumentsAction,
} from "@/server/actions/onboarding";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

// ── Datos personales ─────────────────────────────────────────────────────────

export async function updateProfileDataAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = profileDataSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone },
  });

  revalidatePath("/perfil");
  revalidatePath("/perfil/datos");
  return { ok: true, data: undefined };
}

// ── Cambio de contraseña ─────────────────────────────────────────────────────

export async function changePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
      field: String(first?.path[0] ?? ""),
    };
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser?.passwordHash) {
    return {
      ok: false,
      error: "Tu cuenta usa Google para ingresar y no tiene contraseña propia. Podés agregar una desde Perfil > Seguridad.",
    };
  }

  const isValid = await verifyPassword(
    parsed.data.currentPassword,
    dbUser.passwordHash,
  );
  if (!isValid) {
    return {
      ok: false,
      error: "La contraseña actual es incorrecta.",
      field: "currentPassword",
    };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { ok: true, data: undefined };
}

// ── CUIL del prestador (solo CUIL, sin tocar bio) ───────────────────────────

export async function updateProviderCuilAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const { cuilSchema } = await import("@/lib/validations/cuil");
  const parsed = cuilSchema.safeParse(formData.get("cuil"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "CUIL inválido.", field: "cuil" };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, isVerified: true },
  });
  if (!profile) return { ok: false, error: "No encontramos el perfil de prestador." };
  if (profile.isVerified) {
    return { ok: false, error: "Tu CUIL ya fue verificado y no puede modificarse." };
  }

  const conflict = await db.providerProfile.findFirst({
    where: { cuil: parsed.data, userId: { not: user.id } },
    select: { id: true },
  });
  if (conflict) {
    return { ok: false, error: "Este CUIL/CUIT ya está registrado por otro prestador.", field: "cuil" };
  }

  await db.providerProfile.update({ where: { userId: user.id }, data: { cuil: parsed.data } });
  revalidatePath("/perfil/datos");
  return { ok: true, data: undefined };
}

// ── Bio del prestador ────────────────────────────────────────────────────────

export async function updateProviderBioAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = providerBioSchema.safeParse({
    bio: formData.get("bio") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      field: "bio",
    };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  await db.providerProfile.update({
    where: { userId: user.id },
    data: { bio: parsed.data.bio ?? null },
  });

  revalidatePath("/perfil");
  return { ok: true, data: undefined };
}

// ── Servicios: agregar (delega al action de onboarding + revalida) ────────────

export async function addServiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const result = await saveProviderServiceAction(formData);
  if (result.ok) revalidatePath("/perfil/servicios");
  return result;
}

// ── Servicios: editar ────────────────────────────────────────────────────────

export async function updateServiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = updateServiceSchema.safeParse({
    serviceId: formData.get("serviceId"),
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

  // Anti-IDOR: verificar que el servicio pertenece al perfil del usuario
  const service = await db.providerService.findFirst({
    where: { id: parsed.data.serviceId, providerProfileId: profile.id },
    select: { id: true },
  });
  if (!service) {
    return { ok: false, error: "Servicio no encontrado." };
  }

  const category = await db.category.findFirst({
    where: { id: parsed.data.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) {
    return {
      ok: false,
      error: "La categoría seleccionada no es válida.",
      field: "categoryId",
    };
  }

  await db.providerService.update({
    where: { id: parsed.data.serviceId },
    data: {
      categoryId: parsed.data.categoryId,
      title: parsed.data.title,
      description: parsed.data.description,
      priceUnit: parsed.data.priceUnit,
      priceFrom: parsed.data.priceFrom ?? null,
      priceUpdatedAt: parsed.data.priceFrom != null ? new Date() : null,
    },
  });

  revalidatePath("/perfil/servicios");
  return { ok: true, data: undefined };
}

// ── Servicios: toggle isActive ───────────────────────────────────────────────

export async function toggleServiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = toggleServiceSchema.safeParse({
    serviceId: formData.get("serviceId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  // Anti-IDOR
  const service = await db.providerService.findFirst({
    where: { id: parsed.data.serviceId, providerProfileId: profile.id },
    select: { id: true },
  });
  if (!service) {
    return { ok: false, error: "Servicio no encontrado." };
  }

  await db.providerService.update({
    where: { id: parsed.data.serviceId },
    data: { isActive: parsed.data.isActive },
  });

  revalidatePath("/perfil/servicios");
  return { ok: true, data: undefined };
}

// ── Servicios: eliminar ──────────────────────────────────────────────────────

export async function deleteServiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = deleteServiceSchema.safeParse({
    serviceId: formData.get("serviceId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const profile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "No encontramos el perfil de prestador." };
  }

  // Anti-IDOR
  const service = await db.providerService.findFirst({
    where: { id: parsed.data.serviceId, providerProfileId: profile.id },
    select: { id: true },
  });
  if (!service) {
    return { ok: false, error: "Servicio no encontrado." };
  }

  await db.providerService.delete({ where: { id: parsed.data.serviceId } });

  revalidatePath("/perfil/servicios");
  return { ok: true, data: undefined };
}

// ── Zonas: delega al action de onboarding + revalida ─────────────────────────

export async function updateZonesAction(
  formData: FormData,
): Promise<ActionResult> {
  const result = await saveProviderZonesAction(formData);
  if (result.ok) revalidatePath("/perfil/zonas");
  return result;
}

// ── Documentos: delega al action de onboarding + revalida ────────────────────

export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult> {
  const result = await saveProviderDocumentsAction(formData);
  if (result.ok) revalidatePath("/perfil/documentos");
  return result;
}

// ── Eliminar cuenta (soft delete) ────────────────────────────────────────────
//
// Decisión de diseño — Re-registro con el mismo email:
//   User.email tiene @unique sin índice parcial. Si solo se seteara deletedAt,
//   un intento de db.user.create con el mismo email fallaría con constraint violation.
//   Solución: anonimizar el email a `deleted-${userId}@deleted.invalid` en el momento
//   del soft-delete. El sufijo `.invalid` es un TLD reservado (RFC 2606) que nunca resuelve.
//   Efecto: el email original queda libre de inmediato → re-registro permitido.
//   Los registros Account (OAuth) se eliminan para que el mismo proveedor OAuth pueda
//   vincularse a la nueva cuenta. El User.id persiste para mantener integridad referencial
//   con pedidos, reseñas y mensajes históricos.
//   Ver docs/auth.md § "Soft delete y re-registro".
//
// Decisión de diseño — Servicios activos de prestadores eliminados:
//   Este soft-delete NO desactiva los ProviderService del usuario. Eso significa que
//   cuando exista la búsqueda (Fase 2B), los servicios de cuentas eliminadas podrían
//   aparecer en resultados con nombre "[Cuenta eliminada]".
//   Mitigación en Fase 2B: el query de búsqueda DEBE hacer JOIN a User y filtrar
//   WHERE user.deletedAt IS NULL. Alternativamente, podría agregarse aquí:
//     db.providerService.updateMany({
//       where: { providerProfile: { userId: user.id } },
//       data: { isActive: false },
//     })
//   Se decidió no agregar esa operación ahora para no acoplar este action a la lógica
//   de búsqueda que aún no existe. El filtro en el query de Fase 2B es la solución correcta.

export async function deleteAccountAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireVerifiedEmail();

  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confirmación inválida.",
      field: "confirmation",
    };
  }

  await db.$transaction([
    // Liberar los vínculos OAuth para que el proveedor pueda reutilizarse en
    // una cuenta nueva si el usuario se re-registra con el mismo Google account.
    db.account.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: `deleted-${user.id}@deleted.invalid`,
        name: "[Cuenta eliminada]",
        image: null,
        phone: null,
        passwordHash: null,
      },
    }),
  ]);

  // El client component llama signOut({ callbackUrl: "/" }) al recibir ok: true.
  revalidatePath("/");
  return { ok: true, data: undefined };
}
