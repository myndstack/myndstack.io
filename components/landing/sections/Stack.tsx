import Annot from "../blueprint/Annot";
import SectionMark from "../blueprint/SectionMark";
import MotionChapter from "../motion/MotionChapter";
import { STACK_LAYERS } from "@/lib/content";
import { FIG } from "@/lib/landing/content";

/**
 * FIG.03 — the stack, pinned and scrubbed on desktop: as you scroll, each
 * layer draws its outline, solidifies and locks, and the bus that joins them
 * draws down. On phones nothing pins; the same build runs as the section
 * passes. Text is always readable — only the decoration is drafted.
 *
 * Contracts kept from the old StackStory: `section#platform` (scroll-spy),
 * `#platform-anchor` (nav target, mid-build), and a DIRECT sticky child with
 * no scroll-clipping ancestor (the e2e pin test).
 */
export default function Stack() {
  const total = String(STACK_LAYERS.length).padStart(2, "0");
  return (
    <MotionChapter id="stack" kind="scrub">
      <section id="platform" tabIndex={-1} className="relative outline-none sm:h-[300svh]">
        {/* Nav lands here: far enough in that the stack is mid-build. */}
        <span id="platform-anchor" aria-hidden="true" className="absolute top-0 sm:top-[110svh]" />

        <div data-sticky className="flex items-center py-22 sm:sticky sm:top-0 sm:h-svh sm:py-0">
          <div className="page-column grid w-full grid-cols-1 items-center gap-12 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Annot className="mb-4">{FIG.stack}</Annot>
              <SectionMark />
              <div className="eyebrow mb-4">
                The stack ·{" "}
                {/* Rendered by CSS from data-count, so the scrub can update it
                    with one attribute write and never touch React's text. */}
                <span data-stack-counter data-count={`${total} / ${total}`} aria-hidden="true" />
              </div>
              <h2 className="h2-section">
                Four layers.
                <br />
                One team.
              </h2>
              <p className="mt-4 mb-0 max-w-[420px] text-17 leading-body text-t4">
                We architect and build every layer your product runs on — interface, models,
                compute and data — so nothing is glue code someone else owns.
              </p>
            </div>

            <ol className="relative m-0 flex list-none flex-col gap-3 p-0 pl-8" aria-label="The four layers">
              {/* The bus joining the layers, drawn top to bottom. */}
              <svg
                aria-hidden="true"
                className="absolute top-6 bottom-6 left-2 h-[calc(100%-48px)] w-3 text-lime"
                viewBox="0 0 12 100"
                preserveAspectRatio="none"
              >
                <path data-bus className="bp-line" pathLength={1} d="M6 0 V100" />
              </svg>

              {STACK_LAYERS.map((layer) => (
                <li key={layer.n} data-layer className="stack-layer is-locked">
                  {/* The built surface — fades in over the dashed draft frame. */}
                  <span aria-hidden="true" className="bp-solid absolute inset-0 border border-line bg-surface-3" />
                  <span aria-hidden="true" className="absolute inset-0 border border-dashed border-t7" />
                  {/* Lock bar: lights when the layer is built. */}
                  <span
                    aria-hidden="true"
                    data-lock
                    className="bp-solid absolute inset-y-0 left-0 w-1 origin-top bg-lime"
                  />
                  <div className="relative flex items-baseline gap-4 px-6 py-5">
                    <span className="stack-num font-mono text-12 font-bold">{layer.n}</span>
                    <span className="flex-1 font-display text-22 font-semibold">{layer.title}</span>
                    <span className="annot hidden sm:block" aria-hidden="true">
                      {layer.meta}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </MotionChapter>
  );
}
