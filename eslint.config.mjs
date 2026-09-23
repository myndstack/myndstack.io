/**
 * eslint-config-next 16 ships native flat configs, so these are imported
 * directly. The previous setup wrapped the legacy `next/core-web-vitals` and
 * `next/typescript` names in `FlatCompat`; against v16 that double-wraps an
 * already-flat config and ESLint dies with "Converting circular structure to
 * JSON". Importing the flat arrays is both the supported path and simpler —
 * `@eslint/eslintrc` is no longer needed here at all.
 */

import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  // Generated output and the design handoff are not ours to lint.
  {
    ignores: [
      ".next/**",
      ".next-build/**",
      "node_modules/**",
      "_import/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      // Sanity Studio build output (`sanity build` / `studio:deploy`).
      "dist/**",
    ],
  },
  // anime.js enters the codebase through lib/motion/anime/* only (per-subpath
  // files, so chunks stay small), and its scroll module never enters at all:
  // onScroll adds a scroll listener + per-frame layout reads, and AGENTS.md
  // allows exactly one scroll loop (lib/scroll.ts).
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/motion/anime/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["animejs", "animejs/*"],
              message: "Import anime.js via @/lib/motion/anime/* (see lib/motion/anime/core.ts).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/motion/anime/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "animejs",
              message: "Import a subpath (animejs/animation, …), never the root bundle.",
            },
          ],
          patterns: [
            {
              group: ["animejs/events", "animejs/events/*"],
              message: "Never animejs/events (onScroll): one scroll loop only (AGENTS.md).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
