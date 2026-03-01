import { Skeleton } from "@/components/ui/skeleton";

export default function WeekLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
