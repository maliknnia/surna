type EntityListSkeletonProps = {
  rows?: number;
  rowHeight?: number;
};

export function EntityListSkeleton({ rows = 3, rowHeight = 96 }: EntityListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl animate-pulse"
          style={{ height: rowHeight, background: "var(--surna-elevated)" }}
        />
      ))}
    </div>
  );
}

export function EntityGridSkeleton({ cells = 9 }: { cells?: number }) {
  return (
    <div className="grid grid-cols-3 gap-[1px]">
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse" style={{ background: "var(--surna-elevated)" }} />
      ))}
    </div>
  );
}
