import { Skeleton } from "@/components/ui/skeleton";

export default function MealsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
