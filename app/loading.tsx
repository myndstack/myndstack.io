import { SkeletonBlock, SkeletonStatus } from "@/components/Skeleton";

/**
 * Root loading boundary — the homepage assembles from multiple Sanity fetches
 * (getHomepage, getFaqs, getPricingTiers, getTestimonials, getSiteSettings).
 * On a cold ISR hit, this replaces the empty flash with the shape of the
 * hero so above-the-fold has structure to render into.
 *
 * Intentionally minimal — a full skeleton of every homepage section would
 * either lie about the layout or drift from it. The hero is the only slot
 * that matters for perceived perf, so that's all this fills.
 */
export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading" />
      <div
        aria-hidden="true"
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 pt-[calc(60px+var(--nav-height))] pb-[60px] sm:px-16"
      >
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-16 w-full max-w-[880px]" />
        <SkeletonBlock className="h-16 w-full max-w-[720px]" />
        <SkeletonBlock className="mt-4 h-5 w-full max-w-[540px]" />
        <SkeletonBlock className="h-5 w-full max-w-[420px]" />
        <div className="mt-6 flex gap-3.5">
          <SkeletonBlock className="h-12 w-40" />
          <SkeletonBlock className="h-12 w-40" />
        </div>
      </div>
    </>
  );
}
