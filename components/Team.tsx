import { getTeam } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default async function Team() {
  // Sanity keeps "Adding soon" rows as slots for future hires; they aren't
  // people, so they don't render.
  const people = (await getTeam()).filter((member) => member.n !== "Adding soon");
  if (people.length === 0) return null;

  return (
    <Section id="team">
      <SectionHeader
        className="mb-11"
        eyebrow="The studio"
        title="Founder-led. Hands on the code."
        aside="No account managers between you and the person building your stack."
      />

      {/* A row of people, not a 4-up grid: Process directly above is a 4-column
          grid, and two identical grids back to back read as one repeated block.
          Placeholder tiles ("Adding soon") are skipped — an empty chair isn't a
          teammate. Each person is a square portrait tile beside their name. */}
      <ul className="m-0 flex list-none flex-col gap-8 p-0 sm:flex-row sm:flex-wrap">
        {people.map((member) => (
          <li key={member.n}>
            <Reveal className="flex items-center gap-5">
              <div className="relative flex size-32 flex-none items-center justify-center overflow-hidden border border-line bg-[linear-gradient(150deg,var(--color-line),var(--color-ink))]">
                {/* Decorative initials — the name is repeated beside the tile. */}
                <span
                  aria-hidden="true"
                  className="font-display text-30 font-bold text-line-3"
                >
                  {member.i}
                </span>
                <span className="absolute bottom-3 left-3 size-2 bg-lime shadow-glow" />
              </div>
              <div>
                <div className="font-display text-22 font-semibold">{member.n}</div>
                <div className="mt-1 text-13 text-t5">{member.r}</div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
