import Annot from "./Annot";
import SectionMark from "./SectionMark";

/**
 * A section of the redesign that isn't built yet — a labelled blueprint frame
 * carrying the section's FINAL anchor id, so the nav, anchors and scroll-spy
 * already behave as they will. `data-placeholder` is what the swap-time test
 * refuses to find on "/".
 */
export default function Placeholder({
  id,
  fig,
  title,
  phase,
}: {
  readonly id: string;
  readonly fig: string;
  readonly title: string;
  readonly phase: number;
}) {
  return (
    <section id={id} tabIndex={-1} data-placeholder className="page-column py-22 outline-none">
      <div className="relative border border-dashed border-t7 px-8 py-12">
        <Annot className="mb-4">{fig}</Annot>
        <SectionMark />
        <h2 className="h2-section text-t4">{title}</h2>
        <p className="mt-4 mb-0 font-mono text-12 tracking-label text-t5 uppercase">
          Placeholder — built in phase {phase}
        </p>
      </div>
    </section>
  );
}
