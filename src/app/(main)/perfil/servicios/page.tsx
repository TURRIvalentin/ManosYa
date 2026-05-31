import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedEmail } from "@/lib/session";
import { ServicesSection } from "@/components/profile/ServicesSection";

export default async function ServiciosPage() {
  const user = await requireVerifiedEmail();

  const providerProfile = await db.providerProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      services: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          categoryId: true,
          category: { select: { name: true } },
          priceUnit: true,
          priceFrom: true,
          isActive: true,
        },
      },
    },
  });

  if (!providerProfile) redirect("/perfil");

  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const services = providerProfile.services.map((s) => ({
    id: s.id,
    title: s.title,
    categoryId: s.categoryId,
    categoryName: s.category.name,
    priceUnit: s.priceUnit,
    priceFrom: s.priceFrom !== null ? String(s.priceFrom) : null,
    isActive: s.isActive,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Servicios</h2>
        <p className="text-sm text-muted-foreground">
          Gestioná los servicios que ofrecés. Solo los activos aparecen en búsquedas.
        </p>
      </div>
      <ServicesSection categories={categories} services={services} />
    </div>
  );
}
