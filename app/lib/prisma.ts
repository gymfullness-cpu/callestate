import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

// ✅ Prisma 7.2: adapter przyjmuje { url }
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

// ✅ NIE importujemy PrismaClient z @prisma/client (bo w buildzie może nie być wygenerowany)
// tylko ładujemy runtime (require zwraca any -> TS nie krzyczy)
function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@prisma/client") as any;

  const PrismaClientCtor = mod?.PrismaClient;
  if (!PrismaClientCtor) {
    throw new Error(
      "PrismaClient is not available. Make sure `prisma generate` ran (postinstall) and that @prisma/client is installed."
    );
  }

  return new PrismaClientCtor({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
