import { describe, expect, it } from "vitest";

import {
  getBuscarHref,
  getFilterHref,
  parseBuscarSearchParams,
} from "@/app/(main)/buscar/search-params";

describe("buscar search params", () => {
  it("normalizes valid params for provider search", () => {
    const parsed = parseBuscarSearchParams({
      categorySlug: "plomeria",
      minRating: "4",
      page: "3",
      priceMax: "50000",
      priceMin: "10000",
      q: " plomeria ",
      verified: "true",
      zoneSlug: "caba-palermo",
    });

    expect(parsed).toEqual({
      categorySlug: "plomeria",
      limit: 10,
      minRating: 4,
      page: 3,
      priceMax: 50000,
      priceMin: 10000,
      q: "plomeria",
      verified: true,
      zoneSlug: "caba-palermo",
    });
  });

  it("ignores invalid filters without breaking the page", () => {
    const parsed = parseBuscarSearchParams({
      categorySlug: "../plomeria",
      minRating: "9",
      page: "0",
      priceMax: "1000",
      priceMin: "2000",
      q: "gasista",
      verified: "yes",
      zoneSlug: "caba-palermo",
    });

    expect(parsed).toEqual({
      limit: 10,
      page: 1,
      q: "gasista",
      zoneSlug: "caba-palermo",
    });
  });

  it("resets page when a filter changes", () => {
    const input = parseBuscarSearchParams({
      categorySlug: "plomeria",
      page: "4",
      q: "canilla",
    });

    expect(getFilterHref(input, "zoneSlug", "caba-palermo")).toBe(
      "/buscar?q=canilla&categorySlug=plomeria&zoneSlug=caba-palermo",
    );
  });

  it("keeps pagination only when building page links", () => {
    const input = parseBuscarSearchParams({
      categorySlug: "plomeria",
      page: "2",
      verified: "true",
    });

    expect(getBuscarHref(input, { page: 3 })).toBe(
      "/buscar?categorySlug=plomeria&verified=true&page=3",
    );
  });
});
