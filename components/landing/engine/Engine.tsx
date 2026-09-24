"use client";

import { useEffect } from "react";

import { BEATS } from "@/lib/landing/engine/beats";
import { beatAt, resolve, type MarkerBox, type Resolved } from "@/lib/landing/engine/choreography";
import { beatDom, type BeatDom } from "@/lib/landing/engine/dom";
import { stageTop, type Run } from "@/lib/landing/engine/hosts";
import { engineSignals } from "@/lib/landing/engine/store";
import { paperMask, toBands } from "@/lib/landing/engine/surfaces";
import type { SurfaceBand, SurfaceKind } from "@/lib/landing/engine/types";
import { PIN_QUERY } from "@/lib/motion/pin";
import { subscribeToScroll, type ScrollState } from "@/lib/scroll";
import { documentTop } from "@/lib/scroll-spy";

const SURFACES = new Set<SurfaceKind>(["ink", "graphite", "paper"]);

/** Attribute writes that only happen when the value actually changes. */
function setAttr(el: Element | null, name: string, value: string | null): void {
  if (!el || el.getAttribute(name) === value) return;
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/**
 * The engine's director: a first-load client island with no three.js in it.
 *
 * It measures the page outside any frame (ResizeObserver on the body, fonts,
 * bfcache, the pin breakpoint) — beat markers, the stage's run, the surface
 * bands — and resolves the beat timeline once per layout. Each scroll frame is
 * then arithmetic on cached numbers: which beat holds the stage, and where the
 * paper's edge crosses it. The DOM is written only when a value changes: the
 * beat and its state as data attributes (CSS does the rest), and the tone
 * layers' clip insets while a paper edge is in view.
 *
 * P2 runs it in poster mode (html[data-engine="poster"]); the renderer (P3)
 * reads the same timeline, smoothed, for the live engine. Pinned layout only:
 * everywhere else each block shows its own poster in the flow.
 */
export default function Engine() {
  useEffect(() => {
    const html = document.documentElement;
    const stage = document.querySelector<HTMLElement>("[data-engine-stage]");
    const run = stage?.parentElement ?? null;
    if (!stage || !run || html.dataset.anim !== "on") return;

    const pin = window.matchMedia(PIN_QUERY);
    const caps = document.getElementById("capabilities");
    const process = document.getElementById("process");
    const pricing = document.getElementById("pricing");
    const pricingDock = document.querySelector<HTMLElement>('[data-host="dock-pricing"]');
    const faqDock = document.querySelector<HTMLElement>('[data-host="dock-faq"]');

    let res: Resolved | null = null;
    let bands: SurfaceBand[] = [];
    let runBox: Run = { top: 0, bottom: 0 };
    let vh = window.innerHeight;
    let current = -1;
    let clip = "";
    let pending = 0;
    const edges = new Float32Array(2);

    const showPoster = (key: string | null) => {
      stage.querySelectorAll<HTMLElement | SVGElement>("[data-poster]").forEach((el) => {
        el.toggleAttribute("data-on", el.dataset.poster === key);
      });
    };

    const apply = (dom: BeatDom) => {
      setAttr(stage, "data-beat", dom.beat);
      showPoster(dom.poster);
      const cap = dom.cap === null ? null : String(dom.cap);
      const complete = dom.complete ? "true" : null;
      for (const el of [stage, caps]) {
        setAttr(el, "data-cap-active", cap);
        setAttr(el, "data-hue", dom.hue);
        setAttr(el, "data-complete", complete);
      }
      setAttr(stage, "data-labels", dom.labels);
      setAttr(process, "data-step", dom.step === null ? null : String(dom.step));
    };

    const applyBeat = () => {
      if (!res || current < 0) return;
      const index = BEATS.indexOf(res.beats[current]);
      apply(beatDom(BEATS, index, engineSignals.get("studio.mode")));
    };

    /** Clip the two tone layers at the paper's edge (stage px): light above dark surfaces, ink on paper. */
    const applyClip = (y: number) => {
      const top = y + stageTop(y, runBox, vh);
      const mask = paperMask(bands, top, vh, edges);
      let pt = vh;
      let pb = 0;
      let dt = 0;
      let db = 0;
      if (mask.edges > 0) {
        const e = Math.round(edges[0] * 2) / 2;
        if (mask.topPaper) [pt, pb, dt, db] = [0, vh - e, e, 0];
        else [pt, pb, dt, db] = [e, 0, 0, vh - e];
      } else if (mask.topPaper) {
        [pt, pb, dt, db] = [0, 0, vh, 0];
      }
      const key = `${pt}|${pb}|${dt}|${db}`;
      if (key === clip) return;
      clip = key;
      stage.style.setProperty("--pt", `${pt}px`);
      stage.style.setProperty("--pb", `${pb}px`);
      stage.style.setProperty("--dt", `${dt}px`);
      stage.style.setProperty("--db", `${db}px`);
    };

    const frame = ({ y }: ScrollState) => {
      if (!res || res.beats.length === 0) return;
      const next = beatAt(res, y, current < 0 ? null : current);
      if (next !== current) {
        current = next;
        applyBeat();
      }
      applyClip(y);
    };

    /** Layout reads — outside any frame, only when layout changed. */
    const measure = () => {
      pending = 0;
      if (!pin.matches) {
        res = null;
        return;
      }
      vh = window.innerHeight;
      const markers = new Map<string, MarkerBox>();
      document.querySelectorAll<HTMLElement>("[data-beat-marker]").forEach((el) => {
        if (el.offsetParent === null) return;
        markers.set(el.dataset.beatMarker ?? "", { top: documentTop(el), height: el.offsetHeight });
      });
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      res = resolve(BEATS, markers, vh, maxScroll, "stage");
      const runTop = documentTop(run);
      runBox = { top: runTop, bottom: runTop + run.offsetHeight };
      bands = toBands(
        Array.from(document.querySelectorAll<HTMLElement>(".landing [data-surface]")).flatMap((el) => {
          const kind = el.dataset.surface as SurfaceKind;
          if (!SURFACES.has(kind) || el.offsetParent === null) return [];
          const top = documentTop(el);
          return [{ top, bottom: top + el.offsetHeight, kind }];
        }),
      );
      current = -1;
      clip = "";
      frame({ y: window.scrollY, progress: 0 });
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(measure);
    };

    // Pricing: the tier under the pointer or focus lights its arc on the dial.
    // Delegated, so the shared PricingCards component stays untouched.
    const onPricing = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      const card = target?.closest(".pricing-card");
      if (card && pricing) {
        const i = Array.from(pricing.querySelectorAll(".pricing-card")).indexOf(card);
        if (i >= 0) engineSignals.set("pricing.focus", i);
      } else if (target?.closest("[data-tier-band]")) {
        engineSignals.set("pricing.focus", 3);
      }
    };

    /** The FAQ dial's playhead turns to the open question (i × 60°; stays put when all are closed). */
    const setOpen = (open: number) => {
      setAttr(faqDock, "data-open", String(open));
      if (open >= 0) faqDock?.style.setProperty("--open", String(open));
    };

    const offSignals = engineSignals.subscribe((key) => {
      if (key === "studio.mode") {
        setAttr(stage, "data-studio", engineSignals.get("studio.mode"));
        applyBeat();
      } else if (key === "pricing.focus") {
        setAttr(pricingDock, "data-focus", String(engineSignals.get("pricing.focus")));
      } else if (key === "faq.open") {
        setOpen(engineSignals.get("faq.open"));
      }
    });

    html.dataset.engine = "poster";
    setAttr(pricingDock, "data-focus", String(engineSignals.get("pricing.focus")));
    setOpen(engineSignals.get("faq.open"));

    const offScroll = subscribeToScroll(frame);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    document.fonts?.ready.then(schedule);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) schedule();
    };
    window.addEventListener("pageshow", onPageShow);
    pin.addEventListener("change", schedule);
    pricing?.addEventListener("pointerover", onPricing);
    pricing?.addEventListener("focusin", onPricing);
    schedule();

    return () => {
      offScroll();
      offSignals();
      ro.disconnect();
      if (pending) cancelAnimationFrame(pending);
      window.removeEventListener("pageshow", onPageShow);
      pin.removeEventListener("change", schedule);
      pricing?.removeEventListener("pointerover", onPricing);
      pricing?.removeEventListener("focusin", onPricing);
      for (const name of ["data-beat", "data-cap-active", "data-hue", "data-complete", "data-labels", "data-studio"]) {
        stage.removeAttribute(name);
        caps?.removeAttribute(name);
      }
      process?.removeAttribute("data-step");
      for (const v of ["--pt", "--pb", "--dt", "--db"]) stage.style.removeProperty(v);
      showPoster(null);
      delete html.dataset.engine;
      engineSignals.reset();
    };
  }, []);

  return null;
}
