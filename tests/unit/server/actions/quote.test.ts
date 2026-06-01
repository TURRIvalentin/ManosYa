import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { acceptQuoteForUser, createQuoteForUser, rejectQuoteForUser } from "@/server/actions/quote";

function createForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("comment", "Incluye materiales basicos y mano de obra.");
  formData.set("estimatedDays", "3");
  formData.set("price", "45000");
  formData.set("requestId", "request_1");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

function decisionForm(quoteId = "quote_1") {
  const formData = new FormData();
  formData.set("quoteId", quoteId);
  return formData;
}

function createClient(
  overrides: Partial<{
    existingQuote: unknown;
    providerProfile: unknown;
    quote: unknown;
    quoteFindFirst: unknown;
    quoteUpdateMany: unknown;
    request: unknown;
    requestUpdateMany: unknown;
  }> = {},
) {
  const tx = {
    providerProfile: {
      findFirst: vi.fn().mockResolvedValue({ id: "provider_1" }),
    },
    quote: {
      create: vi.fn().mockResolvedValue({ id: "quote_1" }),
      findFirst: vi.fn().mockResolvedValue({
        id: "quote_1",
        request: {
          id: "request_1",
          status: "OPEN",
        },
        requestId: "request_1",
        status: "PENDING",
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    request: {
      findFirst: vi.fn().mockResolvedValue({
        id: "request_1",
        status: "OPEN",
        targetProviderId: "provider_1",
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };

  if (overrides.providerProfile) {
    tx.providerProfile = overrides.providerProfile as typeof tx.providerProfile;
  }
  if (overrides.request) tx.request.findFirst = overrides.request as typeof tx.request.findFirst;
  if (overrides.requestUpdateMany) {
    tx.request.updateMany = overrides.requestUpdateMany as typeof tx.request.updateMany;
  }
  if (overrides.existingQuote) {
    tx.quote.findUnique = overrides.existingQuote as typeof tx.quote.findUnique;
  }
  if (overrides.quoteFindFirst) {
    tx.quote.findFirst = overrides.quoteFindFirst as typeof tx.quote.findFirst;
  }
  if (overrides.quoteUpdateMany) {
    tx.quote.updateMany = overrides.quoteUpdateMany as typeof tx.quote.updateMany;
  }
  if (overrides.quote) tx.quote.create = overrides.quote as typeof tx.quote.create;

  return {
    client: {
      $transaction: vi.fn((callback) => callback(tx)),
    },
    tx,
  };
}

describe("createQuoteForUser", () => {
  it("allows the directed provider to create a quote without changing the request status", async () => {
    const { client, tx } = createClient();

    const result = await createQuoteForUser(createForm(), {
      client,
      userId: "provider_user",
    });

    expect(result).toEqual({
      ok: true,
      data: { quoteId: "quote_1", requestId: "request_1" },
    });
    expect(tx.providerProfile.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        user: {
          deletedAt: null,
          id: "provider_user",
        },
      },
    });
    expect(tx.quote.create).toHaveBeenCalledWith({
      data: {
        comment: "Incluye materiales basicos y mano de obra.",
        estimatedDays: 3,
        price: 45000,
        providerProfileId: "provider_1",
        requestId: "request_1",
        status: "PENDING",
      },
      select: { id: true },
    });
    expect(tx.request.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a provider that is not the request target", async () => {
    const { client, tx } = createClient({
      request: vi.fn().mockResolvedValue({
        id: "request_1",
        status: "OPEN",
        targetProviderId: "provider_other",
      }),
    });

    const result = await createQuoteForUser(createForm(), {
      client,
      userId: "provider_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "No podés presupuestar un pedido dirigido a otro prestador.",
      field: "requestId",
    });
    expect(tx.quote.create).not.toHaveBeenCalled();
  });

  it("rejects clients without a provider profile", async () => {
    const { client, tx } = createClient({
      providerProfile: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    const result = await createQuoteForUser(createForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Solo un prestador puede enviar presupuestos.",
    });
    expect(tx.quote.create).not.toHaveBeenCalled();
  });

  it("rejects closed requests", async () => {
    const { client, tx } = createClient({
      request: vi.fn().mockResolvedValue({
        id: "request_1",
        status: "QUOTED",
        targetProviderId: "provider_1",
      }),
    });

    const result = await createQuoteForUser(createForm(), {
      client,
      userId: "provider_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Este pedido ya no acepta presupuestos.",
      field: "requestId",
    });
    expect(tx.quote.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    const { client, tx } = createClient();

    const result = await createQuoteForUser(createForm(), { client, userId: null });

    expect(result).toEqual({
      ok: false,
      error: "Necesitás iniciar sesión para enviar un presupuesto.",
    });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(tx.quote.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    const { client, tx } = createClient();

    const result = await createQuoteForUser(createForm({ price: "nope" }), {
      client,
      userId: "provider_user",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ field: "price" });
    expect(client.$transaction).not.toHaveBeenCalled();
    expect(tx.quote.create).not.toHaveBeenCalled();
  });
});

describe("acceptQuoteForUser", () => {
  it("lets the request owner accept a pending quote and hires the request", async () => {
    const { client, tx } = createClient();

    const result = await acceptQuoteForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: true,
      data: { quoteId: "quote_1", requestId: "request_1" },
    });
    expect(tx.request.updateMany).toHaveBeenCalledWith({
      data: { status: "HIRED" },
      where: {
        clientProfile: {
          userId: "client_user",
        },
        deletedAt: null,
        id: "request_1",
        status: "OPEN",
      },
    });
    expect(tx.quote.updateMany).toHaveBeenNthCalledWith(1, {
      data: { status: "ACCEPTED" },
      where: {
        id: "quote_1",
        requestId: "request_1",
        status: "PENDING",
      },
    });
    expect(tx.quote.updateMany).toHaveBeenNthCalledWith(2, {
      data: { status: "REJECTED" },
      where: {
        id: { not: "quote_1" },
        requestId: "request_1",
        status: "PENDING",
      },
    });
  });

  it("rejects quotes from another user's request", async () => {
    const { client, tx } = createClient({
      quoteFindFirst: vi.fn().mockResolvedValue(null),
    });

    const result = await acceptQuoteForUser(decisionForm(), {
      client,
      userId: "client_other",
    });

    expect(result).toEqual({
      ok: false,
      error: "El presupuesto no está disponible.",
      field: "quoteId",
    });
    expect(tx.request.updateMany).not.toHaveBeenCalled();
  });

  it("does not let a provider accept their own quote", async () => {
    const { client, tx } = createClient({
      quoteFindFirst: vi.fn().mockResolvedValue(null),
    });

    const result = await acceptQuoteForUser(decisionForm(), {
      client,
      userId: "provider_user",
    });

    expect(result.ok).toBe(false);
    expect(tx.request.updateMany).not.toHaveBeenCalled();
  });

  it("rejects quotes for closed requests", async () => {
    const { client, tx } = createClient({
      quoteFindFirst: vi.fn().mockResolvedValue({
        id: "quote_1",
        request: {
          id: "request_1",
          status: "HIRED",
        },
        requestId: "request_1",
        status: "PENDING",
      }),
    });

    const result = await acceptQuoteForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Este pedido ya no acepta presupuestos.",
      field: "quoteId",
    });
    expect(tx.request.updateMany).not.toHaveBeenCalled();
  });

  it("prevents double acceptance by requiring the request to still be open", async () => {
    const { client, tx } = createClient({
      requestUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const result = await acceptQuoteForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: false,
      error: "Este pedido ya no está abierto.",
      field: "quoteId",
    });
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });
});

describe("rejectQuoteForUser", () => {
  it("rejects a pending quote and keeps the request open", async () => {
    const { client, tx } = createClient();

    const result = await rejectQuoteForUser(decisionForm(), {
      client,
      userId: "client_user",
    });

    expect(result).toEqual({
      ok: true,
      data: { quoteId: "quote_1", requestId: "request_1" },
    });
    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      data: { status: "REJECTED" },
      where: {
        id: "quote_1",
        requestId: "request_1",
        status: "PENDING",
      },
    });
    expect(tx.request.updateMany).not.toHaveBeenCalled();
  });
});
