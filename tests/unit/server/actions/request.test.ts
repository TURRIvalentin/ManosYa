import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import {
  cancelRequestForUser,
  completeRequestForUser,
  createRequestForUser,
} from "@/server/actions/request";

function createForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("categoryId", "cat_plomeria");
  formData.set("description", "Necesito reparar una perdida debajo de la bacha de la cocina.");
  formData.set("providerId", "provider_1");
  formData.set("title", "Reparar perdida de agua");
  formData.set("zoneId", "zone_palermo");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

function decisionForm(requestId = "request_1") {
  const formData = new FormData();
  formData.set("requestId", requestId);
  return formData;
}

function createClient(overrides: Partial<{
  category: unknown;
  clientProfile: unknown;
  provider: unknown;
  request: unknown;
  zone: unknown;
}> = {}) {
  const tx = {
    category: {
      findFirst: vi.fn().mockResolvedValue({ id: "cat_plomeria" }),
    },
    clientProfile: {
      findUnique: vi.fn().mockResolvedValue({ id: "client_real", user: { phone: "+54 11 1234-5678" } }),
    },
    providerProfile: {
      findFirst: vi.fn().mockResolvedValue({
        id: "provider_1",
        userId: "provider_owner",
        services: [{ categoryId: "cat_plomeria", id: "service_1" }],
      }),
    },
    request: {
      create: vi.fn().mockResolvedValue({ id: "request_1" }),
    },
    zone: {
      findUnique: vi.fn().mockResolvedValue({ id: "zone_palermo" }),
    },
  };

  if (overrides.category) tx.category = overrides.category as typeof tx.category;
  if (overrides.clientProfile) {
    tx.clientProfile = overrides.clientProfile as typeof tx.clientProfile;
  }
  if (overrides.provider) {
    tx.providerProfile = overrides.provider as typeof tx.providerProfile;
  }
  if (overrides.request) tx.request = overrides.request as typeof tx.request;
  if (overrides.zone) tx.zone = overrides.zone as typeof tx.zone;

  return {
    client: {
      $transaction: vi.fn((callback) => callback(tx)),
    },
    tx,
  };
}

function createStatusClient(overrides: Partial<{
  providerProfile: unknown;
  quoteUpdateMany: unknown;
  requestFindFirst: unknown;
  requestUpdateMany: unknown;
}> = {}) {
  const tx = {
    providerProfile: {
      findFirst: vi.fn().mockResolvedValue({ id: "provider_1" }),
    },
    quote: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    request: {
      findFirst: vi.fn().mockResolvedValue({
        clientProfile: { userId: "client_user" },
        id: "request_1",
        status: "HIRED",
        targetProviderId: "provider_1",
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };

  if (overrides.providerProfile) {
    tx.providerProfile = overrides.providerProfile as typeof tx.providerProfile;
  }
  if (overrides.quoteUpdateMany) {
    tx.quote.updateMany = overrides.quoteUpdateMany as typeof tx.quote.updateMany;
  }
  if (overrides.requestFindFirst) {
    tx.request.findFirst = overrides.requestFindFirst as typeof tx.request.findFirst;
  }
  if (overrides.requestUpdateMany) {
    tx.request.updateMany = overrides.requestUpdateMany as typeof tx.request.updateMany;
  }

  return {
    client: {
      $transaction: vi.fn((callback) => callback(tx)),
    },
    tx,
  };
}

describe("createRequestForUser", () => {
  it("rejects unauthenticated users", async () => {
    const { client, tx } = createClient();

    const result = await createRequestForUser(createForm(), { client, userId: null });

    expect(result).toEqual({
      ok: false,
      error: "Necesitás iniciar sesión para crear un pedido.",
    });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(tx.request.create).not.toHaveBeenCalled();
  });

  it("creates a directed request for an authenticated client", async () => {
    const { client, tx } = createClient();

    const result = await createRequestForUser(createForm(), {
      client,
      userId: "user_client",
    });

    expect(result).toEqual({ ok: true, data: { requestId: "request_1" } });
    expect(tx.clientProfile.findUnique).toHaveBeenCalledWith({
      select: {
        id: true,
        user: {
          select: { phone: true },
        },
      },
      where: { userId: "user_client" },
    });
    expect(tx.request.create).toHaveBeenCalledWith({
      data: {
        categoryId: "cat_plomeria",
        clientProfileId: "client_real",
        description: "Necesito reparar una perdida debajo de la bacha de la cocina.",
        status: "OPEN",
        targetProviderId: "provider_1",
        title: "Reparar perdida de agua",
        zoneId: "zone_palermo",
      },
      select: { id: true },
    });
  });

  it("rejects an invalid provider", async () => {
    const { client, tx } = createClient({
      provider: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    const result = await createRequestForUser(createForm(), {
      client,
      userId: "user_client",
    });

    expect(result).toEqual({
      ok: false,
      error: "El prestador seleccionado no está disponible.",
      field: "providerId",
    });
    expect(tx.request.create).not.toHaveBeenCalled();
  });

  it("rejects requests directed to the user's own provider profile", async () => {
    const { client, tx } = createClient({
      provider: {
        findFirst: vi.fn().mockResolvedValue({
          id: "provider_1",
          userId: "user_client",
          services: [{ categoryId: "cat_plomeria", id: "service_1" }],
        }),
      },
    });

    const result = await createRequestForUser(createForm(), {
      client,
      userId: "user_client",
    });

    expect(result).toEqual({
      ok: false,
      error: "No podés pedirte presupuesto a tu propio perfil de prestador.",
      field: "providerId",
    });
    expect(tx.request.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    const { client, tx } = createClient();

    const result = await createRequestForUser(createForm({ title: "x" }), {
      client,
      userId: "user_client",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ field: "title" });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(tx.request.create).not.toHaveBeenCalled();
  });

  it("does not allow spoofing clientProfileId from the form", async () => {
    const { client, tx } = createClient();
    const formData = createForm({ clientProfileId: "client_attacker" });

    await createRequestForUser(formData, {
      client,
      userId: "user_client",
    });

    expect(tx.request.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientProfileId: "client_real",
        }),
      }),
    );
    expect(tx.request.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientProfileId: "client_attacker",
        }),
      }),
    );
  });
});

describe("completeRequestForUser", () => {
  it("lets the request owner complete a hired request", async () => {
    const { client, tx } = createStatusClient();

    const result = await completeRequestForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({ ok: true, data: { requestId: "request_1" } });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      data: { status: "COMPLETED" },
      where: {
        clientProfile: {
          user: {
            deletedAt: null,
            id: "client_user",
          },
        },
        deletedAt: null,
        id: "request_1",
        status: "HIRED",
      },
    });
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("does not complete an open request", async () => {
    const { client, tx } = createStatusClient({
      requestUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const result = await completeRequestForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Este pedido no se puede marcar como completado.",
      field: "requestId",
    });
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("does not complete a cancelled request", async () => {
    const { client, tx } = createStatusClient({
      requestUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const result = await completeRequestForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Este pedido no se puede marcar como completado.",
      field: "requestId",
    });
    expect(tx.request.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "HIRED",
        }),
      }),
    );
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("does not let an unrelated user complete a request", async () => {
    const { client, tx } = createStatusClient({
      requestUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const result = await completeRequestForUser(decisionForm(), {
      client,
      userId: "user_other",
    });

    expect(result.ok).toBe(false);
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });
});

describe("cancelRequestForUser", () => {
  it("lets the request owner cancel an open request", async () => {
    const { client, tx } = createStatusClient({
      requestFindFirst: vi.fn().mockResolvedValue({
        clientProfile: { userId: "client_user" },
        id: "request_1",
        status: "OPEN",
        targetProviderId: "provider_1",
      }),
    });

    const result = await cancelRequestForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({ ok: true, data: { requestId: "request_1" } });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      data: { status: "CANCELLED" },
      where: {
        clientProfile: {
          userId: "client_user",
        },
        deletedAt: null,
        id: "request_1",
        status: { in: ["OPEN", "HIRED"] },
      },
    });
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("lets the request owner cancel a hired request", async () => {
    const { client, tx } = createStatusClient();

    const result = await cancelRequestForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({ ok: true, data: { requestId: "request_1" } });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      data: { status: "CANCELLED" },
      where: {
        clientProfile: {
          userId: "client_user",
        },
        deletedAt: null,
        id: "request_1",
        status: { in: ["OPEN", "HIRED"] },
      },
    });
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("lets the directed provider cancel participation and rejects an accepted quote", async () => {
    const { client, tx } = createStatusClient();

    const result = await cancelRequestForUser(decisionForm(), {
      client,
      userId: "provider_user",
    });

    expect(result).toEqual({ ok: true, data: { requestId: "request_1" } });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      data: { status: "CANCELLED" },
      where: {
        deletedAt: null,
        id: "request_1",
        status: { in: ["OPEN", "HIRED"] },
        targetProviderId: "provider_1",
      },
    });
    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      data: { status: "REJECTED" },
      where: {
        providerProfileId: "provider_1",
        requestId: "request_1",
        status: "ACCEPTED",
      },
    });
  });

  it("lets the directed provider cancel an open directed request", async () => {
    const { client, tx } = createStatusClient({
      requestFindFirst: vi.fn().mockResolvedValue({
        clientProfile: { userId: "client_user" },
        id: "request_1",
        status: "OPEN",
        targetProviderId: "provider_1",
      }),
    });

    const result = await cancelRequestForUser(decisionForm(), {
      client,
      userId: "provider_user",
    });

    expect(result).toEqual({ ok: true, data: { requestId: "request_1" } });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      data: { status: "CANCELLED" },
      where: {
        deletedAt: null,
        id: "request_1",
        status: { in: ["OPEN", "HIRED"] },
        targetProviderId: "provider_1",
      },
    });
    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      data: { status: "WITHDRAWN" },
      where: {
        providerProfileId: "provider_1",
        requestId: "request_1",
        status: "PENDING",
      },
    });
  });

  it("does not let an unrelated user cancel a request", async () => {
    const { client, tx } = createStatusClient({
      providerProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: "provider_other" }),
      },
    });

    const result = await cancelRequestForUser(decisionForm(), {
      client,
      userId: "user_other",
    });

    expect(result).toEqual({
      ok: false,
      error: "No podés cancelar este pedido.",
      field: "requestId",
    });
    expect(tx.request.updateMany).not.toHaveBeenCalled();
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it("does not cancel completed or cancelled requests", async () => {
    const { client, tx } = createStatusClient({
      requestFindFirst: vi.fn().mockResolvedValue({
        clientProfile: { userId: "client_user" },
        id: "request_1",
        status: "COMPLETED",
        targetProviderId: "provider_1",
      }),
    });

    const result = await cancelRequestForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Este pedido ya no se puede cancelar.",
      field: "requestId",
    });
    expect(tx.request.updateMany).not.toHaveBeenCalled();
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });
});
