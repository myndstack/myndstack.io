import MarqueeTrack from "./MarqueeTrack";

const PHRASE = "Intelligence, engineered.";

/** Infinite horizontal wordline. Four copies so the -50% loop is seamless. */
export default function MarqueeBand() {
  return (
    <section
      aria-hidden="true"
      className="mask-edges overflow-hidden border-b border-line py-[30px]"
    >
      <MarqueeTrack className="animate-marq flex w-max gap-11 font-display text-[60px] leading-[0.9] font-bold tracking-[-0.035em] whitespace-nowrap sm:text-[112px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i % 2 ? "text-lime" : undefined}>
            {PHRASE}
          </span>
        ))}
      </MarqueeTrack>
    </section>
  );
}
