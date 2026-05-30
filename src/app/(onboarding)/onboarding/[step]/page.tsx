import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireVerifiedEmail, getOnboardingStep } from "@/lib/session";
import { db } from "@/lib/db";
import { AccountTypeStep } from "@/components/onboarding/steps/AccountTypeStep";
import { BasicInfoStep } from "@/components/onboarding/steps/BasicInfoStep";
import { ProviderCuilStep } from "@/components/onboarding/steps/ProviderCuilStep";
import { ProviderZonesStep } from "@/components/onboarding/steps/ProviderZonesStep";
import { ProviderServicesStep } from "@/components/onboarding/steps/ProviderServicesStep";
import { DocumentUploadStep } from "@/components/onboarding/steps/DocumentUploadStep";

const STEP_TITLES: Record<string, string> = {
  "tipo-cuenta": "Tipo de cuenta",
  "info-basica": "Tus datos",
  cuil: "CUIL y descripción",
  zonas: "Zonas de trabajo",
  servicios: "Tu servicio",
  documentos: "Documentación",
};

const VALID_STEPS = [
  "tipo-cuenta",
  "info-basica",
  "cuil",
  "zonas",
  "servicios",
  "documentos",
] as const;

type StepSlug = (typeof VALID_STEPS)[number];

interface Props {
  params: Promise<{ step: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  return { title: STEP_TITLES[step] ?? "Configurar cuenta" };
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step } = await params;

  if (!VALID_STEPS.includes(step as StepSlug)) notFound();

  const user = await requireVerifiedEmail();
  const correctStep = await getOnboardingStep(user.id);

  // Onboarding already complete — send home
  if (correctStep === null && step !== "documentos") redirect("/");

  // Guard: if user tries to jump ahead, redirect to the actual current step
  if (correctStep !== null && correctStep !== step && step !== "documentos") {
    redirect(`/onboarding/${correctStep}`);
  }

  switch (step as StepSlug) {
    case "tipo-cuenta":
      return <AccountTypeStep />;

    case "info-basica": {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { phone: true },
      });
      return <BasicInfoStep initialPhone={dbUser?.phone ?? ""} />;
    }

    case "cuil": {
      const profile = await db.providerProfile.findUnique({
        where: { userId: user.id },
        select: { cuil: true, bio: true },
      });
      if (!profile) redirect("/onboarding");
      return (
        <ProviderCuilStep
          initialCuil={profile.cuil ?? ""}
          initialBio={profile.bio ?? ""}
        />
      );
    }

    case "zonas": {
      const [zones, profile] = await Promise.all([
        db.zone.findMany({
          orderBy: [{ type: "asc" }, { name: "asc" }],
          select: { id: true, name: true, type: true },
        }),
        db.providerProfile.findUnique({
          where: { userId: user.id },
          select: { zones: { select: { zoneId: true } } },
        }),
      ]);
      if (!profile) redirect("/onboarding");
      const selectedIds = profile.zones.map((z: { zoneId: string }) => z.zoneId);
      return <ProviderZonesStep zones={zones} selectedIds={selectedIds} />;
    }

    case "servicios": {
      const categories = await db.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, iconName: true },
      });
      return <ProviderServicesStep categories={categories} />;
    }

    case "documentos": {
      const profile = await db.providerProfile.findUnique({
        where: { userId: user.id },
        select: { dniUrl: true, licenseUrl: true },
      });
      // If no providerProfile, go back to the redirector
      if (!profile) redirect("/onboarding");
      return (
        <DocumentUploadStep
          existingDni={profile.dniUrl ?? null}
          existingLicense={profile.licenseUrl ?? null}
        />
      );
    }

    default:
      notFound();
  }
}
