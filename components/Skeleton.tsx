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

/**
 * Loading shape for a detail sub-page (a role, a case study, a checkout): the
 * PageHeader's left-aligned column and offsets, then a two-column body. Used by
 * routes whose title comes from the CMS, so the header can't be pre-rendered
 * invisibly the way the list pages do it.
 */
export function SkeletonDetailPage({ label }: { label: string }) {
  return (
    <>
      <SkeletonStatus label={label} />
      <div aria-hidden="true" className="border-b border-line">
        <div className="page-column flex flex-col gap-4 pt-[calc(72px+var(--nav-height))] pb-14">
          <SkeletonBlock className="mb-4 h-3 w-40" />
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-12 w-full max-w-[640px]" />
          <SkeletonBlock className="h-5 w-full max-w-[520px]" />
        </div>
      </div>
      <div aria-hidden="true" className="page-column grid grid-cols-1 gap-14 pt-14 pb-22 md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-5/6" />
          <SkeletonBlock className="h-3 w-4/6" />
        </div>
        <SkeletonCard className="h-72" />
      </div>
    </>
  );
}
