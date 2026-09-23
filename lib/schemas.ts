import { z } from "zod";

import { HONEYPOT_FIELD } from "./form-shared";

/**
 * Shared between the client (inline errors before a round trip) and the route
 * handlers (the only validation that actually counts).
 *
 * Client-side this module is dynamic-imported at submit time — see
 * `useFormPost` — to keep zod out of the first-load bundle.
 */

const honeypot = z
  .string()
  .max(0, "Rejected")
  .optional()
  .or(z.literal(""))
  .transform(() => undefined);

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(120, "Keep your name under 120 characters"),
  email: z.email("Enter a valid email address").max(200, "Keep the email under 200 characters"),
  company: z.string().trim().max(160, "Keep the company name under 160 characters").optional().or(z.literal("")),
  budget: z.string().max(40, "Pick one of the listed budgets").optional().or(z.literal("")),
  source: z.string().max(40, "Pick one of the listed options").optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(20, "A few more words, so we can point you somewhere useful")
    .max(5000, "Keep it under 5,000 characters"),
  [HONEYPOT_FIELD]: honeypot,
});

export const newsletterSchema = z.object({
  email: z.email("Enter a valid email address").max(200, "Keep the email under 200 characters"),
  [HONEYPOT_FIELD]: honeypot,
});

export const applicationSchema = z.object({
  role: z.string().trim().min(1, "Choose a role").max(160, "Choose a role from the list"),
  name: z.string().trim().min(2, "Tell us your name").max(120, "Keep your name under 120 characters"),
  email: z.email("Enter a valid email address").max(200, "Keep the email under 200 characters"),
  links: z
    .string()
    .trim()
    .min(4, "A link to your work, GitHub, or LinkedIn")
    .max(600, "Keep links under 600 characters"),
  note: z
    .string()
    .trim()
    .min(20, "A few lines on why this role")
    .max(5000, "Keep it under 5,000 characters"),
  [HONEYPOT_FIELD]: honeypot,
});

export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;

