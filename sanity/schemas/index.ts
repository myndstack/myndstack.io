import type { SchemaTypeDefinition } from "sanity";

import caseStudy from "./caseStudy";
import faq from "./faq";
import homepage from "./homepage";
import pricingTier from "./pricingTier";
import role from "./role";
import siteSettings from "./siteSettings";
import teamMember from "./teamMember";
import testimonial from "./testimonial";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Singletons first — they are the ones an editor opens most.
  homepage,
  siteSettings,
  // Collections.
  role,
  caseStudy,
  testimonial,
  teamMember,
  faq,
  pricingTier,
];
