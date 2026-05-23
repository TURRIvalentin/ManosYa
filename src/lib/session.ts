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
 * Returns true when the user has at least one profile (client or provider).
 * Used by the home page Server Component to redirect to onboarding when needed.
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const [client, provider] = await Promise.all([
    db.clientProfile.findUnique({ where: { userId }, select: { userId: true } }),
    db.providerProfile.findUnique({ where: { userId }, select: { userId: true } }),
  ]);
  return !!(client || provider);
}
