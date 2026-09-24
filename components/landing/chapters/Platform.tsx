import { DISCIPLINES, PLATFORM_COPY, PLATFORM_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";

import LayerCard from "../core/LayerCards";
import { Beat, Furniture, Scene, Slot } from "../scene/Scene";
import { Kicker, Lede, Rise, Title } from "../type/Type";

/** The station beats, in layer order (lib/landing/engine/beats.ts). */
const STATIONS = PLATFORM_LAYERS.map((layer) => `st-${layer.title.toLowerCase()}`);
const TOTAL = String(PLATFORM_LAYERS.length).padStart(2, "0");

/** A layer's meta as the manifest's list of strings: "Web · mobile · agents" → web, mobile, agents. */
const tokens = (meta: string) => meta.split("·").map((t) => t.trim().toLowerCase());

/**
 * §02 — the stack, on paper: the engine exploded into its four layers. The
 * overview first, then one station per layer (the camera descends the tower,
 * each layer pulled out and cut away, the layer's software beside it — an
 * app, an agent's trace, an API, a search), then the lock. The stack's
 * manifest holds bottom-left the whole way: its line follows the station, and
 * every line reads live at the end.
 */
export default function Platform() {
  return (
    <Scene id="stack" anchor="platform" alias="platform-anchor" labelledBy="stack-title">
      <Beat id="stack">
        <div className="stack-head">
          <Kicker n="§02">{PLATFORM_COPY.kicker}</Kicker>
          <Title id="stack-title" lines={[{ text: PLATFORM_COPY.title[0], tone: "setup" }, PLATFORM_COPY.title[1]]} />
          <Lede>{PLATFORM_COPY.lede}</Lede>
        </div>
        <Slot beat="stack" />
      </Beat>

      {PLATFORM_LAYERS.map((layer, i) => (
        <Beat key={layer.n} id={STATIONS[i]}>
          <div className="stack-head station-head">
            <Kicker n={`${layer.n} / ${TOTAL}`}>{layer.title}</Kicker>
            <Title as="h3" lines={[layer.meta]} />
            <Rise as="ul" i={0} className="station-chips">
              {DISCIPLINES.filter((d) => d.layer === i).map((d) => (
                <li key={d.label} className="ms-chip" data-hue={PLATFORM_HUES[i]}>
                  {d.label}
                </li>
              ))}
            </Rise>
          </div>
          <LayerCard layer={i} />
          <Slot beat={STATIONS[i]} />
        </Beat>
      ))}

      <Beat id="locked">
        <p className="stack-head locked-readout t-mono-13">
          <span className="w">
            <span className="wi">
              {TOTAL} / {TOTAL} layers · deployed
            </span>
          </span>
        </p>
      </Beat>

      <Furniture scene="stack" skin="drafting">
        <div className="manifest" data-rise>
          <p className="manifest-file t-mono-10" aria-hidden="true">
            <span>stack.ts</span>
            <span>{TOTAL} layers</span>
          </p>
          <ol className="parts" aria-label="The stack, in layers">
            {PLATFORM_LAYERS.map((layer, i) => (
              <li key={layer.n} className="part" data-part={STATIONS[i]} data-hue={PLATFORM_HUES[i]}>
                <span className="part-n">{layer.n}</span>
                <span className="part-t">{layer.title.toLowerCase()}</span>
                <span className="part-meta">
                  <span aria-hidden="true">[</span>
                  {tokens(layer.meta).map((t, k, all) => (
                    <span key={t} className="part-str">
                      <span aria-hidden="true">&quot;</span>
                      {t}
                      <span aria-hidden="true">&quot;{k < all.length - 1 ? "," : ""}</span>
                      {k < all.length - 1 ? " " : ""}
                    </span>
                  ))}
                  <span aria-hidden="true">]</span>
                </span>
                <span className="part-state" aria-hidden="true">
                  ✓ live
                </span>
                <span className="led" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </Furniture>
    </Scene>
  );
}
