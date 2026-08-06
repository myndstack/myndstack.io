import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from "next/font/google";

import Analytics from "@/components/Analytics";
import BackToTop from "@/components/BackToTop";
import CursorSpotlight from "@/components/CursorSpotlight";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import ProgressSpine from "@/components/ProgressSpine";
import SpeculationRules from "@/components/SpeculationRules";
import { SITE_URL } from "@/lib/content";
import { jsonLd } from "@/lib/format";
import { LOADER_SEEN_SCRIPT } from "@/lib/loader-seen";
import { getSiteSettings } from "@/lib/sanity/queries";

import "./globals.css";

/**
 * `latin-ext` is here for ONE glyph: ₹ (U+20B9).
 *
 * Google's `latin` subset covers the euro at U+20AC but stops short of the
 * rupee — the ranges either side of it, U+20A0–20AB and U+20AD–20C0, live in
 * `latin-ext`. With `latin` alone the browser cannot find ₹ in any of these
 * three faces and substitutes a system glyph for that character only, which is
 * why the rupee looked wrong beside its own digits while $ € £ were all fine.
 * It showed up worst in the largest type, where the metric mismatch is most
 * visible, and barely at all at 15px.
 *
 * Loaded on all three faces because prices are set in the display face, the
 * body face and the mono label voice in different places. The extra subset is
 * a separate woff2 that only downloads when a ₹ is actually rendered.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// 800 is deliberately absent: nothing on the site renders it, and every weight
// listed here is a woff2 that next/font preloads ahead of the first paint.
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

const title = "Myndstack — Enterprise AI & Cognitive Infrastructure";
const description =
  "Mission-critical systems, SaaS platforms, digital transformation, and technology consulting at scale — one engineered stack from data plane to model.";
const social =
  "Mission-critical systems | SaaS platforms | Digital transformation | Technology consulting at scale";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: "/" },
  // SVG favicon (retina-crisp in modern browsers) + the generated Apple touch
  // icon from app/apple-icon.tsx. Both are set here explicitly because a config
  // `icons` object suppresses Next's file-convention auto-linking.
  icons: {
    icon: "/myndstack-logo-square.svg",
    apple: "/apple-icon",
  },
  // The brand name is fixed here on purpose: OG siteName is not per-publish copy,
  // and keeping metadata static avoids making the whole export async for one word.
  openGraph: { type: "website", url: SITE_URL, siteName: "Myndstack", title, description: social },
  twitter: { card: "summary_large_image", title, description: social },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Site-wide contact data (footer, nav, spine, JSON-LD) comes from Sanity.
  const site = await getSiteSettings();

  /** Organization markup so search results can show the brand, not just the page. */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: SITE_URL,
    description,
    logo: `${SITE_URL}/myndstack-logo-square.svg`,
    email: site.email,
    telephone: site.phone,
    address: { "@type": "PostalAddress", addressLocality: "Kerala", addressCountry: "IN" },
  };

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${spaceMono.variable}`}
      // The blocking script below stamps `data-seen` here before React
      // hydrates, which React 19 otherwise reports as a mismatch on every
      // repeat visit. The attribute is deliberately absent from the server
      // render — it is a fact about this browser, not about the page.
      suppressHydrationWarning
    >
      <body>
        {/* Must stay above <Loader />; see lib/loader-seen.ts. */}
        <script dangerouslySetInnerHTML={{ __html: LOADER_SEEN_SCRIPT }} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }}
        />

        {/* Reveal animations are JS-driven — without JS the content must still be visible. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}.loader{display:none!important}`}</style>
        </noscript>

        <Loader />
        <CursorSpotlight />
        <ProgressSpine socials={site.socials} />
        <BackToTop />

        {/* id is the handle Loader uses to make everything behind it inert. */}
        <div id="site" className="max-w-full overflow-x-clip">
          {/* A landmark so the skip link isn't loose content outside every
              region (axe `region`). The link stays position:fixed — this wrapper
              isn't transformed, so its placement is unchanged. */}
          <nav aria-label="Skip to content">
            <a className="skip" href="#work">
              Skip to content
            </a>
          </nav>

          <Nav contactEmail={site.email} />
          <main>{children}</main>
          <Footer site={site} />
        </div>

        <Analytics />
        <SpeculationRules />
      </body>
    </html>
  );
}
