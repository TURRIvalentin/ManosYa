import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { ZonesSection } from "@/components/profile/ZonesSection";

export default async function ZonasPage() {
  const user = await requireVerifiedEmail();

  const providerProfile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      zones: { select: { zoneId: true } },
    },
  });

  if (!providerProfile) redirect("/perfil");

  const [allZones] = await Promise.all([
    db.zone.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);

  const selectedIds = providerProfile.zones.map((z) => z.zoneId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Zonas de trabajo</h2>
        <p className="text-sm text-muted-foreground">
          Seleccioná los barrios o partidos donde ofrecés tus servicios.
        </p>
      </div>
      <ZonesSection selectedIds={selectedIds} zones={allZones} />
    </div>
  );
}
