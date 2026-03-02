"use client";

type GroceryStaple = {
  id: string;
  name: string;
  category: string;
  default_quantity: number | null;
  default_unit: string | null;
};

export function StaplesBar({
  staples,
  onAdd,
}: {
  staples: GroceryStaple[];
  onAdd: (staple: GroceryStaple) => void;
}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-2 pb-1">
        {staples.map((staple) => (
          <button
            key={staple.id}
            onClick={() => onAdd(staple)}
            className="shrink-0 text-xs font-medium px-3 py-2 rounded-full border border-border/50 bg-card shadow-sm transition-all active:scale-[0.95] min-h-[36px]"
          >
            + {staple.name}
          </button>
        ))}
      </div>
    </div>
  );
}
