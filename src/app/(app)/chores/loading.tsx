import { Skeleton } from "@/components/ui/skeleton";

export default function ChoresLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
