import PageHeader from "@/components/PageHeader";
import { SkeletonCard, SkeletonStatus } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading roles" />
      {/* Eyebrow / title / lede match app/careers/page.tsx exactly so the header
          doesn't flash a different headline and reflow on hydration. */}
      <PageHeader
        eyebrow="Join the studio"
        title="Build the stack behind everything."
        lede="We hire engineers and designers who care about the layer beneath the product. Small team, real ownership, mission-critical work."
        meta="Loading…"
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />
      <div className="page-column pt-14 pb-[88px]">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} className="h-[132px]" />
          ))}
        </div>
      </div>
    </>
  );
}
