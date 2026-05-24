import { redirect } from "next/navigation";
import { requireVerifiedEmail, getOnboardingStep } from "@/lib/session";

// Redirects to the current incomplete step, or to / when done.
export default async function OnboardingIndexPage() {
  const user = await requireVerifiedEmail();
  const step = await getOnboardingStep(user.id);

  if (step === null) redirect("/");
  redirect(`/onboarding/${step}`);
}
