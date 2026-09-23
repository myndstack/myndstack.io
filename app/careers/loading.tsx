import PageHeader from "@/components/PageHeader";
import { SkeletonCard, SkeletonStatus } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading roles" />
      {/* Same copy as the real page, so the same height. Invisible, not absent:
          it holds the header's exact space so nothing reflows, and leaves the
          entrance animation to the real page — shown here, it rose in twice. */}
      <div className="invisible" aria-hidden="true">
        <PageHeader
          eyebrow="Join the studio"
          title="Build the stack behind everything."
          lede="We work with engineers and designers who care about the layer beneath the product. A small studio, real ownership, work that ships to production."
          meta="Loading…"
          breadcrumbs={[{ label: "Home", href: "/" }]}
        />
      </div>
      <div className="page-column pt-14 pb-22">
        {/* Same rhythm as the real list: 8px gaps, ~96px rows. */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      </div>
    </>
  );
}
