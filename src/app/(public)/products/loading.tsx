import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/shared/skeletons";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-full max-w-sm" />
      <ProductGridSkeleton count={12} />
    </div>
  );
}
