import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-7 w-7 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-14 w-14 text-2xl",
} as const;

export function UserAvatar({
  src,
  fallback,
  size = "md",
  className,
}: {
  src?: string | null;
  fallback: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn(
          "rounded-full object-cover shrink-0 ring-2 ring-background",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center shrink-0 leading-none rounded-full bg-muted/60",
        sizes[size],
        className
      )}
    >
      {fallback}
    </span>
  );
}
