import { PrismaClient } from "@prisma/client";
import { unstable_cache } from "next/cache";

// Prevent creating multiple instances of PrismaClient in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Instantiate a single PrismaClient instance
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ["query", "info", "warn", "error"],
  });

// In development, reuse the PrismaClient instance across hot reloads
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const cachedQuery = async <T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: {
    tags?: string[];
    revalidate?: number;
  }
): Promise<T> => {
  const cachedFunction = unstable_cache(queryFn, key, {
    tags: options?.tags,
    revalidate: options?.revalidate || 3600,
  });

  return cachedFunction();
};

export const revalidateCache = async (tag: string) => {
  const { revalidateTag } = await import("next/cache");
  revalidateTag(tag);
};
