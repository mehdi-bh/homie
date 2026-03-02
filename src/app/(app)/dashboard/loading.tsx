import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center gap-3.5">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>

      {/* Meal cards */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>

      {/* Grocery */}
      <Skeleton className="h-16 rounded-2xl" />

      {/* Mini week */}
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
