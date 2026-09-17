import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/shared/skeletons";

export default function HomeLoading() {
  return (
    <div>
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-24 text-center sm:py-32">
        <Skeleton className="h-6 w-56 rounded-full" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <Skeleton className="h-5 w-2/3 max-w-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
