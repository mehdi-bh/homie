import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-6 w-6 text-sm",
  md: "h-9 w-9 text-base",
  lg: "h-16 w-16 text-2xl",
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
          "rounded-full object-cover shrink-0",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center shrink-0 leading-none",
        sizes[size],
        className
      )}
    >
      {fallback}
    </span>
  );
}
