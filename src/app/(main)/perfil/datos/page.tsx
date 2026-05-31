import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { ProfileDataForm } from "@/components/profile/ProfileDataForm";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { ProviderBioForm } from "@/components/profile/ProviderBioForm";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function DatosPage() {
  const user = await requireVerifiedEmail();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      phone: true,
      passwordHash: true,
      providerProfile: {
        select: {
          bio: true,
          cuil: true,
          isVerified: true,
        },
      },
    },
  });

  if (!dbUser) notFound();

  return (
    <div className="flex flex-col gap-5">
      {/* Datos personales */}
      <SectionCard title="Datos personales">
        <ProfileDataForm
          initialName={dbUser.name}
          initialPhone={dbUser.phone}
        />
      </SectionCard>

      {/* Perfil de prestador — solo si existe */}
      {dbUser.providerProfile && (
        <SectionCard title="Perfil de prestador">
          <ProviderBioForm
            initialBio={dbUser.providerProfile.bio}
            initialCuil={dbUser.providerProfile.cuil}
            isVerified={dbUser.providerProfile.isVerified}
          />
        </SectionCard>
      )}

      {/* Seguridad */}
      <SectionCard title="Seguridad">
        <ChangePasswordForm hasPassword={!!dbUser.passwordHash} />
      </SectionCard>

      {/* Zona de peligro */}
      <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-base font-semibold text-destructive">Zona de peligro</h2>
        <p className="text-sm text-muted-foreground">
          Eliminar tu cuenta es permanente. Tus datos serán anonimizados y no podrás
          recuperar el acceso.
        </p>
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          href="/perfil/eliminar-cuenta"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Eliminar cuenta
        </Link>
      </section>
    </div>
  );
}
