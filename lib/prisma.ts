import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

// Prisma 7.2 adapter expects { url }
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

// Avoid static import of PrismaClient to prevent build-time failures when client isn't generated yet.
function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@prisma/client") as any;

  const PrismaClientCtor = mod?.PrismaClient;
  if (!PrismaClientCtor) {
    throw new Error(
      "PrismaClient is not available. Ensure `prisma generate` ran (postinstall) and @prisma/client is installed."
    );
  }

  return new PrismaClientCtor({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
