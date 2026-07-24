import { defineCliConfig } from "sanity/cli";

import { dataset, projectId } from "./sanity/env";

/**
 * Sanity CLI config — used by `npm run studio:dev` / `studio:build` /
 * `studio:deploy`. The Studio is a standalone app (not embedded in Next; see the
 * note in sanity.config.ts), so the CLI owns its dev server and its deploy to
 * Sanity's hosting.
 *
 * The ids come from sanity/env.ts, the one place both this and the Next app
 * resolve them. `studioHost` names the *.sanity.studio subdomain the editor is
 * published to; change it if the name is taken.
 */
export default defineCliConfig({
  api: { projectId, dataset },
  studioHost: "myndstack",
  // Auto-updates pull a Studio runtime at boot that can mismatch the version-
  // locked Vite/Rolldown bundled with the installed sanity packages (the
  // "Missing field moduleType" crash). Off = the Studio runs exactly the
  // versions in package-lock, which is what we test and deploy against.
  deployment: { autoUpdates: false },
  /**
   * The Studio's bundler (Vite) auto-discovers the project's root
   * `postcss.config.mjs`. That file is the Next app's Tailwind v4 config in the
   * string-plugin form (`plugins: ["@tailwindcss/postcss"]`), which Vite's
   * postcss-load-config rejects — it wants resolved plugin instances — so
   * `studio:dev` crashed with "Invalid PostCSS Plugin found at: plugins[0]".
   *
   * The Studio is styled-components and uses no PostCSS at all. Handing Vite an
   * explicit inline `postcss` config short-circuits the filesystem search, so it
   * never touches the Tailwind file. Empty = no PostCSS, which is correct here.
   */
  vite: (config) => {
    config.css = { ...config.css, postcss: {} };
    // Node 26 + Sanity's bundled Rolldown-Vite crashes injecting the HMR react-
    // refresh preamble ("Missing field moduleType"). Disabling HMR skips that
    // path; the Studio just needs a manual refresh after a schema edit, which is
    // fine for a content editor. (Production build is unaffected — no HMR there.)
    config.server = { ...config.server, hmr: false };
    return config;
  },
});
