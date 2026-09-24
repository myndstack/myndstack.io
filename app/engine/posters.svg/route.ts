import { spriteSvg } from "@/lib/landing/engine/sprite";

/**
 * The engine's technical drawings, one <symbol> each (lib/landing/engine/sprite.ts):
 * prerendered at build, and cached for good — the page asks for it by a URL
 * versioned with its content (SPRITE_URL).
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(spriteSvg(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
