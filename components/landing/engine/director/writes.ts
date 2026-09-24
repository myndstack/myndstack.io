/**
 * DOM writes that only happen when the value actually changed (AGENTS.md:
 * `setAttribute` queues a mutation record even for an identical value, so an
 * unconditional "cheap" write is sixty of them a second). The last value per
 * element and key is cached; reset() forgets everything (after a relayout).
 */
type Key = string;

export type Writer = {
  readonly attr: (el: Element | null, name: string, value: string | null) => void;
  readonly prop: (el: HTMLElement | null, name: string, value: string | null) => void;
  readonly style: (el: HTMLElement | null, name: "clip-path" | "transform" | "opacity", value: string) => void;
  readonly text: (el: Element | null, value: string) => void;
  readonly forget: (el: Element, key: Key) => void;
  readonly reset: () => void;
};

export function createWriter(): Writer {
  const cache = new WeakMap<Element, Map<Key, string | null>>();
  const seen = new Set<WeakRef<Element>>();
  const changed = (el: Element, key: Key, value: string | null) => {
    let m = cache.get(el);
    if (!m) {
      m = new Map();
      cache.set(el, m);
      seen.add(new WeakRef(el));
    }
    if (m.has(key) && m.get(key) === value) return false;
    m.set(key, value);
    return true;
  };
  return {
    attr: (el, name, value) => {
      if (!el || !changed(el, `a:${name}`, value)) return;
      if (value === null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    },
    prop: (el, name, value) => {
      if (!el || !changed(el, `p:${name}`, value)) return;
      if (value === null) el.style.removeProperty(name);
      else el.style.setProperty(name, value);
    },
    style: (el, name, value) => {
      if (!el || !changed(el, `s:${name}`, value)) return;
      el.style.setProperty(name, value);
    },
    text: (el, value) => {
      if (!el || !changed(el, "t", value)) return;
      el.textContent = value;
    },
    forget: (el, key) => {
      cache.get(el)?.delete(`s:${key}`);
    },
    reset: () => {
      for (const ref of seen) {
        const el = ref.deref();
        if (el) cache.delete(el);
      }
      seen.clear();
    },
  };
}
