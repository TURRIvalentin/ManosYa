import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireVerifiedEmail } from "@/lib/session";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";

export default async function EliminarCuentaPage() {
  await requireVerifiedEmail();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          className="mb-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          href="/perfil/datos"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver
        </Link>
        <h2 className="text-lg font-semibold text-foreground">Eliminar cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Vas a eliminar permanentemente tu cuenta de ManosYa.
        </p>
      </div>

      <DeleteAccountSection />
    </div>
  );
}
