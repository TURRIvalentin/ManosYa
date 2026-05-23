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
  return session.user as SessionUser;
}

// Redirects to /auth/login if no active session.
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

// Redirects to the verification page if the user's email is not yet verified.
export async function requireVerifiedEmail(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.emailVerified) {
    redirect(`/auth/verify-email?unverified=${encodeURIComponent(user.email)}`);
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
 * Client onboarding: a clientProfile row exists.
 * No extra requirements — clients don't need CUIL or documents.
 */
export async function hasClientOnboarded(userId: string): Promise<boolean> {
  const profile = await db.clientProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  return !!profile;
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
 * emailVerified is enforced upstream by requireVerifiedEmail() before
 * this function is ever reached.
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
 * Returns true when the user has completed onboarding for at least one role.
 * Used by the home page Server Component to redirect to /onboarding when needed.
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const [client, provider] = await Promise.all([
    hasClientOnboarded(userId),
    hasProviderOnboarded(userId),
  ]);
  return client || provider;
}
