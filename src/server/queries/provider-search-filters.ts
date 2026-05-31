import { db } from "@/lib/db";

type Queryable = Pick<typeof db, "category" | "zone">;

export type ProviderSearchFilterOptions = {
  categories: Array<{
    name: string;
    slug: string;
  }>;
  zones: Array<{
    name: string;
    slug: string;
    type: string;
  }>;
};

export async function getProviderSearchFilterOptions(
  client: Queryable = db,
): Promise<ProviderSearchFilterOptions> {
  const [categories, zones] = await Promise.all([
    client.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true },
      where: { isActive: true },
    }),
    client.zone.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, type: true },
    }),
  ]);

  return { categories, zones };
}
