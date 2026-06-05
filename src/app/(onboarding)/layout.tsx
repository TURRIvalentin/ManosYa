import Link from "next/link";
import { Wrench } from "lucide-react";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { requireVerifiedEmail } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireVerifiedEmail();

  const profiles = await db.user.findUnique({
    where: { id: user.id },
    select: {
      clientProfile: { select: { userId: true } },
      providerProfile: { select: { id: true } },
    },
  });

  // BOTH users have both profiles → show 2-step client bar, not 6-step provider bar.
  const isProvider = !!profiles?.providerProfile && !profiles?.clientProfile;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 pt-safe">
        <Link
          href="/"
          aria-label="ManosYa — Volver al inicio"
          className="flex items-center gap-2 font-bold text-brand-600"
        >
          <Wrench aria-hidden="true" className="h-5 w-5" />
          <span>ManosYa</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Salir
        </Link>
      </header>

      <div className="border-b border-border px-4 py-3">
        <ProgressBar isProvider={isProvider} />
      </div>

      <main
        id="main-content"
        className="flex flex-1 flex-col px-4 py-6"
        tabIndex={-1}
      >
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
