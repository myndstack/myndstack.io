import PageHeader from "@/components/PageHeader";
import { SkeletonCard, SkeletonStatus } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading case studies" />
      {/* Same copy as the real page, so the same height. Invisible, not absent:
          it holds the header's exact space so nothing reflows, and leaves the
          entrance animation to the real page — shown here, it rose in twice. */}
      <div className="invisible" aria-hidden="true">
        <PageHeader
          eyebrow="Selected work"
          title="Cognitive infrastructure, built end to end."
          lede="PharmaLaunch is the stack we designed and built: AI generation paired with deterministic rule engines and automated quality gates. In private validation."
          meta="Loading…"
          breadcrumbs={[{ label: "Home", href: "/" }]}
        />
      </div>
      <div className="page-column pt-14 pb-22">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
