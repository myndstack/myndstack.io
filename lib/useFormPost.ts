"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { z } from "zod";
import { toFieldErrors, type FormResponse } from "./form-shared";

type State = {
  pending: boolean;
  done: boolean;
  /** Form-level failure (network, rate limit, mail transport). */
  error: string | null;
  fieldErrors: Record<string, string>;
};

const IDLE: State = { pending: false, done: false, error: null, fieldErrors: {} };

/** Which schema to validate against, resolved lazily. */
export type SchemaName = "contact" | "newsletter" | "application";

/**
 * Pulls zod in only when someone actually submits. It is ~20 kB of the first
 * load otherwise, on a marketing page where most visitors never touch a form.
 * The route re-validates with the same schema regardless.
 */
async function loadSchema(name: SchemaName): Promise<z.ZodType> {
  const schemas = await import("./schemas");
  if (name === "contact") return schemas.contactSchema;
  if (name === "newsletter") return schemas.newsletterSchema;
  return schemas.applicationSchema;
}

/**
 * Validates, posts JSON, and surfaces per-field errors. Client validation is
 * only for fast feedback — the route is the authority.
 */
export function useFormPost(endpoint: string, schemaName: SchemaName) {
  const [state, setState] = useState<State>(IDLE);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form)) as Record<string, string>;

      setState({ ...IDLE, pending: true });

      const schema = await loadSchema(schemaName);
      const parsed = schema.safeParse(values);

      if (!parsed.success) {
        const fieldErrors = toFieldErrors(parsed.error);
        setState({ ...IDLE, fieldErrors });
        focusFirstInvalid(form, fieldErrors);
        return;
      }

      let result: FormResponse;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        result = (await response.json()) as FormResponse;
      } catch {
        setState({
          ...IDLE,
          error: "Couldn't reach the server. Check your connection and try again.",
        });
        return;
      }

      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {};
        setState({ ...IDLE, error: result.error ?? "Something went wrong.", fieldErrors });
        focusFirstInvalid(form, fieldErrors);
        return;
      }

      setState({ ...IDLE, done: true });
    },
    [endpoint, schemaName],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, submit, reset };
}

/**
 * Moves focus to the first field that failed, so keyboard users aren't stranded.
 *
 * Deferred a frame on purpose: the fields are still `disabled` from the pending
 * state at the moment we set the errors, and `focus()` is a no-op on a disabled
 * input. By the next frame React has re-rendered them enabled.
 */
function focusFirstInvalid(form: HTMLFormElement, fieldErrors: Record<string, string>) {
  const first = Object.keys(fieldErrors)[0];
  if (!first) return;

  requestAnimationFrame(() => {
    form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
  });
}
