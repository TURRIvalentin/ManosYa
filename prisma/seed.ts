import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ── Categorías (20) ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "plomeria",           name: "Plomería",                        sortOrder: 1  },
  { slug: "electricidad",       name: "Electricidad",                    sortOrder: 2  },
  { slug: "gas-matriculado",    name: "Gas matriculado",                 sortOrder: 3  },
  { slug: "pintura",            name: "Pintura",                         sortOrder: 4  },
  { slug: "albanileria",        name: "Albañilería y construcción",      sortOrder: 5  },
  { slug: "carpinteria",        name: "Carpintería",                     sortOrder: 6  },
  { slug: "limpieza-hogar",     name: "Limpieza del hogar",              sortOrder: 7  },
  { slug: "jardineria",         name: "Jardinería y paisajismo",         sortOrder: 8  },
  { slug: "cerrajeria",         name: "Cerrajería",                      sortOrder: 9  },
  { slug: "tecnico-pc-redes",   name: "Técnico en PC y redes",           sortOrder: 10 },
  { slug: "mudanzas-fletes",    name: "Mudanzas y fletes",               sortOrder: 11 },
  { slug: "aire-acondicionado", name: "Aire acondicionado y refrigeración", sortOrder: 12 },
  { slug: "fumigacion",         name: "Fumigación y control de plagas",  sortOrder: 13 },
  { slug: "herreria",           name: "Herrería y rejas",                sortOrder: 14 },
  { slug: "techista",           name: "Techista e impermeabilización",   sortOrder: 15 },
  { slug: "canos-desagotes",    name: "Caños y desagotes",               sortOrder: 16 },
  { slug: "soldadura",          name: "Soldadura",                       sortOrder: 17 },
  { slug: "vidrieria",          name: "Vidriería",                       sortOrder: 18 },
  { slug: "electrodomesticos",  name: "Reparación de electrodomésticos", sortOrder: 19 },
  { slug: "pintura-exterior",   name: "Pintura exterior y fachadas",     sortOrder: 20 },
];

// ── Barrios de CABA (48 oficiales) ───────────────────────────────────────────

const BARRIOS_CABA = [
  "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano",
  "Boedo", "Caballito", "Chacarita", "Coghlan", "Colegiales",
  "Constitución", "Flores", "Floresta", "La Boca", "Liniers",
  "Mataderos", "Monte Castro", "Monserrat", "Nueva Pompeya", "Núñez",
  "Palermo", "Parque Avellaneda", "Parque Chacabuco", "Parque Chas", "Parque Patricios",
  "Paternal", "Puerto Madero", "Recoleta", "Retiro", "Saavedra",
  "San Cristóbal", "San Nicolás", "San Telmo", "Vélez Sársfield", "Versalles",
  "Villa Crespo", "Villa del Parque", "Villa Devoto", "Villa Gral. Mitre", "Villa Lugano",
  "Villa Luro", "Villa Ortúzar", "Villa Pueyrredón", "Villa Real", "Villa Riachuelo",
  "Villa Santa Rita", "Villa Soldati", "Villa Urquiza",
];

// ── Partidos de GBA (24) ──────────────────────────────────────────────────────

const PARTIDOS_GBA = [
  "Avellaneda", "Quilmes", "Berazategui", "Florencio Varela", "Almirante Brown",
  "Lomas de Zamora", "Lanús", "Esteban Echeverría", "Ezeiza", "La Matanza",
  "Merlo", "Moreno", "General San Martín", "Tres de Febrero", "Hurlingham",
  "Ituzaingó", "Morón", "Vicente López", "San Isidro", "San Fernando",
  "Tigre", "Malvinas Argentinas", "José C. Paz", "San Miguel",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding categories...");
  for (const cat of CATEGORIES) {
    await db.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder, isActive: true },
      update: { name: cat.name, sortOrder: cat.sortOrder, isActive: true },
    });
  }
  console.log(`  ${CATEGORIES.length} categories OK`);

  console.log("Seeding CABA barrios...");
  for (const name of BARRIOS_CABA) {
    const slug = `caba-${toSlug(name)}`;
    await db.zone.upsert({
      where: { slug },
      create: { slug, name, type: "BARRIO_CABA" },
      update: { name },
    });
  }
  console.log(`  ${BARRIOS_CABA.length} barrios CABA OK`);

  console.log("Seeding GBA partidos...");
  for (const name of PARTIDOS_GBA) {
    const slug = `gba-${toSlug(name)}`;
    await db.zone.upsert({
      where: { slug },
      create: { slug, name, type: "PARTIDO_GBA" },
      update: { name },
    });
  }
  console.log(`  ${PARTIDOS_GBA.length} partidos GBA OK`);

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
