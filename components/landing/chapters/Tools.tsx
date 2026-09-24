import { INTEGRATIONS } from "@/lib/content";
import { INTEGRATION_LOGOS } from "@/lib/integration-logos";
import { TOOL_HUES, TOOLS_COPY } from "@/lib/landing/chapters";

import { Beat, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

/**
 * §06 — the tools: the engine seen from the side through a long lens, one
 * port lit on its profile for each group it plugs into — models, compute,
 * data, and the shaft's end for delivery (all four hues). The groups hold in
 * columns 1–5, one row each, marks in the licensed monochrome set, with name
 * chips for vendors that have none.
 */
export default function Tools() {
  return (
    <Scene id="tools" anchor="integrations" labelledBy="tools-title">
      <Beat id="tools" className="tools">
        <div className="tools-head">
          <Kicker n="§06">{TOOLS_COPY.kicker}</Kicker>
          <Title id="tools-title" lines={[TOOLS_COPY.title]} />
          <Lede>{TOOLS_COPY.lede}</Lede>
        </div>
        <Rise as="ul" i={1} className="rack">
          {INTEGRATIONS.map((group, i) => {
            const hue = TOOL_HUES[i % TOOL_HUES.length];
            return (
              <li key={group.title} className="rack-row" data-port={i} data-hue={hue === "spectrum" ? undefined : hue} data-spectrum={hue === "spectrum" ? "" : undefined}>
                <span className="rack-bar" aria-hidden="true" />
                <h3 className="rack-title t-title-s">
                  <span className="rack-n t-mono-10">{String(i + 1).padStart(2, "0")}</span>
                  {group.title}
                </h3>
                <ul className="rack-items" aria-label={group.blurb}>
                  {group.items.map((item) => {
                    const mark = INTEGRATION_LOGOS[item];
                    return (
                      <li key={item} className="rack-item">
                        {mark ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d={mark} fill="currentColor" />
                          </svg>
                        ) : null}
                        <span className="t-mono-10">{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </Rise>
        <Slot beat="tools" />
      </Beat>
    </Scene>
  );
}
