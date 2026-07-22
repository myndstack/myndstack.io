import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Generated output and the design handoff are not ours to lint.
  {
    ignores: [
      ".next/**",
      ".next-build/**",
      "node_modules/**",
      "_import/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
