/**
 * The review kit (prototype only): keys to check the plan's promises on the
 * real page.
 *
 *   G   the grid: 12 columns, the rails, the safe zones, the reading line
 *   1–9 jump to a scene
 *   P   pricing and FAQ on paper ↔ dark (a decision for the review)
 *   R   the posters (the no-WebGL look) ↔ the live engine
 *   F   frame rate and frame time
 *   ?   this list
 *
 * (The artifact host passes no query string, so everything is a key; on a
 * local server ?engine=off, ?motion=off and ?debug still work.)
 */

const SCENES = ["top", "platform", "capabilities", "work-cases", "process", "integrations", "team", "pricing", "cta"] as const;

const CSS = `
.proto-badge{position:fixed;right:12px;bottom:12px;z-index:400;display:flex;gap:8px;align-items:center;padding:6px 10px;border:1px solid rgb(201 242 77/.5);background:rgb(10 10 11/.88);color:#c9f24d;font:10px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.proto-help{position:fixed;right:12px;bottom:48px;z-index:400;display:none;width:300px;padding:14px 16px;border:1px solid rgb(255 255 255/.14);background:rgb(10 10 11/.94);color:#c7c7ce;font:11px/1.6 ui-monospace,Menlo,monospace}
.proto-help[data-on]{display:block}.proto-help b{color:#f4f4f6;font-weight:400;display:inline-block;min-width:34px}
.proto-help p{margin:0 0 8px;color:#9a9aa2}
.proto-grid{position:fixed;inset:0;z-index:399;pointer-events:none;display:none}
.proto-grid[data-on]{display:block}
.proto-cols{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:var(--gap,24px);padding:0 var(--inset,72px)}
.proto-cols i{background:rgb(255 64 160/.09);border-inline:1px solid rgb(255 64 160/.28)}
.proto-safe{position:absolute;left:0;right:0;height:1px;background:rgb(64 200 255/.7)}
.proto-read{position:absolute;left:0;right:0;top:46%;height:1px;background:repeating-linear-gradient(90deg,rgb(255 180 71/.9) 0 8px,transparent 8px 14px)}
.proto-fps{position:fixed;left:12px;top:84px;z-index:400;display:none;padding:4px 8px;background:rgb(10 10 11/.88);color:#c9f24d;font:11px ui-monospace,Menlo,monospace}
.proto-fps[data-on]{display:block}
.proto-toast{position:fixed;left:50%;bottom:24px;z-index:400;translate:-50% 20px;opacity:0;padding:10px 14px;border:1px solid rgb(201 242 77/.5);background:rgb(10 10 11/.94);color:#f4f4f6;font:12px/1.4 ui-monospace,Menlo,monospace;transition:opacity .2s,translate .2s;pointer-events:none}
.proto-toast[data-on]{opacity:1;translate:-50% 0}
.stage[data-kit-posters] .stage-canvas{opacity:0!important}.stage[data-kit-posters] .stage-posters{opacity:1!important}
.proto-debug{position:fixed;left:12px;top:120px;z-index:400;padding:6px 8px;background:rgb(10 10 11/.88);color:#c7c7ce;font:10px/1.5 ui-monospace,Menlo,monospace;white-space:pre}
`;

function el(tag: string, cls: string, html = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  document.body.appendChild(e);
  return e;
}

/** Nudge the director to re-measure (its ResizeObserver watches the body). */
function relayout(): void {
  const probe = document.createElement("div");
  probe.style.height = "1px";
  document.body.appendChild(probe);
  requestAnimationFrame(() => requestAnimationFrame(() => probe.remove()));
}

export function mountKit(): void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const q = new URLSearchParams(window.location.search);
  const badge = el("button", "proto-badge", `<span>Prototype · v4</span><span style="color:#9a9aa2">? keys</span>`);
  badge.setAttribute("type", "button");
  const help = el(
    "div",
    "proto-help",
    `<p>Myndstack /preview v4 — a snapshot of the real build for review. Forms and checkout are off.</p>
<b>G</b>grid · rails · safe zones<br><b>1–9</b>jump to a scene<br><b>P</b>pricing + FAQ: paper ↔ dark<br><b>R</b>posters (no WebGL) ↔ live<br><b>F</b>frame rate<br><b>?</b>this list<br><br><p>Best full-screen, 1000px wide or more: narrower windows get the phone layout.</p>`,
  );
  const grid = el("div", "proto-grid", `<div class="proto-cols">${"<i></i>".repeat(12)}</div><span class="proto-safe" style="top:96px"></span><span class="proto-safe" style="top:calc(100% - 72px)"></span><span class="proto-read"></span>`);
  const fps = el("div", "proto-fps");
  badge.addEventListener("click", () => help.toggleAttribute("data-on"));

  // The grid overlay reads the landing's own frame variables.
  const landing = document.querySelector<HTMLElement>(".landing");
  if (landing) {
    const cs = getComputedStyle(landing);
    grid.style.setProperty("--gap", cs.getPropertyValue("--gap"));
    const inset = landing.querySelector<HTMLElement>(".beat, .panel");
    if (inset) grid.style.setProperty("--inset", getComputedStyle(inset).paddingLeft);
  }

  let fpsOn = false;
  const times: number[] = [];
  let last = performance.now();
  const meter = (now: number) => {
    times.push(now - last);
    last = now;
    if (times.length > 90) times.shift();
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    fps.textContent = `${Math.round(1000 / avg)} fps · p95 ${sorted[Math.floor(sorted.length * 0.95)]?.toFixed(1)} ms`;
    if (fpsOn) requestAnimationFrame(meter);
  };

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
    const k = e.key.toLowerCase();
    if (k === "g") grid.toggleAttribute("data-on");
    else if (k === "?" || k === "/") help.toggleAttribute("data-on");
    else if (k === "f") {
      fpsOn = !fpsOn;
      fps.toggleAttribute("data-on", fpsOn);
      if (fpsOn) {
        last = performance.now();
        requestAnimationFrame(meter);
      }
    } else if (k === "p") {
      for (const sheet of document.querySelectorAll<HTMLElement>(".sheet--pricing, .sheet--faq")) {
        sheet.dataset.skin = sheet.dataset.skin === "drafting" ? "machined" : "drafting";
      }
      relayout();
    } else if (k === "r") {
      document.querySelector("[data-engine-stage]")?.toggleAttribute("data-kit-posters");
    } else if (/^[1-9]$/.test(k)) {
      const id = SCENES[Number(k) - 1];
      document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
    }
  });

  if (q.has("debug")) {
    const panel = el("div", "proto-debug");
    const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
    const tick = () => {
      panel.textContent = `y ${Math.round(window.scrollY)}\nbeat ${stage?.dataset.beat ?? "-"}\nscene ${stage?.dataset.scene ?? "-"}\nengine ${document.documentElement.dataset.engine ?? "-"}`;
      requestAnimationFrame(tick);
    };
    tick();
  }
}
