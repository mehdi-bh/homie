import { Skeleton } from "@/components/ui/skeleton";

export default function LunchLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28 rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
