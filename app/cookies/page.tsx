import type { Metadata } from "next";
import LegalDocPage from "@/components/LegalDocPage";
import { LEGAL_DOCS } from "@/lib/legal";
import { pageMetadata } from "@/lib/metadata";

const doc = LEGAL_DOCS.cookies;

export const metadata: Metadata = pageMetadata({
  path: "/cookies",
  title: `${doc.title} — Myndstack`,
  description: doc.lede,
});

export default function Page() {
  return <LegalDocPage slug="cookies" />;
}
