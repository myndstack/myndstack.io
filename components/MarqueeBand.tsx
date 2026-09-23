import MarqueeTrack from "./MarqueeTrack";

const PHRASE = "Intelligence, engineered.";

/** Infinite horizontal wordline. Four copies so the -50% loop is seamless. */
export default function MarqueeBand() {
  return (
    <section
      aria-hidden="true"
      className="mask-edges overflow-hidden border-b border-line py-8"
    >
      <MarqueeTrack className="animate-marq hover:[animation-play-state:paused] flex w-max gap-11 font-display text-56 leading-none font-bold tracking-[-0.035em] whitespace-nowrap sm:text-marquee">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i % 2 ? "text-lime" : undefined}>
            {PHRASE}
          </span>
        ))}
      </MarqueeTrack>
    </section>
  );
}
