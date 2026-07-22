import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { LEGAL_DOCS } from "@/lib/legal";

const doc = LEGAL_DOCS.privacy;

export const metadata: Metadata = {
  title: `${doc.title} — Myndstack`,
  description: doc.lede,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <LegalDocPage slug="privacy" />;
}
