import type { CSSProperties } from "react";

import { PLATFORM_HUES, PLATFORM_LAYERS, SHIP_CONSOLE } from "@/lib/landing/chapters";

/**
 * The hero's bore: a terminal shipping the stack, one layer per line in its
 * own hue — the software the engine stands for, running inside it. It types
 * itself in whenever the hero takes the stage (CSS, keyed on the stage's
 * beat); decoration, like everything on the stage (the hero's words say it).
 */
export default function ShipConsole({ className }: { readonly className?: string }) {
  return (
    <div className={`ship-console${className ? ` ${className}` : ""}`} data-demo="ship" aria-hidden="true">
      <div className="sc-bar">
        <i />
        <i />
        <i />
        <span>{SHIP_CONSOLE.path}</span>
      </div>
      <div className="sc-line sc-cmd" style={{ "--i": 0 } as CSSProperties}>
        <span className="sc-prompt">$</span> {SHIP_CONSOLE.command}
      </div>
      {PLATFORM_LAYERS.map((layer, i) => (
        <div key={layer.n} className="sc-line" data-hue={PLATFORM_HUES[i]} style={{ "--i": i + 1 } as CSSProperties}>
          <span className="sc-ok">✓</span>
          <span className="sc-key">{layer.title.toLowerCase()}</span>
          <span className="sc-meta">{layer.meta.toLowerCase()}</span>
        </div>
      ))}
      <div className="sc-line sc-done" style={{ "--i": PLATFORM_LAYERS.length + 1 } as CSSProperties}>
        <span className="sc-prompt">→</span> {SHIP_CONSOLE.done}
        <span className="sc-cursor" />
      </div>
    </div>
  );
}
