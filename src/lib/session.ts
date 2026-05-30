import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  emailVerified: Date | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

// Redirects to /auth/login if no active session.
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Redirects to the verification page if the user's email is not yet verified.
export async function requireVerifiedEmail(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.emailVerified) {
    redirect(`/verify-email?unverified=${encodeURIComponent(user.email)}`);
  }
  return user;
}

// Redirects to home if the authenticated user is not an ADMIN.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/**
 * Client onboarding is complete when:
 *   1. clientProfile row exists
 *   2. user.phone is set
 */
export async function hasClientOnboarded(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      clientProfile: { select: { userId: true } },
    },
  });
  return !!(user?.clientProfile && user.phone);
}

/**
 * Provider onboarding is complete when ALL of these are true:
 *   1. providerProfile row exists
 *   2. cuil is filled (validated at form level via cuilSchema)
 *   3. at least 1 ProviderZone linked
 *   4. at least 1 ProviderService with isActive = true
 *
 * Documents (dniUrl, licenseUrl) are NOT required here — admin verifies
 * them asynchronously. The provider can operate (plan FREE) while pending.
 * Phone is guaranteed: user reaches provider steps only through info-basica.
 */
export async function hasProviderOnboarded(userId: string): Promise<boolean> {
  const profile = await db.providerProfile.findUnique({
    where: { userId },
    select: {
      cuil: true,
      _count: {
        select: {
          zones: true,
          services: { where: { isActive: true } },
        },
      },
    },
  });

  if (!profile?.cuil) return false;
  if (profile._count.zones < 1) return false;
  if (profile._count.services < 1) return false;
  return true;
}

/**
 * Unified onboarding completion check.
 *
 * — Client or "both" (clientProfile exists): needs clientProfile + phone. Done.
 * — Provider-only (providerProfile exists, no clientProfile): needs phone + cuil + zones + services.
 *
 * "Both" users complete onboarding via the client path (2 steps).
 * Provider-specific setup for BOTH users is gated later by isProviderReady().
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      clientProfile: { select: { userId: true } },
      providerProfile: {
        select: {
          cuil: true,
          _count: {
            select: {
              zones: true,
              services: { where: { isActive: true } },
            },
          },
        },
      },
    },
  });

  if (!user?.clientProfile && !user?.providerProfile) return false;
  if (!user?.phone) return false;

  // Client or BOTH: clientProfile + phone is sufficient to enter the app.
  if (user.clientProfile) return true;

  // Provider-only path: full provider setup required.
  return !!(
    user.providerProfile?.cuil &&
    user.providerProfile._count.zones >= 1 &&
    user.providerProfile._count.services >= 1
  );
}

/**
 * Returns true when a provider's profile is fully configured (cuil + zones + services).
 * Use this to gate provider-specific features for BOTH users who skipped provider setup.
 */
export async function isProviderReady(userId: string): Promise<boolean> {
  const profile = await db.providerProfile.findUnique({
    where: { userId },
    select: {
      cuil: true,
      _count: {
        select: {
          zones: true,
          services: { where: { isActive: true } },
        },
      },
    },
  });
  return !!(profile?.cuil && profile._count.zones >= 1 && profile._count.services >= 1);
}

export type OnboardingStep =
  | "tipo-cuenta"
  | "info-basica"
  | "cuil"
  | "zonas"
  | "servicios"
  | "documentos";

/**
 * Returns the next incomplete onboarding step, or null when onboarding is done.
 * "documentos" is NOT returned here — users reach it naturally after "servicios".
 */
export async function getOnboardingStep(
  userId: string,
): Promise<Exclude<OnboardingStep, "documentos"> | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      clientProfile: { select: { userId: true } },
      providerProfile: {
        select: {
          cuil: true,
          _count: {
            select: {
              zones: true,
              services: { where: { isActive: true } },
            },
          },
        },
      },
    },
  });

  if (!user) return null;
  if (!user.clientProfile && !user.providerProfile) return "tipo-cuenta";
  if (!user.phone) return "info-basica";

  // Client or BOTH: phone + clientProfile = onboarding complete.
  if (user.clientProfile) return null;

  // Provider-only: continue through provider-specific steps.
  if (!user.providerProfile?.cuil) return "cuil";
  if (user.providerProfile._count.zones < 1) return "zonas";
  if (user.providerProfile._count.services < 1) return "servicios";
  return null;
}
