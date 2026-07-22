import Magnetic from "./Magnetic";
import Reveal from "./Reveal";

export default function CtaBand() {
  return (
    <section id="cta" className="mx-auto mt-[60px] max-w-[1200px] px-5 sm:px-14">
      <Reveal className="clip-angular-40 relative overflow-hidden bg-lime px-6 py-[72px] text-center sm:px-14">
        <div className="mb-[18px] font-mono text-xs font-bold tracking-[0.16em] text-lime-ink-2 uppercase">
          Start building
        </div>
        <h2 className="m-0 mb-4 font-display text-[34px] leading-none font-bold tracking-[-0.03em] text-lime-ink text-balance sm:text-[52px]">
          Ship the thing.
          <br />
          We handle the stack.
        </h2>
        <p className="mx-auto mt-0 mb-8 max-w-[520px] text-lg leading-[1.5] text-lime-ink-3">
          Tell us what you&rsquo;re building. We&rsquo;ll show you the fastest path to
          production AI.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <Magnetic>
            <a
              href="#contact"
              className="btn bg-lime-ink px-7 text-base text-lime hover:bg-ink hover:text-lime"
            >
              Start a project →
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="#pricing"
              className="btn border border-lime-ink/35 bg-transparent px-7 text-base text-lime-ink hover:bg-lime-ink/8 hover:text-lime-ink"
            >
              See pricing
            </a>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}
