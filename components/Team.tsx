import { getTeam } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

export default async function Team() {
  const team = await getTeam();

  return (
    <Section id="team">
      <SectionHeader
        className="mb-11"
        eyebrow="The studio"
        title="A small team of engineers who ship."
        aside="No account managers between you and the people building your stack."
      />

      <div className="grid grid-cols-1 gap-[18px] xs:grid-cols-2 md:grid-cols-4">
        {team.map((member) => (
          <Reveal key={member.n} className="group">
            <div className="ease-brand relative mb-3.5 flex aspect-square items-center justify-center overflow-hidden border border-line bg-[linear-gradient(150deg,#1F1F23,#0d0d0f)] transition-[border-color,box-shadow] duration-160 group-hover:border-lime-edge group-hover:shadow-[0_0_0_1px_rgba(201,242,77,.08),0_14px_34px_rgba(0,0,0,.45)]">
              <span className="ease-brand font-display text-[38px] font-bold text-line-3 transition-colors duration-300 group-hover:text-t7">
                {member.i}
              </span>
              <span className="absolute bottom-3 left-3 size-2 bg-lime shadow-[0_0_10px_#C9F24D]" />
            </div>
            <div className="font-display text-[17px] font-semibold">{member.n}</div>
            <div className="mt-0.5 text-[13px] text-t5">{member.r}</div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
