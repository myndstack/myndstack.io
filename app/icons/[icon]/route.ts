import { iconResponse } from "@/lib/icon-mark";

/**
 * Maskable PWA icons, referenced from app/manifest.ts. Android may crop the icon
 * to a circle/squircle, so the mark is rendered at ~0.78 of the canvas to keep the
 * whole wordmark inside the centre-80% safe zone.
 *
 * One dynamic route serves both sizes; generateStaticParams + force-static bakes
 * them at build time so they're cache-forever static assets, not per-request work.
 */
const ICONS: Record<string, number> = {
  "maskable-192.png": 192,
  "maskable-512.png": 512,
};

const MASKABLE_SCALE = 0.78;

export function generateStaticParams() {
  return Object.keys(ICONS).map((icon) => ({ icon }));
}

export const dynamic = "force-static";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ icon: string }> },
) {
  const size = ICONS[(await ctx.params).icon];
  if (!size) return new Response("Not found", { status: 404 });
  return iconResponse(size, MASKABLE_SCALE);
}
