import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "card" | "text" | "avatar" | "circle";
}

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  const variants = {
    card: "h-48 w-full rounded-2xl",
    text: "h-4 w-full rounded",
    avatar: "h-10 w-10 rounded-full",
    circle: "h-12 w-12 rounded-full",
  };

  return (
    <div
      className={cn(
        "skeleton-shimmer bg-muted/30 motion-reduce:animate-none",
        variants[variant],
        className,
      )}
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center space-x-3">
        <Skeleton variant="avatar" />
        <div className="space-y-2 flex-1">
          <Skeleton className="w-1/3" />
          <Skeleton className="w-1/4" />
        </div>
      </div>
      <Skeleton variant="card" className="h-64" />
      <div className="flex space-x-4">
        <Skeleton className="w-8" />
        <Skeleton className="w-8" />
        <Skeleton className="w-8" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-4">
        <Skeleton variant="circle" className="h-24 w-24" />
        <div className="space-y-2 flex-1">
          <Skeleton className="w-1/2" />
          <Skeleton className="w-1/3" />
        </div>
      </div>
      <div className="flex justify-around py-4">
        <Skeleton className="w-16" />
        <Skeleton className="w-16" />
        <Skeleton className="w-16" />
      </div>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}
