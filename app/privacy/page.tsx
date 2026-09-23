import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { LEGAL_DOCS } from "@/lib/legal";
import { pageMetadata } from "@/lib/metadata";

const doc = LEGAL_DOCS.privacy;

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: `${doc.title} — Myndstack`,
  description: doc.lede,
});

export default function Page() {
  return <LegalDocPage slug="privacy" />;
}
