/**
 * Minimal skeleton primitive — a static, low-contrast surface used inside
 * loading.tsx boundaries. Static on purpose: the AGENTS.md rules forbid new
 * per-frame animation on this site, and a subtle placeholder gives the same
 * perceived-perf win without another motion channel to reason about. Respects
 * prefers-reduced-motion by never animating anyway.
 */
export function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={`bg-surface-3 ${className}`}
      style={style}
    />
  );
}

/** A single card-shaped placeholder used by the case-study and role grids. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex flex-col gap-4 border border-line bg-surface p-6 ${className}`}
    >
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-7 w-3/4" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-5/6" />
      <SkeletonBlock className="mt-2 h-3 w-1/3" />
    </div>
  );
}

/** Screen-reader-only status line while a route boundary is streaming in. */
export function SkeletonStatus({ label }: { label: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {label}
    </p>
  );
}
