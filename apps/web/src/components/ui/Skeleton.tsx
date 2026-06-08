/** Inline skeleton primitives — no deps, matches the Hera navy theme. */

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/[0.06] ${className ?? "h-4 w-full"}`}
    />
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? "h-24 w-full"}`}
    />
  );
}

/** Full-page skeleton for OperationLayout while the operation row loads. */
export function PageSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="space-y-2.5">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-7 w-56" />
        <SkeletonLine className="h-4 w-72" />
      </div>

      {/* Pipeline chips */}
      <div className="flex gap-3">
        {[80, 96, 80, 72, 80, 64].map((w, i) => (
          <SkeletonLine key={i} className={`h-6 rounded-full w-${w / 4} shrink-0`} />
        ))}
      </div>

      {/* Content cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="hera-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonLine className="h-4 w-6 shrink-0" />
            <SkeletonLine className="h-4 w-48" />
            <SkeletonLine className="h-4 w-16 ml-auto shrink-0" />
          </div>
          {i <= 2 && (
            <div className="space-y-2 pt-1">
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-5/6" />
              <SkeletonLine className="h-3 w-3/4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a list of operation cards on the dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="hera-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <SkeletonLine className="h-5 w-48" />
            <SkeletonLine className="h-5 w-20 shrink-0" />
          </div>
          <SkeletonLine className="h-3 w-64" />
          <div className="flex gap-2 pt-1">
            {[1, 2, 3, 4].map((j) => (
              <SkeletonLine key={j} className="h-5 w-5 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
