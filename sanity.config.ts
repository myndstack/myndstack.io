/**
 * Studio configuration, run as a STANDALONE app by the Sanity CLI — see the
 * `studio:*` scripts in package.json and sanity.cli.ts.
 *
 * It is not embedded in the Next app. Sanity v5's Studio UI does
 * `import { useEffectEvent } from "react"`; React 19.2 has it at runtime, but
 * Next 15.5's compiled-react shim predates the export, so an embedded /studio
 * fails to compile — and forcing webpack to the real React breaks Next's server
 * renderer (dual-React). Standalone sidesteps all of it and keeps the Studio UI
 * out of the marketing bundle entirely. The site reaches the same dataset
 * through lib/sanity/ regardless of where the editor is hosted.
 */

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { apiVersion, dataset, projectId } from "./sanity/env";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

export default defineConfig({
  name: "myndstack",
  title: "Myndstack",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure }),
    // GROQ playground, handy for verifying the queries in lib/sanity/queries.ts.
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
