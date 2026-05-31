import {
  providerSearchInputSchema,
  type ParsedProviderSearchInput,
} from "@/server/queries/provider-search";

export const SEARCH_PAGE_SIZE = 10;

export type BuscarSearchParams = {
  categorySlug?: string;
  minRating?: string;
  page?: string;
  priceMax?: string;
  priceMin?: string;
  q?: string;
  verified?: string;
  zoneSlug?: string;
};

export type BuscarSearchInput = ParsedProviderSearchInput;

type SearchParamKey = keyof BuscarSearchParams;

const FILTER_KEYS = [
  "q",
  "categorySlug",
  "zoneSlug",
  "minRating",
  "verified",
  "priceMin",
  "priceMax",
] as const satisfies readonly SearchParamKey[];

const PARSE_ORDER = [
  "q",
  "categorySlug",
  "zoneSlug",
  "minRating",
  "verified",
  "priceMin",
  "priceMax",
  "page",
] as const satisfies readonly SearchParamKey[];

function stripUndefined(input: ParsedProviderSearchInput): ParsedProviderSearchInput {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as ParsedProviderSearchInput;
}

function toRawInput(params: BuscarSearchParams) {
  return {
    categorySlug: params.categorySlug,
    limit: SEARCH_PAGE_SIZE,
    minRating: params.minRating,
    page: params.page,
    priceMax: params.priceMax,
    priceMin: params.priceMin,
    q: params.q,
    verified: params.verified,
    zoneSlug: params.zoneSlug,
  };
}

export function parseBuscarSearchParams(params: BuscarSearchParams): ParsedProviderSearchInput {
  const candidate = toRawInput(params);

  for (let attempt = 0; attempt < PARSE_ORDER.length + 1; attempt += 1) {
    const parsed = providerSearchInputSchema.safeParse(candidate);
    if (parsed.success) return stripUndefined(parsed.data);

    const fields = Object.keys(parsed.error.flatten().fieldErrors) as SearchParamKey[];

    if (fields.includes("priceMin") && candidate.priceMax !== undefined) {
      candidate.priceMin = undefined;
      candidate.priceMax = undefined;
      continue;
    }

    const nextKey = fields.find((field) => field in candidate) ?? PARSE_ORDER[attempt];

    if (!nextKey) break;
    candidate[nextKey] = undefined;
  }

  return stripUndefined(providerSearchInputSchema.parse({ limit: SEARCH_PAGE_SIZE, page: 1 }));
}

export function hasActiveFilters(input: ParsedProviderSearchInput): boolean {
  return FILTER_KEYS.some((key) => input[key] !== undefined);
}

export function getBuscarHref(
  input: ParsedProviderSearchInput,
  overrides: Partial<Record<SearchParamKey, string | number | boolean | null | undefined>> = {},
): string {
  const params = new URLSearchParams();
  const next = { ...input, ...overrides };
  const page = Number(next.page ?? 1);

  for (const key of FILTER_KEYS) {
    const value = next[key];
    if (value === undefined || value === null || value === "" || value === false) continue;
    params.set(key, String(value));
  }

  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/buscar?${query}` : "/buscar";
}

export function getFilterHref(
  input: ParsedProviderSearchInput,
  key: SearchParamKey,
  value: string | number | boolean | null | undefined,
): string {
  return getBuscarHref(input, { [key]: value, page: 1 });
}
