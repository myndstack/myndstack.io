import { FOUNDER_COPY, STUDIO_COORDS } from "@/lib/landing/chapters";
import type { SiteSettings, TeamMember } from "@/lib/sanity/queries";

import ContrastSwitch from "../core/ContrastSwitch";
import IstClock from "../core/IstClock";
import { Beat, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

type Props = {
  /** From Sanity, "Adding soon" placeholder rows already removed. */
  readonly people: readonly TeamMember[];
  readonly site: SiteSettings;
  readonly contrastWith: readonly string[];
  readonly contrastWithout: readonly string[];
};

/**
 * §07 — the studio, in two beats. The founder: an ID card in columns 7–12
 * (only what the CMS says: name, role, where, how to reach them) while the
 * engine carries off to the left. Then the contrast: the agency ↔ Myndstack
 * switch and its table in columns 1–6, the engine acting it out beside them —
 * modules knocked out of line, then snapping home. The pricing sheet slides
 * over it.
 */
export default function Founder({ people, site, contrastWith, contrastWithout }: Props) {
  const channels = site.socials.filter((s): s is { label: string; href: string } => Boolean(s.href));
  const [founder] = people;
  return (
    <Scene id="studio" anchor="team" labelledBy="team-title">
      <Beat id="studio-founder" className="founder">
        <div className="founder-copy">
          <Kicker n="§07">{FOUNDER_COPY.kicker}</Kicker>
          <Title id="team-title" lines={[{ text: "Founder-led.", tone: "setup" }, "Hands on the code."]} />
          <Lede>{FOUNDER_COPY.lede}</Lede>
          {founder ? (
            <Rise i={1} className="ms-card id-card">
              <p className="id-cmd t-mono-10" aria-hidden="true">
                <span>$</span> whoami
              </p>
              <div className="id-row">
                <span className="id-mark t-mono-13" aria-hidden="true">
                  {founder.i}
                </span>
                <div>
                  <h3 className="t-title-m">{founder.n}</h3>
                  <p className="t-mono">{founder.r}</p>
                </div>
              </div>
              <dl className="id-facts">
                <div>
                  <dt className="t-mono-10">Base</dt>
                  <dd>{site.location}</dd>
                </div>
                <div>
                  <dt className="t-mono-10">Coords</dt>
                  <dd>{STUDIO_COORDS}</dd>
                </div>
                <div aria-hidden="true">
                  <dt className="t-mono-10">Local</dt>
                  <dd>
                    IST <IstClock />
                  </dd>
                </div>
              </dl>
              <ul className="id-links">
                <li>
                  <a href={`mailto:${site.email}`} className="ms-link">
                    {site.email}
                  </a>
                </li>
                {channels.map((c) => (
                  <li key={c.label}>
                    <a href={c.href} className="ms-link" rel="me noopener" target="_blank">
                      {c.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </Rise>
          ) : null}
        </div>
        <Slot beat="studio-founder" />
      </Beat>

      <Beat id="studio-contrast" className="contrast-beat">
        <Rise i={0} className="contrast-cell">
          <ContrastSwitch without={contrastWithout} with={contrastWith} />
        </Rise>
        <Slot beat="studio-contrast" />
      </Beat>
    </Scene>
  );
}
