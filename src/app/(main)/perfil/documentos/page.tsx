import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { DocumentsSection } from "@/components/profile/DocumentsSection";

export default async function DocumentosPage() {
  const user = await requireVerifiedEmail();

  const providerProfile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: {
      dniUrl: true,
      licenseUrl: true,
      isVerified: true,
    },
  });

  if (!providerProfile) redirect("/perfil");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Documentos</h2>
        <p className="text-sm text-muted-foreground">
          Subí tu DNI y matrícula o certificado para que el equipo de ManosYa
          verifique tu perfil.
        </p>
      </div>
      <DocumentsSection
        dniUrl={providerProfile.dniUrl}
        isVerified={providerProfile.isVerified}
        licenseUrl={providerProfile.licenseUrl}
      />
    </div>
  );
}
