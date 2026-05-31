import { db } from "@/lib/db";

type Queryable = Pick<typeof db, "category" | "providerProfile" | "zone">;

export type NewRequestFormData = {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  provider: {
    id: string;
    name: string | null;
    services: Array<{
      category: {
        id: string;
        name: string;
        slug: string;
      };
      id: string;
      title: string;
    }>;
    zones: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  } | null;
  zones: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export async function getNewRequestFormData(
  providerId: string,
  client: Queryable = db,
): Promise<NewRequestFormData> {
  const [categories, zones, provider] = await Promise.all([
    client.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
      where: { isActive: true },
    }),
    client.zone.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    client.providerProfile.findFirst({
      select: {
        id: true,
        services: {
          orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          where: { isActive: true },
        },
        user: {
          select: {
            name: true,
          },
        },
        zones: {
          orderBy: { zone: { name: "asc" } },
          select: {
            zone: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      where: {
        id: providerId,
        services: { some: { isActive: true } },
        user: { deletedAt: null },
      },
    }),
  ]);

  return {
    categories,
    provider: provider
      ? {
          id: provider.id,
          name: provider.user.name,
          services: provider.services,
          zones: provider.zones.map(({ zone }) => zone),
        }
      : null,
    zones,
  };
}
