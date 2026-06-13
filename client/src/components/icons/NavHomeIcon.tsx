import { cn } from "@/lib/utils";

/**
 * Home tab icon — Meta/Instagram house geometry.
 * Outline + door detail when idle; solid fill when active.
 */
export function NavHomeIcon({
  size = 24,
  active = false,
  className,
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const path =
    "M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997 2.997 2.997 0 0 1 2.998 2.997V21h4.5a.5.5 0 0 0 .5-.5v-9.086a1 1 0 0 0-.293-.707l-7-7a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3.5 11.414V20.5a.5.5 0 0 0 .5.5H9v-4.455Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke={active ? "none" : "currentColor"}
      strokeWidth={active ? 0 : 1.85}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}
