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
];

export default eslintConfig;
