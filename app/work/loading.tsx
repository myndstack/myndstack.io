import PageHeader from "@/components/PageHeader";
import { SkeletonCard, SkeletonStatus } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading case studies" />
      {/* Eyebrow / title / lede match app/work/page.tsx exactly, and the grid is
          2-col not 3 — otherwise the skeleton flashes a different headline and
          reflows a 3-col grid into the real 2-col one on hydration. */}
      <PageHeader
        eyebrow="Selected work"
        title="Cognitive infrastructure, built end to end."
        lede="PharmaLaunch is the stack we designed and built: AI generation paired with deterministic rule engines and automated quality gates. In private validation."
        meta="Loading…"
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />
      <div className="page-column pt-14 pb-[88px]">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
