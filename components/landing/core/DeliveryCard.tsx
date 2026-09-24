import type { CSSProperties, ReactNode } from "react";

import { PLATFORM_HUES, PLATFORM_LAYERS } from "@/lib/landing/chapters";

/**
 * The process as the software it produces: under the active step, its
 * artifact — the discovery doc, the architecture, the pull request and its
 * checks, production. Illustrative (DRAFT), aria-hidden: the step's own words
 * carry the meaning.
 */

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

const DISCOVERY = ["problem & users", "constraints", "fastest path to value", "a plan you own"] as const;
const CHECKS = ["lint", "typecheck", "tests", "preview deployed"] as const;
const SHIPPED = ["documented", "handed over clean", "monitored"] as const;

function Bar({ file, status }: { readonly file: string; readonly status: ReactNode }) {
  return (
    <figcaption className="dv-bar">
      <span>{file}</span>
      <span className="dv-status">{status}</span>
    </figcaption>
  );
}

function Checks({ items }: { readonly items: readonly string[] }) {
  return (
    <ul className="dv-checks">
      {items.map((item, k) => (
        <li key={item} style={v({ "--k": k })}>
          <span className="dv-ok">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Page({ step }: { readonly step: number }) {
  if (step === 0) {
    return (
      <>
        <Bar file="discovery.md" status="sprint" />
        <p className="dv-h"># Discovery sprint</p>
        <Checks items={DISCOVERY} />
      </>
    );
  }
  if (step === 1) {
    return (
      <>
        <Bar file="architecture.md" status="proposal" />
        <ol className="dv-arch">
          {PLATFORM_LAYERS.map((layer, i) => (
            <li key={layer.n} data-hue={PLATFORM_HUES[i]} style={v({ "--k": i })}>
              <b>{layer.title.toLowerCase()}</b>
              <span>{layer.meta.toLowerCase()}</span>
            </li>
          ))}
        </ol>
      </>
    );
  }
  if (step === 2) {
    return (
      <>
        <Bar file="pull request #128" status="checks" />
        <p className="dv-h">feat: triage agent + orders api</p>
        <Checks items={CHECKS} />
        <p className="dv-merge">merged into main</p>
      </>
    );
  }
  return (
    <>
      <Bar
        file="production"
        status={
          <>
            <i className="dv-live" /> live
          </>
        }
      />
      <svg className="dv-spark" viewBox="0 0 200 48" preserveAspectRatio="none">
        <path d="M0 30 C18 28 26 34 40 30 S66 20 80 24 S104 34 120 26 S150 14 164 20 S188 26 200 22" pathLength={1} />
      </svg>
      <Checks items={SHIPPED} />
    </>
  );
}

export default function DeliveryPage({ step }: { readonly step: number }) {
  return (
    <figure className="delivery" data-page={step} aria-hidden="true">
      <Page step={step} />
    </figure>
  );
}
