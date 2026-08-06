import PageHeader from "@/components/PageHeader";
import { SkeletonCard, SkeletonStatus } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading case studies" />
      <PageHeader
        eyebrow="Work"
        title="Selected engagements."
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />
      <div className="page-column pt-14 pb-[88px]">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
