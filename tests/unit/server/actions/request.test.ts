import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { createRequestForUser } from "@/server/actions/request";

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
