/**
 * Where the redesigned landing page lives while it's being built, and the link
 * rule that keeps its in-page anchors in-page. No directive: the server (Loader
 * gate, metadata) and the client (Nav) both import this.
 */

/** Hidden, noindex route for the redesign until it's swapped in as `/`. */
export const LANDING_PREVIEW_PATH = "/preview";

export function isLandingPath(pathname: string | null): boolean {
  return pathname === "/" || pathname === LANDING_PREVIEW_PATH;
}

/**
 * Site links to homepage sections are written `/#section`. That is right from
 * every sub-page, but on /preview a native `/#pricing` would load the live
 * homepage instead of scrolling — so on a landing page it becomes `#pricing`.
 */
export function homeHash(href: string, pathname: string | null): string {
  if (!href.startsWith("/#")) return href;
  return isLandingPath(pathname) ? href.slice(1) : href;
}
