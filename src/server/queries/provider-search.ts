import { Prisma, type PriceUnit, type ZoneType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const optionalBooleanSchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

const optionalNumberSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().finite().optional());

export const providerSearchInputSchema = z
  .object({
    categorySlug: slugSchema.optional(),
    limit: optionalNumberSchema.default(20).pipe(z.number().int().min(1).max(50)),
    minRating: optionalNumberSchema.pipe(z.number().min(0).max(5).optional()),
    page: optionalNumberSchema.default(1).pipe(z.number().int().min(1).max(500)),
    priceMax: optionalNumberSchema.pipe(z.number().min(0).optional()),
    priceMin: optionalNumberSchema.pipe(z.number().min(0).optional()),
    q: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => (value ? value : undefined)),
    verified: optionalBooleanSchema,
    zoneSlug: slugSchema.optional(),
  })
  .refine(
    (value) =>
      value.priceMin === undefined ||
      value.priceMax === undefined ||
      value.priceMin <= value.priceMax,
    {
      message: "El precio mínimo no puede ser mayor al precio máximo.",
      path: ["priceMin"],
    },
  );

export type ProviderSearchInput = z.input<typeof providerSearchInputSchema>;
export type ParsedProviderSearchInput = z.output<typeof providerSearchInputSchema>;

export type ProviderSearchResult = {
  id: string;
  avatarUrl: string | null;
  bio: string | null;
  isFeatured: boolean;
  isVerified: boolean;
  name: string | null;
  primaryService: {
    id: string;
    category: {
      id: string;
      iconName: string | null;
      name: string;
      slug: string;
    };
    priceFrom: string | null;
    priceTo: string | null;
    priceUnit: PriceUnit;
    title: string;
  };
  ratingAvg: number;
  ratingCount: number;
  zones: Array<{
    id: string;
    name: string;
    slug: string;
    type: ZoneType;
  }>;
};

export type ProviderSearchResponse = {
  hasMore: boolean;
  items: ProviderSearchResult[];
  limit: number;
  page: number;
};

type ProviderSearchRow = {
  provider_id: string;
  avatar_url: string | null;
  bio: string | null;
  is_featured: boolean;
  is_verified: boolean;
  name: string | null;
  rating_avg: number | Prisma.Decimal;
  rating_count: number;
  service_id: string;
  service_title: string;
  price_from: Prisma.Decimal | string | number | null;
  price_to: Prisma.Decimal | string | number | null;
  price_unit: PriceUnit;
  category_id: string;
  category_icon_name: string | null;
  category_name: string;
  category_slug: string;
  zones: unknown;
};

type Queryable = Pick<typeof db, "$queryRaw">;

// Fase 2B arranca con paginación offset-based por simplicidad operativa.
// Migrar a cursor pagination cuando haya suficiente volumen real de resultados.
function decimalToString(value: Prisma.Decimal | string | number | null): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") return JSON.parse(value) as T[];
  return [];
}

function buildTextRank(input: ParsedProviderSearchInput): Prisma.Sql {
  if (!input.q) return Prisma.sql`0::double precision`;

  return Prisma.sql`
    ts_rank_cd(
      to_tsvector(
        'spanish_unaccent',
        f_unaccent(ps."title") || ' ' || f_unaccent(coalesce(ps."description", ''))
      ),
      websearch_to_tsquery('spanish_unaccent', f_unaccent(${input.q}))
    )
    +
    ts_rank_cd(
      to_tsvector('spanish_unaccent', f_unaccent(coalesce(pp."bio", ''))),
      websearch_to_tsquery('spanish_unaccent', f_unaccent(${input.q}))
    )
    +
    CASE WHEN u."name" ILIKE ${`%${input.q}%`} THEN 0.2 ELSE 0 END
  `;
}

function buildWhereClauses(input: ParsedProviderSearchInput): Prisma.Sql[] {
  const clauses = [
    Prisma.sql`ps."isActive" = true`,
    Prisma.sql`u."deletedAt" IS NULL`,
    Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "ProviderZone" pz_ready
        WHERE pz_ready."providerProfileId" = pp."id"
      )
    `,
  ];

  if (input.categorySlug) {
    clauses.push(Prisma.sql`c."slug" = ${input.categorySlug}`);
  }

  if (input.zoneSlug) {
    clauses.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "ProviderZone" pz_filter
        JOIN "Zone" z_filter ON z_filter."id" = pz_filter."zoneId"
        WHERE pz_filter."providerProfileId" = pp."id"
          AND z_filter."slug" = ${input.zoneSlug}
      )
    `);
  }

  if (input.minRating !== undefined) {
    clauses.push(Prisma.sql`pp."ratingAvg" >= ${input.minRating}`);
  }

  if (input.verified !== undefined) {
    clauses.push(Prisma.sql`pp."isVerified" = ${input.verified}`);
  }

  if (input.priceMin !== undefined || input.priceMax !== undefined) {
    const priceClauses = [
      Prisma.sql`ps."priceUnit" <> 'A_CONVENIR'`,
      Prisma.sql`ps."priceFrom" IS NOT NULL`,
    ];

    if (input.priceMin !== undefined) {
      priceClauses.push(
        Prisma.sql`coalesce(ps."priceTo", ps."priceFrom") >= ${input.priceMin}`,
      );
    }

    if (input.priceMax !== undefined) {
      priceClauses.push(Prisma.sql`ps."priceFrom" <= ${input.priceMax}`);
    }

    clauses.push(Prisma.sql`(${Prisma.join(priceClauses, " AND ")})`);
  }

  if (input.q) {
    clauses.push(Prisma.sql`
      (
        to_tsvector(
          'spanish_unaccent',
          f_unaccent(ps."title") || ' ' || f_unaccent(coalesce(ps."description", ''))
        ) @@ websearch_to_tsquery('spanish_unaccent', f_unaccent(${input.q}))
        OR to_tsvector('spanish_unaccent', f_unaccent(coalesce(pp."bio", '')))
          @@ websearch_to_tsquery('spanish_unaccent', f_unaccent(${input.q}))
        OR u."name" ILIKE ${`%${input.q}%`}
      )
    `);
  }

  return clauses;
}

export function buildProviderSearchQuery(input: ParsedProviderSearchInput): Prisma.Sql {
  const textRank = buildTextRank(input);
  const whereClauses = buildWhereClauses(input);
  const offset = (input.page - 1) * input.limit;
  const queryLimit = input.limit + 1;

  return Prisma.sql`
    WITH service_matches AS (
      SELECT
        pp."id" AS provider_id,
        pp."avatarUrl" AS avatar_url,
        pp."bio" AS bio,
        pp."isFeatured" AS is_featured,
        pp."isVerified" AS is_verified,
        pp."ratingAvg" AS rating_avg,
        pp."ratingCount" AS rating_count,
        u."name" AS name,
        ps."id" AS service_id,
        ps."title" AS service_title,
        ps."priceFrom" AS price_from,
        ps."priceTo" AS price_to,
        ps."priceUnit" AS price_unit,
        c."id" AS category_id,
        c."iconName" AS category_icon_name,
        c."name" AS category_name,
        c."slug" AS category_slug,
        (${textRank}) AS text_rank,
        coalesce(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', z."id",
                'name', z."name",
                'slug', z."slug",
                'type', z."type"
              )
              ORDER BY z."type", z."name"
            )
            FROM "ProviderZone" pz
            JOIN "Zone" z ON z."id" = pz."zoneId"
            WHERE pz."providerProfileId" = pp."id"
          ),
          '[]'::jsonb
        ) AS zones
      FROM "ProviderService" ps
      JOIN "ProviderProfile" pp ON pp."id" = ps."providerProfileId"
      JOIN "User" u ON u."id" = pp."userId"
      JOIN "Category" c ON c."id" = ps."categoryId"
      WHERE ${Prisma.join(whereClauses, " AND ")}
    ),
    ranked AS (
      SELECT
        *,
        row_number() OVER (
          PARTITION BY provider_id
          ORDER BY
            is_featured DESC,
            text_rank DESC,
            rating_avg DESC,
            rating_count DESC,
            service_id ASC
        ) AS provider_service_rank
      FROM service_matches
    )
    SELECT
      provider_id,
      avatar_url,
      bio,
      is_featured,
      is_verified,
      rating_avg,
      rating_count,
      name,
      service_id,
      service_title,
      price_from,
      price_to,
      price_unit,
      category_id,
      category_icon_name,
      category_name,
      category_slug,
      zones
    FROM ranked
    WHERE provider_service_rank = 1
    ORDER BY
      is_featured DESC,
      text_rank DESC,
      rating_avg DESC,
      rating_count DESC,
      provider_id ASC
    LIMIT ${queryLimit}
    OFFSET ${offset}
  `;
}

function mapProviderSearchRow(row: ProviderSearchRow): ProviderSearchResult {
  return {
    id: row.provider_id,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isFeatured: row.is_featured,
    isVerified: row.is_verified,
    name: row.name,
    primaryService: {
      id: row.service_id,
      category: {
        id: row.category_id,
        iconName: row.category_icon_name,
        name: row.category_name,
        slug: row.category_slug,
      },
      priceFrom: decimalToString(row.price_from),
      priceTo: decimalToString(row.price_to),
      priceUnit: row.price_unit,
      title: row.service_title,
    },
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    zones: parseJsonArray<ProviderSearchResult["zones"][number]>(row.zones),
  };
}

export async function searchProviders(
  rawInput: ProviderSearchInput,
  client: Queryable = db,
): Promise<ProviderSearchResponse> {
  const input = providerSearchInputSchema.parse(rawInput);
  const query = buildProviderSearchQuery(input);
  const rows = await client.$queryRaw<ProviderSearchRow[]>(query);
  const pageRows = rows.slice(0, input.limit);

  return {
    hasMore: rows.length > input.limit,
    items: pageRows.map(mapProviderSearchRow),
    limit: input.limit,
    page: input.page,
  };
}
