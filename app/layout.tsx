import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Hanken_Grotesk, Space_Mono } from "next/font/google";

import Analytics from "@/components/Analytics";
import BackToTop from "@/components/BackToTop";
import CursorSpotlight from "@/components/CursorSpotlight";
import Footer from "@/components/Footer";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import ProgressSpine from "@/components/ProgressSpine";
import { SITE, SITE_URL } from "@/lib/content";
import { jsonLd } from "@/lib/format";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
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
  openGraph: { type: "website", url: SITE_URL, siteName: SITE.name, title, description: social },
  twitter: { card: "summary_large_image", title, description: social },
};

/** Organization markup so search results can show the brand, not just the page. */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE_URL,
  description,
  logo: `${SITE_URL}/myndstack-logo-square.svg`,
  email: SITE.email,
  telephone: SITE.phone,
  address: { "@type": "PostalAddress", addressLocality: "Kerala", addressCountry: "IN" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${spaceMono.variable}`}
    >
      <body>
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
        <ProgressSpine />
        <BackToTop />

        {/* id is the handle Loader uses to make everything behind it inert. */}
        <div id="site" className="max-w-full overflow-x-clip">
          <a className="skip" href="#work">
            Skip to content
          </a>

          <Nav />
          <main>{children}</main>
          <Footer />
        </div>

        <Analytics />
      </body>
    </html>
  );
}
