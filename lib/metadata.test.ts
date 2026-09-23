import { describe, expect, it } from "vitest";

import { SITE_URL } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

describe("pageMetadata", () => {
  const meta = pageMetadata({ path: "/privacy", title: "Privacy — Myndstack", description: "d" });

  it("sets the canonical path", () => {
    expect(meta.alternates?.canonical).toBe("/privacy");
  });

  it("gives social previews the page's own URL, not the homepage's", () => {
    // A page-level openGraph object REPLACES the root one wholesale, so every
    // field the root set must be restated or it silently disappears.
    expect(meta.openGraph).toMatchObject({
      url: `${SITE_URL}/privacy`,
      siteName: "Myndstack",
      type: "website",
      title: "Privacy — Myndstack",
      description: "d",
    });
  });

  it("overrides the inherited twitter card text", () => {
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Privacy — Myndstack",
      description: "d",
    });
  });
});
