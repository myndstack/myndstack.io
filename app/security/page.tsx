import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { LEGAL_DOCS } from "@/lib/legal";
import { pageMetadata } from "@/lib/metadata";

const doc = LEGAL_DOCS.security;

export const metadata: Metadata = pageMetadata({
  path: "/security",
  title: `${doc.title} — Myndstack`,
  description: doc.lede,
});

export default function Page() {
  return <LegalDocPage slug="security" />;
}
