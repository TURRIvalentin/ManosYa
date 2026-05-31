import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CATEGORIES = [
  { slug: "plomeria", name: "Plomería", sortOrder: 1 },
  { slug: "electricidad", name: "Electricidad", sortOrder: 2 },
  { slug: "gas-matriculado", name: "Gas matriculado", sortOrder: 3 },
  { slug: "pintura", name: "Pintura", sortOrder: 4 },
  { slug: "albanileria", name: "Albañilería y construcción", sortOrder: 5 },
  { slug: "carpinteria", name: "Carpintería", sortOrder: 6 },
  { slug: "limpieza-hogar", name: "Limpieza del hogar", sortOrder: 7 },
  { slug: "jardineria", name: "Jardinería y paisajismo", sortOrder: 8 },
  { slug: "cerrajeria", name: "Cerrajería", sortOrder: 9 },
  { slug: "tecnico-pc-redes", name: "Técnico en PC y redes", sortOrder: 10 },
  { slug: "mudanzas-fletes", name: "Mudanzas y fletes", sortOrder: 11 },
  { slug: "aire-acondicionado", name: "Aire acondicionado y refrigeración", sortOrder: 12 },
  { slug: "fumigacion", name: "Fumigación y control de plagas", sortOrder: 13 },
  { slug: "herreria", name: "Herrería y rejas", sortOrder: 14 },
  { slug: "techista", name: "Techista e impermeabilización", sortOrder: 15 },
  { slug: "canos-desagotes", name: "Caños y desagotes", sortOrder: 16 },
  { slug: "soldadura", name: "Soldadura", sortOrder: 17 },
  { slug: "vidrieria", name: "Vidriería", sortOrder: 18 },
  { slug: "electrodomesticos", name: "Reparación de electrodomésticos", sortOrder: 19 },
  { slug: "pintura-exterior", name: "Pintura exterior y fachadas", sortOrder: 20 },
];

const BARRIOS_CABA = [
  "Agronomía",
  "Almagro",
  "Balvanera",
  "Barracas",
  "Belgrano",
  "Boedo",
  "Caballito",
  "Chacarita",
  "Coghlan",
  "Colegiales",
  "Constitución",
  "Flores",
  "Floresta",
  "La Boca",
  "Liniers",
  "Mataderos",
  "Monte Castro",
  "Monserrat",
  "Nueva Pompeya",
  "Núñez",
  "Palermo",
  "Parque Avellaneda",
  "Parque Chacabuco",
  "Parque Chas",
  "Parque Patricios",
  "Paternal",
  "Puerto Madero",
  "Recoleta",
  "Retiro",
  "Saavedra",
  "San Cristóbal",
  "San Nicolás",
  "San Telmo",
  "Vélez Sársfield",
  "Versalles",
  "Villa Crespo",
  "Villa del Parque",
  "Villa Devoto",
  "Villa Gral. Mitre",
  "Villa Lugano",
  "Villa Luro",
  "Villa Ortúzar",
  "Villa Pueyrredón",
  "Villa Real",
  "Villa Riachuelo",
  "Villa Santa Rita",
  "Villa Soldati",
  "Villa Urquiza",
];

const PARTIDOS_GBA = [
  "Avellaneda",
  "Quilmes",
  "Berazategui",
  "Florencio Varela",
  "Almirante Brown",
  "Lomas de Zamora",
  "Lanús",
  "Esteban Echeverría",
  "Ezeiza",
  "La Matanza",
  "Merlo",
  "Moreno",
  "General San Martín",
  "Tres de Febrero",
  "Hurlingham",
  "Ituzaingó",
  "Morón",
  "Vicente López",
  "San Isidro",
  "San Fernando",
  "Tigre",
  "Malvinas Argentinas",
  "José C. Paz",
  "San Miguel",
];

type DemoProvider = {
  bio: string;
  email: string;
  isFeatured: boolean;
  isVerified: boolean;
  name: string;
  ratingAvg: number;
  ratingCount: number;
  services: Array<{
    categorySlug: string;
    description: string;
    priceFrom: string;
    priceTo?: string;
    priceUnit: "POR_HORA" | "POR_TRABAJO" | "POR_M2" | "A_CONVENIR";
    title: string;
  }>;
  zoneSlugs: string[];
};

const DEMO_PROVIDERS: DemoProvider[] = [
  {
    bio: "Equipo familiar especializado en plomería domiciliaria, detección de pérdidas y arreglos de urgencia en edificios.",
    email: "manosya.demo+aguasur@example.test",
    isFeatured: true,
    isVerified: true,
    name: "AquaSur Soluciones",
    ratingAvg: 4.8,
    ratingCount: 42,
    services: [
      {
        categorySlug: "plomeria",
        description:
          "Reparación de canillas, mochilas, pérdidas y cambio de flexibles con materiales acordados antes de iniciar.",
        priceFrom: "18000",
        priceTo: "45000",
        priceUnit: "POR_TRABAJO",
        title: "Plomería integral y reparaciones en el día",
      },
    ],
    zoneSlugs: ["caba-palermo", "caba-belgrano", "caba-colegiales"],
  },
  {
    bio: "Electricistas matriculados para viviendas, locales y consorcios. Trabajamos con tablero, térmicas y puesta a tierra.",
    email: "manosya.demo+voltio@example.test",
    isFeatured: true,
    isVerified: true,
    name: "Voltio Norte",
    ratingAvg: 4.7,
    ratingCount: 31,
    services: [
      {
        categorySlug: "electricidad",
        description:
          "Revisión de cortocircuitos, instalación de luminarias y normalización de tableros domiciliarios.",
        priceFrom: "22000",
        priceTo: "85000",
        priceUnit: "POR_TRABAJO",
        title: "Electricidad segura para hogares y comercios",
      },
    ],
    zoneSlugs: ["caba-nunez", "caba-belgrano", "gba-vicente-lopez"],
  },
  {
    bio: "Pintura prolija para departamentos, oficinas y frentes chicos. Presupuestos claros por ambiente o por metro cuadrado.",
    email: "manosya.demo+brocha@example.test",
    isFeatured: false,
    isVerified: true,
    name: "Brocha Fina",
    ratingAvg: 4.5,
    ratingCount: 18,
    services: [
      {
        categorySlug: "pintura",
        description:
          "Preparación de paredes, enduido, lijado, pintura látex y esmaltes según necesidad del espacio.",
        priceFrom: "3500",
        priceTo: "6500",
        priceUnit: "POR_M2",
        title: "Pintura interior por ambiente",
      },
    ],
    zoneSlugs: ["caba-caballito", "caba-almagro", "caba-villa-crespo"],
  },
  {
    bio: "Servicio técnico de gas con foco en cocinas, calefones y pruebas de hermeticidad. Atención coordinada por zona.",
    email: "manosya.demo+gascheck@example.test",
    isFeatured: false,
    isVerified: true,
    name: "GasCheck Matriculados",
    ratingAvg: 4.9,
    ratingCount: 56,
    services: [
      {
        categorySlug: "gas-matriculado",
        description:
          "Instalación y revisión de artefactos a gas, detección de pérdidas y conexión segura de cocinas.",
        priceFrom: "30000",
        priceTo: "95000",
        priceUnit: "POR_TRABAJO",
        title: "Gasista matriculado para instalaciones y control",
      },
    ],
    zoneSlugs: ["caba-flores", "caba-caballito", "gba-lanus"],
  },
  {
    bio: "Limpieza profunda para mudanzas, alquileres temporarios y mantenimiento semanal. Llevamos insumos propios.",
    email: "manosya.demo+brillocaba@example.test",
    isFeatured: false,
    isVerified: false,
    name: "Brillo CABA",
    ratingAvg: 4.2,
    ratingCount: 14,
    services: [
      {
        categorySlug: "limpieza-hogar",
        description:
          "Limpieza de cocina, baño, vidrios accesibles, pisos y repaso general para entrega o ingreso.",
        priceFrom: "12000",
        priceTo: "28000",
        priceUnit: "POR_HORA",
        title: "Limpieza profunda por hora",
      },
    ],
    zoneSlugs: ["caba-recoleta", "caba-palermo", "caba-retiro"],
  },
  {
    bio: "Carpintería a medida para optimizar espacios chicos. Diseñamos, fabricamos e instalamos muebles funcionales.",
    email: "manosya.demo+maderaurbana@example.test",
    isFeatured: true,
    isVerified: false,
    name: "Madera Urbana",
    ratingAvg: 4.6,
    ratingCount: 23,
    services: [
      {
        categorySlug: "carpinteria",
        description:
          "Estantes, bajo mesadas, placares y arreglos de puertas con visita técnica previa.",
        priceFrom: "45000",
        priceTo: "180000",
        priceUnit: "POR_TRABAJO",
        title: "Carpintería a medida y arreglos",
      },
    ],
    zoneSlugs: ["caba-villa-urquiza", "caba-saavedra", "gba-san-isidro"],
  },
  {
    bio: "Plomeros con experiencia en consorcios y departamentos antiguos. Coordinamos visitas por la tarde y sábados.",
    email: "manosya.demo+canillafacil@example.test",
    isFeatured: false,
    isVerified: false,
    name: "Canilla Fácil",
    ratingAvg: 3.9,
    ratingCount: 9,
    services: [
      {
        categorySlug: "plomeria",
        description: "Destapaciones simples, cambio de grifería, reparación de mochilas y pérdidas visibles.",
        priceFrom: "14000",
        priceTo: "38000",
        priceUnit: "POR_TRABAJO",
        title: "Arreglos de plomería para departamentos",
      },
    ],
    zoneSlugs: ["caba-san-telmo", "caba-monserrat", "caba-barracas"],
  },
  {
    bio: "Trabajos eléctricos chicos con respuesta rápida en zona oeste. Ideal para luminarias, enchufes y térmicas.",
    email: "manosya.demo+enchufeoeste@example.test",
    isFeatured: false,
    isVerified: false,
    name: "Enchufe Oeste",
    ratingAvg: 4.1,
    ratingCount: 12,
    services: [
      {
        categorySlug: "electricidad",
        description: "Instalación de tomas, cambio de llaves, búsqueda de fallas y colocación de artefactos.",
        priceFrom: "16000",
        priceTo: "52000",
        priceUnit: "POR_TRABAJO",
        title: "Electricidad domiciliaria simple",
      },
    ],
    zoneSlugs: ["gba-moron", "gba-ituzaingo", "gba-hurlingham"],
  },
  {
    bio: "Pintores para casas y PH en zona sur. Cuidamos muebles y pisos, dejamos el espacio listo para usar.",
    email: "manosya.demo+colorurbano@example.test",
    isFeatured: false,
    isVerified: true,
    name: "Color Urbano Sur",
    ratingAvg: 4.4,
    ratingCount: 20,
    services: [
      {
        categorySlug: "pintura",
        description: "Pintura interior, cielorrasos, frentes bajos y pequeñas reparaciones de pared.",
        priceFrom: "3200",
        priceTo: "5800",
        priceUnit: "POR_M2",
        title: "Pintura interior y retoques",
      },
    ],
    zoneSlugs: ["gba-quilmes", "gba-avellaneda", "gba-lomas-de-zamora"],
  },
  {
    bio: "Limpieza doméstica y de oficinas chicas en GBA norte. Planes por única vez o mantenimiento semanal.",
    email: "manosya.demo+ordenplus@example.test",
    isFeatured: false,
    isVerified: true,
    name: "Orden Plus",
    ratingAvg: 4.3,
    ratingCount: 16,
    services: [
      {
        categorySlug: "limpieza-hogar",
        description: "Limpieza general, organización básica, cocina, baño y repaso de superficies.",
        priceFrom: "9500",
        priceTo: "22000",
        priceUnit: "POR_HORA",
        title: "Limpieza para hogares y oficinas chicas",
      },
    ],
    zoneSlugs: ["gba-san-isidro", "gba-vicente-lopez", "gba-tigre"],
  },
  {
    bio: "Técnico gasista para mantenimiento preventivo y urgencias coordinadas. Explicamos el diagnóstico antes de avanzar.",
    email: "manosya.demo+calorseguro@example.test",
    isFeatured: true,
    isVerified: true,
    name: "Calor Seguro",
    ratingAvg: 4.6,
    ratingCount: 27,
    services: [
      {
        categorySlug: "gas-matriculado",
        description:
          "Service de calefones, conexión de cocinas, cambio de flexibles aprobados y pruebas de seguridad.",
        priceFrom: "26000",
        priceTo: "78000",
        priceUnit: "POR_TRABAJO",
        title: "Service de gas y calefones",
      },
    ],
    zoneSlugs: ["caba-boedo", "caba-parque-chacabuco", "caba-san-cristobal"],
  },
  {
    bio: "Carpinteros para arreglos y muebles simples. Trabajamos con pino, melamina y herrajes de uso diario.",
    email: "manosya.demo+tallermelamina@example.test",
    isFeatured: false,
    isVerified: false,
    name: "Taller Melamina",
    ratingAvg: 4,
    ratingCount: 8,
    services: [
      {
        categorySlug: "carpinteria",
        description: "Reparación de cajones, bisagras, puertas corredizas y armado de muebles planos.",
        priceFrom: "20000",
        priceTo: "70000",
        priceUnit: "POR_TRABAJO",
        title: "Arreglos de muebles y melamina",
      },
    ],
    zoneSlugs: ["caba-villa-devoto", "caba-villa-del-parque", "gba-tres-de-febrero"],
  },
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedCategories() {
  console.log("Seeding categories...");
  for (const cat of CATEGORIES) {
    await db.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, name: cat.name, sortOrder: cat.sortOrder, isActive: true },
      update: { name: cat.name, sortOrder: cat.sortOrder, isActive: true },
    });
  }
  console.log(`  ${CATEGORIES.length} categories OK`);
}

async function seedZones() {
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
}

async function seedDemoProviders() {
  const categorySlugs = [
    ...new Set(
      DEMO_PROVIDERS.flatMap((provider) =>
        provider.services.map((service) => service.categorySlug),
      ),
    ),
  ];
  const zoneSlugs = [...new Set(DEMO_PROVIDERS.flatMap((provider) => provider.zoneSlugs))];
  const categories = await db.category.findMany({
    select: { id: true, slug: true },
    where: { slug: { in: categorySlugs } },
  });
  const zones = await db.zone.findMany({
    select: { id: true, slug: true },
    where: { slug: { in: zoneSlugs } },
  });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const zoneBySlug = new Map(zones.map((zone) => [zone.slug, zone.id]));
  const now = new Date();

  console.log("Seeding demo providers...");
  for (const provider of DEMO_PROVIDERS) {
    const user = await db.user.upsert({
      where: { email: provider.email },
      create: {
        email: provider.email,
        emailVerified: now,
        name: provider.name,
      },
      update: {
        deletedAt: null,
        emailVerified: now,
        name: provider.name,
      },
    });

    const profile = await db.providerProfile.upsert({
      where: { userId: user.id },
      create: {
        bio: provider.bio,
        isFeatured: provider.isFeatured,
        isVerified: provider.isVerified,
        ratingAvg: provider.ratingAvg,
        ratingCount: provider.ratingCount,
        userId: user.id,
        verifiedAt: provider.isVerified ? now : null,
      },
      update: {
        bio: provider.bio,
        isFeatured: provider.isFeatured,
        isVerified: provider.isVerified,
        ratingAvg: provider.ratingAvg,
        ratingCount: provider.ratingCount,
        verifiedAt: provider.isVerified ? now : null,
      },
    });

    await db.providerService.deleteMany({ where: { providerProfileId: profile.id } });
    await db.providerZone.deleteMany({ where: { providerProfileId: profile.id } });

    for (const zoneSlug of provider.zoneSlugs) {
      const zoneId = zoneBySlug.get(zoneSlug);
      if (!zoneId) throw new Error(`Missing zone for demo seed: ${zoneSlug}`);
      await db.providerZone.create({
        data: {
          providerProfileId: profile.id,
          zoneId,
        },
      });
    }

    for (const service of provider.services) {
      const categoryId = categoryBySlug.get(service.categorySlug);
      if (!categoryId) throw new Error(`Missing category for demo seed: ${service.categorySlug}`);
      await db.providerService.create({
        data: {
          categoryId,
          description: service.description,
          isActive: true,
          priceFrom: service.priceFrom,
          priceTo: service.priceTo ?? null,
          priceUnit: service.priceUnit,
          priceUpdatedAt: now,
          providerProfileId: profile.id,
          title: service.title,
        },
      });
    }
  }
  console.log(`  ${DEMO_PROVIDERS.length} demo providers OK`);
}

async function main() {
  await seedCategories();
  await seedZones();
  await seedDemoProviders();
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
