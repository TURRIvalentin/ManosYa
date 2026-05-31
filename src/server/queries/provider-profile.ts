import type { PriceUnit, ZoneType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

const providerIdSchema = z.string().trim().min(1).max(128);

export type PublicProviderProfile = {
  id: string;
  avatarUrl: string | null;
  bio: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  name: string | null;
  ratingAvg: number;
  ratingCount: number;
  services: Array<{
    id: string;
    category: {
      id: string;
      iconName: string | null;
      name: string;
      slug: string;
    };
    description: string | null;
    priceFrom: string | null;
    priceTo: string | null;
    priceUnit: PriceUnit;
    priceUpdatedAt: string | null;
    title: string;
    updatedAt: string;
  }>;
  zones: Array<{
    id: string;
    name: string;
    slug: string;
    type: ZoneType;
  }>;
};

type Queryable = {
  providerProfile: {
    findFirst: typeof db.providerProfile.findFirst;
  };
};

function decimalToString(value: { toString(): string } | string | number | null): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function dateToIso(value: Date | string | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export async function getPublicProviderProfile(
  rawId: string,
  client: Queryable = db,
): Promise<PublicProviderProfile | null> {
  const id = providerIdSchema.parse(rawId);

  const provider = await client.providerProfile.findFirst({
    where: {
      id,
      user: { deletedAt: null },
    },
    select: {
      id: true,
      avatarUrl: true,
      bio: true,
      isFeatured: true,
      isVerified: true,
      ratingAvg: true,
      ratingCount: true,
      services: {
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        select: {
          id: true,
          description: true,
          priceFrom: true,
          priceTo: true,
          priceUnit: true,
          priceUpdatedAt: true,
          title: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              iconName: true,
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
              type: true,
            },
          },
        },
      },
    },
  });

  if (!provider) return null;

  return {
    id: provider.id,
    avatarUrl: provider.avatarUrl,
    bio: provider.bio,
    isFeatured: provider.isFeatured,
    isVerified: provider.isVerified,
    name: provider.user.name,
    ratingAvg: provider.ratingAvg,
    ratingCount: provider.ratingCount,
    services: provider.services.map((service) => ({
      id: service.id,
      category: service.category,
      description: service.description,
      priceFrom: decimalToString(service.priceFrom),
      priceTo: decimalToString(service.priceTo),
      priceUnit: service.priceUnit,
      priceUpdatedAt: dateToIso(service.priceUpdatedAt),
      title: service.title,
      updatedAt: dateToIso(service.updatedAt) ?? "",
    })),
    zones: provider.zones.map(({ zone }) => zone),
  };
}
