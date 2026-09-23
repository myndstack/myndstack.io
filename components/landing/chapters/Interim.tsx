type Props = {
  readonly id: string;
  readonly title: string;
  /** An in-flow anchor inside the section (e.g. the nav's #platform-anchor). */
  readonly anchor?: string;
  readonly surface?: "ink" | "paper";
};

/**
 * A chapter that hasn't been rebuilt yet: carries its final id so nav links,
 * the scroll ruler and scroll-spy already work. Replaced phase by phase; never
 * shipped to "/" (a swap test fails on `data-interim`).
 */
export default function Interim({ id, title, anchor, surface = "ink" }: Props) {
  return (
    <section
      id={id}
      data-interim
      className={`interim${surface === "paper" ? " interim--paper" : ""}`}
      aria-label={title}
    >
      {anchor ? <span id={anchor} /> : null}
      <div className="page-col">
        <p className="interim-label">{title} — in build</p>
      </div>
    </section>
  );
}
