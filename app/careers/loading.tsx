import PageHeader from "@/components/PageHeader";
import { SkeletonCard, SkeletonStatus } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonStatus label="Loading roles" />
      <PageHeader
        eyebrow="Careers"
        title="Open roles."
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
