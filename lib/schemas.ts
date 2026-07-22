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
  name: z.string().trim().min(2, "Tell us your name").max(120, "That name is too long"),
  email: z.email("Enter a valid email address").max(200),
  company: z.string().trim().max(160, "That's too long").optional().or(z.literal("")),
  budget: z.string().max(40).optional().or(z.literal("")),
  source: z.string().max(40).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(20, "A few more words, so we can point you somewhere useful")
    .max(5000, "Please keep it under 5,000 characters"),
  [HONEYPOT_FIELD]: honeypot,
});

export const newsletterSchema = z.object({
  email: z.email("Enter a valid email address").max(200),
  [HONEYPOT_FIELD]: honeypot,
});

export const applicationSchema = z.object({
  role: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2, "Tell us your name").max(120),
  email: z.email("Enter a valid email address").max(200),
  links: z
    .string()
    .trim()
    .min(4, "A link to your work, GitHub, or LinkedIn")
    .max(600, "That's too long"),
  note: z
    .string()
    .trim()
    .min(20, "A few lines on why this role")
    .max(5000, "Please keep it under 5,000 characters"),
  [HONEYPOT_FIELD]: honeypot,
});

export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;

