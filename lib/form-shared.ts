/**
 * The zod-free half of the form contract.
 *
 * Kept separate from `schemas.ts` on purpose: the forms dynamic-import the zod
 * schemas at submit time, so anything the client needs on first paint must live
 * here or zod lands in the initial bundle.
 */

/**
 * Bots fill every field they find. A real person never sees this one, so any
 * value in it means the submission is automated.
 */
export const HONEYPOT_FIELD = "website";

/** Shape every form route returns, success or failure. */
export type FormResponse = {
  ok: boolean;
  error?: string;
  /** Field name → first error message, for inline display. */
  fieldErrors?: Record<string, string>;
};

/** Structural stand-in for ZodError, so this module needs no zod import. */
type IssueBag = { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> };

/** Flattens validation issues into one message per field. */
export function toFieldErrors(error: IssueBag): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
