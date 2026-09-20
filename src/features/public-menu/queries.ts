import "server-only";
import { prisma } from "@/lib/prisma";

/** Resolves a table from its public QR token — the only identifier the
 * public menu ever accepts from a client. Returns null for an unknown
 * token, a disabled table, or an inactive table, without distinguishing
 * which (avoids giving an anonymous caller a token-guessing oracle). */
export async function resolveTableByToken(token: string) {
  const table = await prisma.table.findUnique({
    where: { qrToken: token },
    select: { id: true, name: true, isActive: true, qrEnabled: true },
  });
  if (!table || !table.isActive || !table.qrEnabled) return null;
  return { id: table.id, name: table.name };
}

export type PublicMenuCategory = { id: string; name: string; image: string | null };
export type PublicMenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
};
export type PublicMenuProductFeed = {
  items: PublicMenuProduct[];
  total: number;
  nextOffset: number | null;
};

export const PUBLIC_MENU_PRODUCTS_PAGE_SIZE = 30;

/** Every category — small, fixed-size list, never worth paginating. */
export async function getPublicMenuCategories(): Promise<PublicMenuCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageSecureUrl: true },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, image: c.imageSecureUrl }));
}

/** Offset-paginated ACTIVE products for the public menu's infinite-scroll
 * grid — same `take + 1` "is there another page" trick as the Cafe/POS
 * product feed (src/features/pos/queries.ts::getPosProducts). No
 * stock/sku/barcode/internal fields: those aren't menu-relevant and
 * shouldn't be exposed to an anonymous client. Negative or low stock never
 * hides a product here (see AGENTS spec — "Sold Out" would need its own
 * separate flag, not implemented yet). */
export async function getPublicMenuProducts({
  offset = 0,
  take = PUBLIC_MENU_PRODUCTS_PAGE_SIZE,
  categoryId,
  q,
}: {
  offset?: number;
  take?: number;
  categoryId?: string | null;
  q?: string | null;
}): Promise<PublicMenuProductFeed> {
  const where = {
    status: "ACTIVE" as const,
    ...(categoryId ? { categoryId } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: offset,
      take: take + 1,
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        price1: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { secureUrl: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    items: page.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description,
      price: p.price1.toNumber(),
      image: p.images[0]?.secureUrl ?? null,
    })),
    total,
    nextOffset: hasMore ? offset + take : null,
  };
}
