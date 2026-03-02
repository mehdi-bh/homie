import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="space-y-4">
      {/* View toggle */}
      <Skeleton className="h-[44px] w-full rounded-2xl" />

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>

      {/* Week view rows */}
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
