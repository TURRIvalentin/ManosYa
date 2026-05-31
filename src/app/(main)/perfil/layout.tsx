import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireVerifiedEmail();

  const providerProfile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4">
      <ProfileTabs hasProviderProfile={!!providerProfile} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
