import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { LEGAL_DOCS } from "@/lib/legal";

const doc = LEGAL_DOCS["acceptable-use"];

export const metadata: Metadata = {
  title: `${doc.title} — Myndstack`,
  description: doc.lede,
  alternates: { canonical: "/acceptable-use" },
};

export default function Page() {
  return <LegalDocPage slug="acceptable-use" />;
}
