// Seed placeholder — los datos reales se implementan antes de Fase 2
// (categorías + zonas de CABA/GBA son necesarias para búsqueda)
import { db } from "../src/lib/db";

async function main() {
  console.warn("Seed placeholder — implementar antes de Fase 2");
  // TODO: seed de Category (categorías de servicios)
  // TODO: seed de Zone (barrios CABA + partidos GBA)
  // TODO: seed de User admin inicial
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
