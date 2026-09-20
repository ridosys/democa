import "server-only";
import { prisma } from "@/lib/prisma";

export async function getProductOptionGroups(productId: string) {
  const groups = await prisma.productOptionGroup.findMany({
    where: { productId },
    include: { options: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    isRequired: group.isRequired,
    allowMultiple: group.allowMultiple,
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name,
      priceAdjustment: option.priceAdjustment.toNumber(),
      isActive: option.isActive,
    })),
  }));
}

export type ProductOptionGroupsView = Awaited<
  ReturnType<typeof getProductOptionGroups>
>;
