/**
 * The review prototype is the real /preview, snapshotted: the server's HTML,
 * the real CSS, the real director and renderer — but no React, so nothing
 * hydrates. These are the few widgets React would have driven, rebuilt as
 * plain DOM against the same markup and the same shared modules (the nav's
 * state machine, the scroll spy, the engine's signals). Forms and checkout
 * links are inert here: the prototype collects nothing and sells nothing.
 */
import { RULER_CHAPTERS } from "@/lib/landing/chapters";
import { engineSignals } from "@/lib/landing/engine/store";
import { INITIAL_NAV_STATE, nextNavState } from "@/lib/nav-state";
import { subscribeToScroll } from "@/lib/scroll";
import { activeSection, documentTop, type SectionOffset } from "@/lib/scroll-spy";

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/** A small note in the corner (link and form stand-ins). */
function toast(message: string): void {
  let el = $<HTMLElement>(".proto-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "proto-toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.dataset.on = "";
  window.clearTimeout(Number(el.dataset.t));
  el.dataset.t = String(window.setTimeout(() => el && delete el.dataset.on, 2400));
}

function nav(): void {
  const el = $<HTMLElement>("nav.nav");
  if (!el) return;
  let state = INITIAL_NAV_STATE;
  subscribeToScroll(({ y }) => {
    state = nextNavState(state, y);
    el.classList.toggle("is-cap", state.capsule);
    el.classList.toggle("is-tucked", state.capsule && state.tucked);
  });
}

function faq(): void {
  const dial = $<HTMLElement>(".faq-dial");
  const items = $$<HTMLElement>(".faq-item");
  items.forEach((item, i) => {
    $<HTMLButtonElement>("button", item)?.addEventListener("click", () => {
      const open = item.dataset.open !== "true";
      items.forEach((other, j) => {
        const on = open && j === i;
        other.dataset.open = on ? "true" : "false";
        $<HTMLElement>("button", other)?.setAttribute("aria-expanded", String(on));
        const panel = $<HTMLElement>(".disclosure", other);
        if (panel) panel.dataset.open = on ? "true" : "false";
      });
      if (dial) dial.dataset.open = String(open ? i : -1);
      engineSignals.set("faq.open", open ? i : -1);
    });
  });
}

function studioSwitch(): void {
  const box = $<HTMLElement>(".contrast");
  const sw = $<HTMLButtonElement>(".contrast-switch");
  if (!box || !sw) return;
  sw.addEventListener("click", () => {
    const ours = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", String(ours));
    box.dataset.state = ours ? "ours" : "agency";
    engineSignals.set("studio.mode", ours ? "ours" : "agency");
  });
}

function ruler(): void {
  const root = $<HTMLElement>(".zone-ruler");
  if (!root) return;
  let offsets: SectionOffset[] = [];
  let current: string | null = null;
  const measure = () => {
    offsets = RULER_CHAPTERS.flatMap(({ id }) => {
      const el = document.getElementById(id);
      return el ? [{ id, top: documentTop(el) }] : [];
    });
    const end = document.documentElement.scrollHeight;
    $$<HTMLElement>(".zr-zone", root).forEach((zone, i) => {
      zone.style.flexGrow = String(Math.round(Math.max(1, (offsets[i + 1]?.top ?? end) - (offsets[i]?.top ?? 0)) / 10));
    });
    current = null;
  };
  new ResizeObserver(() => requestAnimationFrame(measure)).observe(document.body);
  measure();
  subscribeToScroll(({ y, progress }) => {
    const id = activeSection(offsets, y, window.innerHeight * 0.5) ?? RULER_CHAPTERS[0].id;
    if (id !== current) {
      current = id;
      $$<HTMLElement>(".zr-zone", root).forEach((z) => z.toggleAttribute("data-current", z.dataset.id === id));
    }
    if (!CSS.supports("animation-timeline: scroll()")) root.style.setProperty("--p", (Math.round(progress * 500) / 500).toString());
  });
  $$<HTMLButtonElement>(".zr-zone button", root).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest<HTMLElement>(".zr-zone")?.dataset.id;
      const section = id ? document.getElementById(id) : null;
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function ctaBar(): void {
  const bar = $<HTMLElement>(".mobile-cta");
  if (!bar) return;
  subscribeToScroll(({ y }) => {
    const show = y > window.innerHeight * 0.9;
    bar.classList.toggle("is-shown", show);
    bar.inert = !show;
  });
}

function motionToggle(): void {
  $$<HTMLButtonElement>(".tb-actions button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const paused = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(paused));
      btn.textContent = paused ? "▶ Motion" : "❚❚ Motion";
      if (paused) document.documentElement.dataset.paused = "";
      else delete document.documentElement.dataset.paused;
    });
  });
}

function clock(): void {
  const tick = () => {
    const t = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const h = t.find((p) => p.type === "hour")?.value ?? "--";
    const m = t.find((p) => p.type === "minute")?.value ?? "--";
    $$<HTMLElement>("span.tabular-nums[data-live]").forEach((el) => {
      el.innerHTML = `${h}<span class="hud-colon">:</span>${m}`;
    });
  };
  tick();
  window.setInterval(tick, 20_000);
}

function compare(): void {
  $$<HTMLButtonElement>("button[aria-controls='pricing-compare-table']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      const panel = document.getElementById(btn.getAttribute("aria-controls") ?? "");
      if (panel) panel.dataset.open = open ? "true" : "false";
    });
  });
}

/** Nothing leaves the prototype: forms don't send, links out of the page don't navigate. */
function inert(): void {
  $$<HTMLFormElement>("form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      toast("Prototype — this form doesn't send anything.");
    });
  });
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
    const href = a?.getAttribute("href") ?? "";
    if (!a || href.startsWith("#")) return;
    e.preventDefault();
    toast(href.startsWith("mailto:") || href.startsWith("tel:") ? "Prototype — contact links are off." : `Prototype — ${href} isn't part of this page.`);
  });
}

export function mountShims(): void {
  nav();
  faq();
  studioSwitch();
  ruler();
  ctaBar();
  motionToggle();
  clock();
  compare();
  inert();
}
