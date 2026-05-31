import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BuscarPage from "@/app/(main)/buscar/page";
import { getProviderSearchFilterOptions } from "@/server/queries/provider-search-filters";
import { searchProviders } from "@/server/queries/provider-search";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/server/queries/provider-search-filters", () => ({
  getProviderSearchFilterOptions: vi.fn(),
}));

vi.mock("@/server/queries/provider-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/queries/provider-search")>();
  return {
    ...actual,
    searchProviders: vi.fn(),
  };
});

const filterOptions = {
  categories: [
    {
      name: "Plomeria",
      slug: "plomeria",
    },
  ],
  zones: [
    {
      name: "Palermo",
      slug: "caba-palermo",
      type: "BARRIO_CABA",
    },
  ],
};

const emptyResults = {
  hasMore: false,
  items: [],
  limit: 10,
  page: 1,
};

describe("BuscarPage filters", () => {
  beforeEach(() => {
    vi.mocked(getProviderSearchFilterOptions).mockResolvedValue(filterOptions);
    vi.mocked(searchProviders).mockResolvedValue(emptyResults);
  });

  it("passes valid search params to searchProviders", async () => {
    await BuscarPage({
      searchParams: Promise.resolve({
        categorySlug: "plomeria",
        minRating: "4",
        page: "2",
        priceMax: "50000",
        priceMin: "10000",
        q: "plomeria",
        verified: "true",
        zoneSlug: "caba-palermo",
      }),
    });

    expect(searchProviders).toHaveBeenCalledWith({
      categorySlug: "plomeria",
      limit: 10,
      minRating: 4,
      page: 2,
      priceMax: 50000,
      priceMin: 10000,
      q: "plomeria",
      verified: true,
      zoneSlug: "caba-palermo",
    });
  });

  it("ignores invalid filters and still renders the page", async () => {
    const element = await BuscarPage({
      searchParams: Promise.resolve({
        categorySlug: "../bad",
        minRating: "8",
        page: "0",
        q: "gasista",
        verified: "maybe",
      }),
    });

    render(element);

    expect(screen.getByText("No encontramos prestadores con esos filtros")).toBeInTheDocument();
    expect(searchProviders).toHaveBeenCalledWith({
      limit: 10,
      page: 1,
      q: "gasista",
    });
  });

  it("links clear filters actions back to /buscar", async () => {
    const element = await BuscarPage({
      searchParams: Promise.resolve({
        categorySlug: "plomeria",
        q: "canilla",
      }),
    });

    render(element);

    const clearLinks = screen.getAllByRole("link", { name: "Limpiar filtros" });
    expect(clearLinks.length).toBeGreaterThan(0);
    expect(clearLinks.every((link) => link.getAttribute("href") === "/buscar")).toBe(true);
  });
});
