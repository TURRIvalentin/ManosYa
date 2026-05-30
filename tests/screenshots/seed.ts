/**
 * Screenshot seed — creates stable test users for UI state captures.
 * Idempotent: safe to run multiple times (deletes & recreates test rows).
 *
 * All test emails use the @manosya.test domain so they're easy to purge.
 */
import { db } from "../../src/lib/db";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const SS_PASSWORD = "Test1234!";
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

// Valid CUIL for test users: 20-12345678-6 (verifier computed correctly)
const TEST_CUIL = "20123456786";

const TEST_EMAILS = [
  "ss-existing@manosya.test",
  "ss-fresh@manosya.test",
  "ss-client@manosya.test",
  "ss-cuil@manosya.test",
  "ss-midflow@manosya.test",
  "ss-docsready@manosya.test",
  "ss-unverified@manosya.test",
];

export async function runSeed() {
  const passwordHash = await hash(SS_PASSWORD, ARGON2_OPTS);

  // Delete previous test data (cascade handles profiles, zones, services)
  await db.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });

  // Seed shared zones (needed for zonas step and for provider-docsready)
  const [zonePalermo, zoneQuilmes] = await Promise.all([
    db.zone.upsert({
      where: { slug: "ss-palermo" },
      create: { slug: "ss-palermo", name: "Palermo", type: "BARRIO_CABA" },
      update: {},
    }),
    db.zone.upsert({
      where: { slug: "ss-quilmes" },
      create: { slug: "ss-quilmes", name: "Quilmes", type: "PARTIDO_GBA" },
      update: {},
    }),
  ]);

  // Seed shared category (needed for servicios step and docsready service)
  const categoryGasista = await db.category.upsert({
    where: { slug: "ss-gasista" },
    create: {
      slug: "ss-gasista",
      name: "Gasista",
      isActive: true,
      sortOrder: 99,
    },
    update: {},
  });

  // ── 1. ss-fresh: verified, no profiles → lands on tipo-cuenta (step 1) ─────
  const fresh = await db.user.create({
    data: {
      email: "ss-fresh@manosya.test",
      name: "SS Fresh",
      emailVerified: new Date(),
      passwordHash,
    },
  });

  // ── 2. ss-existing: verified client (for duplicate-email error screenshot) ──
  const existing = await db.user.create({
    data: {
      email: "ss-existing@manosya.test",
      name: "SS Existing",
      emailVerified: new Date(),
      passwordHash,
      phone: "+5491155551001",
      clientProfile: { create: {} },
    },
  });

  // ── 2. ss-client: verified client (general screenshots + login) ──────────
  const client = await db.user.create({
    data: {
      email: "ss-client@manosya.test",
      name: "SS Cliente",
      emailVerified: new Date(),
      passwordHash,
      phone: "+5491155551002",
      clientProfile: { create: {} },
    },
  });

  // ── 3. ss-cuil: provider-only, phone set, NO cuil → step cuil (3/6) ──────
  const providerNoCuil = await db.user.create({
    data: {
      email: "ss-cuil@manosya.test",
      name: "SS Sin CUIL",
      emailVerified: new Date(),
      passwordHash,
      phone: "+5491155551003",
      providerProfile: { create: {} },
    },
  });

  // ── 4. ss-midflow: provider-only, phone + cuil, NO zones → step zonas (4/6) ─
  const providerNoZones = await db.user.create({
    data: {
      email: "ss-midflow@manosya.test",
      name: "SS Midflow",
      emailVerified: new Date(),
      passwordHash,
      phone: "+5491155551004",
      providerProfile: { create: { cuil: TEST_CUIL } },
    },
  });

  // ── 5. ss-docsready: complete provider (cuil + zone + service) ────────────
  //    hasCompletedOnboarding = true, can navigate to /onboarding/documentos
  const providerDocsReady = await db.user.create({
    data: {
      email: "ss-docsready@manosya.test",
      name: "SS Docs Ready",
      emailVerified: new Date(),
      passwordHash,
      phone: "+5491155551005",
      providerProfile: { create: { cuil: TEST_CUIL } },
    },
    select: { id: true, email: true, providerProfile: { select: { id: true } } },
  });

  const docsProfileId = providerDocsReady.providerProfile!.id;
  await db.providerZone.create({
    data: { providerProfileId: docsProfileId, zoneId: zonePalermo.id },
  });
  await db.providerService.create({
    data: {
      providerProfileId: docsProfileId,
      categoryId: categoryGasista.id,
      title: "Instalación de calefón",
      priceUnit: "POR_TRABAJO",
      isActive: true,
    },
  });

  // ── 6. ss-unverified: email NOT verified, fresh verification token ────────
  const unverified = await db.user.create({
    data: {
      email: "ss-unverified@manosya.test",
      name: "SS Unverified",
      emailVerified: null,
      passwordHash,
    },
  });

  const verificationToken = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: {
      identifier: "ss-unverified@manosya.test",
      token: verificationToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const seedData = {
    password: SS_PASSWORD,
    users: {
      fresh: { email: fresh.email, id: fresh.id },
      existing: { email: existing.email, id: existing.id },
      client: { email: client.email, id: client.id },
      providerNoCuil: { email: providerNoCuil.email, id: providerNoCuil.id },
      providerNoZones: { email: providerNoZones.email, id: providerNoZones.id },
      providerDocsReady: {
        email: providerDocsReady.email,
        id: providerDocsReady.id,
      },
      unverified: {
        email: unverified.email,
        id: unverified.id,
        verificationToken,
      },
    },
    zones: { palermo: zonePalermo.id, quilmes: zoneQuilmes.id },
    categories: { gasista: categoryGasista.id },
  };

  const outDir = path.join(process.cwd(), ".playwright");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "screenshot-seed.json"),
    JSON.stringify(seedData, null, 2),
  );

  return seedData;
}
