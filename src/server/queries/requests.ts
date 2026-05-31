import type { RequestStatus } from "@prisma/client";

import { db } from "@/lib/db";

export type RequestListItem = {
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
  id: string;
  provider: {
    id: string;
    name: string | null;
  } | null;
  status: RequestStatus;
  title: string;
  updatedAt: string;
  zone: {
    id: string;
    name: string;
    slug: string;
  };
};

export type UserRequestsResponse = {
  canCreateRequests: boolean;
  canReceiveRequests: boolean;
  createdRequestVisible: boolean;
  myRequests: RequestListItem[];
  receivedRequests: RequestListItem[];
};

type DbRequest = {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  clientProfile: {
    id: string;
    user: {
      name: string | null;
    };
  };
  createdAt: Date;
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

type Queryable = {
  providerProfile: {
    findMany: (args: unknown) => Promise<Array<{ id: string; user: { name: string | null } }>>;
  };
  request: {
    findMany: (args: unknown) => Promise<DbRequest[]>;
  };
  user: {
    findUnique: (args: unknown) => Promise<{
      clientProfile: { id: string } | null;
      providerProfile: { id: string } | null;
    } | null>;
  };
};

const requestSelect = {
  id: true,
  createdAt: true,
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
} as const;

function dateToIso(date: Date | string): string {
  return typeof date === "string" ? date : date.toISOString();
}

function mapRequest(
  request: DbRequest,
  providersById: Map<string, { id: string; name: string | null }>,
): RequestListItem {
  const provider = request.targetProviderId
    ? providersById.get(request.targetProviderId) ?? null
    : null;

  return {
    category: request.category,
    client: {
      id: request.clientProfile.id,
      name: request.clientProfile.user.name,
    },
    createdAt: dateToIso(request.createdAt),
    id: request.id,
    provider,
    status: request.status,
    title: request.title,
    updatedAt: dateToIso(request.updatedAt),
    zone: request.zone,
  };
}

export async function getUserRequests(
  userId: string,
  options: { createdId?: string; client?: Queryable } = {},
): Promise<UserRequestsResponse> {
  const client = options.client ?? db;
  const user = await client.user.findUnique({
    select: {
      clientProfile: {
        select: { id: true },
      },
      providerProfile: {
        select: { id: true },
      },
    },
    where: { id: userId },
  });

  const clientProfileId = user?.clientProfile?.id;
  const providerProfileId = user?.providerProfile?.id;

  const [myRequestsRaw, receivedRequestsRaw] = await Promise.all([
    clientProfileId
      ? client.request.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: requestSelect,
          where: {
            clientProfileId,
            deletedAt: null,
          },
        })
      : Promise.resolve([]),
    providerProfileId
      ? client.request.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: requestSelect,
          where: {
            deletedAt: null,
            targetProviderId: providerProfileId,
          },
        })
      : Promise.resolve([]),
  ]);

  const providerIds = [
    ...new Set(
      [...myRequestsRaw, ...receivedRequestsRaw]
        .map((request) => request.targetProviderId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const providers = providerIds.length
    ? await client.providerProfile.findMany({
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        where: {
          id: { in: providerIds },
        },
      })
    : [];
  const providersById = new Map(
    providers.map((provider) => [
      provider.id,
      {
        id: provider.id,
        name: provider.user.name,
      },
    ]),
  );

  const myRequests = myRequestsRaw.map((request) => mapRequest(request, providersById));
  const receivedRequests = receivedRequestsRaw.map((request) => mapRequest(request, providersById));
  const createdRequestIds = new Set(myRequests.map((request) => request.id));

  return {
    canCreateRequests: Boolean(clientProfileId),
    canReceiveRequests: Boolean(providerProfileId),
    createdRequestVisible: options.createdId ? createdRequestIds.has(options.createdId) : false,
    myRequests,
    receivedRequests,
  };
}
