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
      <div className="flex gap-1.5 pb-1">
        {staples.map((staple) => (
          <button
            key={staple.id}
            onClick={() => onAdd(staple)}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-full border bg-background hover:bg-muted/50 transition-colors active:scale-95"
          >
            + {staple.name}
          </button>
        ))}
      </div>
    </div>
  );
}
