import { Skeleton } from "@/components/ui/skeleton";

export default function GroceryLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24 rounded-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
