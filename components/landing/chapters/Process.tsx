import { PROCESS_COPY } from "@/lib/landing/chapters";
import type { ProcessStep } from "@/lib/sanity/queries";

import DeliveryPage from "../core/DeliveryCard";
import { Beat, Furniture, Scene, Slot } from "../scene/Scene";
import { Kicker, Title } from "../type/Type";

/** The process beats, one per step (lib/landing/engine/beats.ts). */
const BUILDS = ["build-1", "build-2", "build-3", "build-4"] as const;

function Steps({ steps, twin }: { readonly steps: readonly ProcessStep[]; readonly twin?: boolean }) {
  return (
    <div className="process-copy">
      <Kicker n="§05">{PROCESS_COPY.kicker}</Kicker>
      <Title id={twin ? undefined : "process-title"} lines={[PROCESS_COPY.title]} />
      <ol className="steps" aria-label={twin ? undefined : "Steps, in order"} data-rise>
        {steps.map((step, i) => (
          <li key={step.n} className="step" data-step={BUILDS[i]}>
            <span className="step-n t-mono-13">{step.n}</span>
            <div className="step-body">
              {twin ? <p className="t-title-s">{step.t}</p> : <h3 className="t-title-s">{step.t}</h3>}
              <div className="step-more">
                <div>
                  <p className="t-body step-d">{step.d}</p>
                  <DeliveryPage step={i} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * §05 — how a build runs, as the engine being built: 01 a sketch in
 * construction lines, 02 exploded and dimensioned, 03 the build scan rises
 * and the parts seat as metal, 04 power-on. The step list holds on a lime
 * rail the whole way: the active step follows the beat and opens onto its
 * artifact (the discovery doc, the architecture, the pull request,
 * production). It converts from ink to light with the scan (an aria-hidden
 * twin, clipped at the line).
 */
export default function Process({ steps }: { readonly steps: readonly ProcessStep[] }) {
  return (
    <Scene id="process" anchor="process" labelledBy="process-title">
      <Furniture scene="process" skin="drafting" className="has-twin">
        <Steps steps={steps} />
      </Furniture>
      <Furniture scene="process" skin="drafting" twin="machined">
        <Steps steps={steps} twin />
      </Furniture>
      {BUILDS.map((id) => (
        <Beat key={id} id={id} className="build">
          <Slot beat={id} />
        </Beat>
      ))}
    </Scene>
  );
}
