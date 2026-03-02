import { Skeleton } from "@/components/ui/skeleton";

export default function WeekLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-28 rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
