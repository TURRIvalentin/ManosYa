import { PrismaClient } from "@prisma/client";

// Singleton de Prisma Client para evitar múltiples instancias en dev
// (Next.js hace hot-reload y sin esto se generan demasiadas conexiones)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
