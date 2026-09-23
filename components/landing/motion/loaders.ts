import type { ChapterModule } from "@/lib/motion/chapter";

/**
 * Lazy motion modules, one per chapter. Only these builders are code-split;
 * the chapters' markup is server-rendered in its built state regardless. Each
 * import() becomes its own chunk, fetched when the chapter nears the viewport.
 */
export const CHAPTER_LOADERS = {
  "core-hero": () => import("../chapters/hero.motion"),
} satisfies Record<string, () => Promise<ChapterModule>>;

export type ChapterId = keyof typeof CHAPTER_LOADERS;
