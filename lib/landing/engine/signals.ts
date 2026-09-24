/**
 * A tiny typed store for values the page's own components hand the engine
 * (the studio switch, the focused pricing tier, the open FAQ). Components set
 * a value on a user event; the director reads it in its frame. Nothing here
 * touches React, so a signal never re-renders anything.
 */

export type Signals<M extends Record<string, unknown>> = {
  readonly get: <K extends keyof M>(key: K) => M[K];
  /** Sets a value; subscribers hear about it only if it actually changed. */
  readonly set: <K extends keyof M>(key: K, value: M[K]) => void;
  readonly subscribe: (listener: (key: keyof M) => void) => () => void;
  /** Frozen copy of every value. */
  readonly snapshot: () => Readonly<M>;
  /** Count of changes so far — a cheap "did anything change since" check for a frame. */
  readonly version: () => number;
  /** Back to the initial values (the director calls this on unmount). */
  readonly reset: () => void;
};

export function createSignals<M extends Record<string, unknown>>(initial: M): Signals<M> {
  const values: M = { ...initial };
  const listeners = new Set<(key: keyof M) => void>();
  let changes = 0;

  const set = <K extends keyof M>(key: K, value: M[K]) => {
    if (Object.is(values[key], value)) return;
    values[key] = value;
    changes += 1;
    for (const listener of listeners) listener(key);
  };

  return {
    get: (key) => values[key],
    set,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot: () => Object.freeze({ ...values }),
    version: () => changes,
    reset: () => {
      for (const key of Object.keys(initial) as (keyof M)[]) set(key, initial[key]);
    },
  };
}
