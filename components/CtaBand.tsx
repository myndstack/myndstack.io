import Magnetic from "./Magnetic";
import Reveal from "./Reveal";

export default function CtaBand() {
  return (
    <section id="cta" className="mx-auto mt-[60px] max-w-[1200px] px-5 sm:px-14">
      <Reveal className="clip-angular-40 relative overflow-hidden bg-lime px-6 py-[72px] text-center sm:px-14">
        <div className="mb-[18px] font-mono text-xs font-bold tracking-[0.16em] text-lime-ink-2 uppercase">
          Start building
        </div>
        <h2 className="h2-section mx-auto mb-4 text-lime-ink">
          Ship the thing.
          <br />
          We handle the stack.
        </h2>
        <p className="mx-auto mt-0 mb-8 max-w-[520px] text-lead text-lime-ink-3">
          Tell us what you&rsquo;re building. We&rsquo;ll show you the fastest path to
          production AI.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <Magnetic>
            {/* Inverse of the standard CTA: on a lime band, the primary is dark
                ink and the secondary is a lime-ink outline. A contextual variant,
                not a fork — .btn-lime would be lime-on-lime. */}
            <a
              href="#contact"
              className="btn bg-lime-ink text-lime hover:bg-ink hover:text-lime"
            >
              Start a project →
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="#pricing"
              className="btn border border-lime-ink/35 bg-transparent text-lime-ink hover:bg-lime-ink/8 hover:text-lime-ink"
            >
              See pricing
            </a>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}
