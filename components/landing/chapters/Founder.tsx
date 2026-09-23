import { FOUNDER_COPY, STUDIO_COORDS } from "@/lib/landing/chapters";
import type { SiteSettings, TeamMember } from "@/lib/sanity/queries";

import ContrastSwitch from "../core/ContrastSwitch";
import CoreRingMini from "../core/CoreRingMini";
import IstClock from "../core/IstClock";

type Props = {
  /** From Sanity, "Adding soon" placeholder rows already removed. */
  readonly people: readonly TeamMember[];
  readonly site: SiteSettings;
  readonly contrastWith: readonly string[];
  readonly contrastWithout: readonly string[];
};

/**
 * §07 — the studio. The founder as an ID panel (only what the CMS says: name,
 * role, where, how to reach them — no invented bio or portrait), beside the
 * agency ↔ Myndstack comparison.
 */
export default function Founder({ people, site, contrastWith, contrastWithout }: Props) {
  const channels = site.socials.filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <section id="team" className="founder" aria-labelledby="team-title">
      <div className="page-col">
        <div className="founder-head">
          <p className="chapter-kicker">
            <span className="stamp">§07</span>
            <span>{FOUNDER_COPY.kicker}</span>
          </p>
          <h2 id="team-title" className="chapter-title founder-title">
            {FOUNDER_COPY.title}
          </h2>
          <p className="chapter-lede">{FOUNDER_COPY.lede}</p>
        </div>

        <div className="founder-grid">
          <ul className="founder-people">
            {people.map((member) => (
              <li key={member.n} className="founder-card">
                <div className="founder-badge" aria-hidden="true">
                  <CoreRingMini />
                  <span className="founder-initials">{member.i}</span>
                </div>
                <div className="founder-id">
                  <h3 className="founder-name">{member.n}</h3>
                  <p className="founder-role">{member.r}</p>
                  <dl className="founder-facts hud">
                    <div>
                      <dt className="hud-k">Base</dt>
                      <dd>{site.location}</dd>
                    </div>
                    <div>
                      <dt className="hud-k">Coords</dt>
                      <dd>{STUDIO_COORDS}</dd>
                    </div>
                    <div aria-hidden="true">
                      <dt className="hud-k">Local</dt>
                      <dd>
                        IST <IstClock />
                      </dd>
                    </div>
                  </dl>
                  <ul className="founder-links">
                    <li>
                      <a href={`mailto:${site.email}`} className="ulink">
                        {site.email}
                      </a>
                    </li>
                    {channels.map((c) => (
                      <li key={c.label}>
                        <a href={c.href} className="ulink" rel="me noopener" target="_blank">
                          {c.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>

          <ContrastSwitch without={contrastWithout} with={contrastWith} />
        </div>
      </div>
    </section>
  );
}
