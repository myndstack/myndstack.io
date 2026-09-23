/**
 * The numbered index marker SectionIndexRail lights up (`.ms-index`, counted by
 * a CSS counter) — the same markup SectionHeader renders, for landing chapters
 * that lay out their own headers.
 */
export default function SectionMark({ center = false }: { readonly center?: boolean }) {
  return (
    <div aria-hidden="true" className={`ms-index${center ? " ms-index--center" : ""}`}>
      <span className="ms-index-tick" />
    </div>
  );
}
