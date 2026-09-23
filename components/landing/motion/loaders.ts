import type { ChapterModule } from "@/lib/motion/chapter";

/**
 * Lazy motion modules, one per chapter. Only these builders are code-split;
 * the chapters' markup is server-rendered in its built state regardless. Each
 * import() becomes its own chunk, fetched when the chapter nears the viewport.
 */
export const CHAPTER_LOADERS = {
  "core-hero": () => import("../chapters/hero.motion"),
  platform: () => import("../chapters/platform.motion"),
  "core-caps": () => import("../chapters/capabilities.motion"),
  cases: () => import("../chapters/cases.motion"),
  process: () => import("../chapters/process.motion"),
  tools: () => import("../chapters/tools.motion"),
  pricing: () => import("../chapters/ambient.motion"),
  cta: () => import("../chapters/ambient.motion"),
} satisfies Record<string, () => Promise<ChapterModule>>;

export type ChapterId = keyof typeof CHAPTER_LOADERS;
