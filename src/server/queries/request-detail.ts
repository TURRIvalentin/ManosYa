import type { RequestStatus, UserRole } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

const requestIdSchema = z.string().trim().min(1).max(128);

export type RequestDetailViewerRole = "admin" | "client" | "provider";

export type RequestDetail = {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  client: {
    id: string;
    name: string | null;
  };
  createdAt: string;
  description: string;
  id: string;
  provider: {
    id: string;
    name: string | null;
  } | null;
  service: {
    id: string;
    title: string;
  } | null;
  status: RequestStatus;
  title: string;
  updatedAt: string;
  viewerRole: RequestDetailViewerRole;
  zone: {
    id: string;
    name: string;
    slug: string;
  };
};

type Viewer = {
  clientProfile: { id: string } | null;
  providerProfile: { id: string } | null;
  role: UserRole;
};

type DbRequest = {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  categoryId: string;
  clientProfile: {
    id: string;
    user: {
      name: string | null;
    };
  };
  createdAt: Date;
  description: string;
  id: string;
  status: RequestStatus;
  targetProviderId: string | null;
  title: string;
  updatedAt: Date;
  zone: {
    id: string;
    name: string;
    slug: string;
  };
};

type PublicProviderForRequest = {
  id: string;
  services: Array<{
    id: string;
    title: string;
  }>;
  user: {
    name: string | null;
  };
};

type Queryable = {
  providerProfile: {
    findFirst: (args: unknown) => Promise<PublicProviderForRequest | null>;
  };
  request: {
    findFirst: (args: unknown) => Promise<DbRequest | null>;
  };
  user: {
    findFirst: (args: unknown) => Promise<Viewer | null>;
  };
};

function dateToIso(date: Date | string): string {
  return typeof date === "string" ? date : date.toISOString();
}

function getViewerRole(request: DbRequest, viewer: Viewer): RequestDetailViewerRole | null {
  if (viewer.role === "ADMIN") return "admin";
  if (viewer.clientProfile?.id === request.clientProfile.id) return "client";
  if (viewer.providerProfile?.id && viewer.providerProfile.id === request.targetProviderId) {
    return "provider";
  }

  return null;
}

export async function getRequestDetailForUser(
  rawRequestId: string,
  userId: string,
  client: Queryable = db as unknown as Queryable,
): Promise<RequestDetail | null> {
  const requestId = requestIdSchema.parse(rawRequestId);

  const [viewer, request] = await Promise.all([
    client.user.findFirst({
      select: {
        clientProfile: {
          select: { id: true },
        },
        providerProfile: {
          select: { id: true },
        },
        role: true,
      },
      where: {
        deletedAt: null,
        id: userId,
      },
    }),
    client.request.findFirst({
      select: {
        id: true,
        categoryId: true,
        createdAt: true,
        description: true,
        status: true,
        targetProviderId: true,
        title: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        clientProfile: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      where: {
        clientProfile: {
          user: {
            deletedAt: null,
          },
        },
        deletedAt: null,
        id: requestId,
      },
    }),
  ]);

  if (!viewer || !request) return null;

  const viewerRole = getViewerRole(request, viewer);
  if (!viewerRole) return null;

  const provider = request.targetProviderId
    ? await client.providerProfile.findFirst({
        select: {
          id: true,
          services: {
            orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
            },
            take: 1,
            where: {
              categoryId: request.categoryId,
              isActive: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
        where: {
          id: request.targetProviderId,
          user: {
            deletedAt: null,
          },
        },
      })
    : null;

  if (request.targetProviderId && !provider) return null;

  return {
    category: request.category,
    client: {
      id: request.clientProfile.id,
      name: request.clientProfile.user.name,
    },
    createdAt: dateToIso(request.createdAt),
    description: request.description,
    id: request.id,
    provider: provider
      ? {
          id: provider.id,
          name: provider.user.name,
        }
      : null,
    service: provider?.services[0] ?? null,
    status: request.status,
    title: request.title,
    updatedAt: dateToIso(request.updatedAt),
    viewerRole,
    zone: request.zone,
  };
}
