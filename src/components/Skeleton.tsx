import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-skeleton-pulse rounded-lg bg-muted/50",
        className
      )}
    />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="p-6 rounded-lg bg-card border border-border space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
};
