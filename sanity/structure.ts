import type { StructureResolver } from "sanity/structure";

/**
 * Custom desk so the two singletons open as a single editable document rather
 * than a list you can create duplicates in — there is only ever one Homepage
 * and one Site settings. Everything else is a normal document list.
 */
const SINGLETONS = [
  { id: "homepage", type: "homepage", title: "Homepage" },
  { id: "siteSettings", type: "siteSettings", title: "Site settings" },
] as const;

const HIDDEN = new Set<string>(SINGLETONS.map((s) => s.type));

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      ...SINGLETONS.map((s) =>
        S.listItem()
          .title(s.title)
          .id(s.id)
          .child(S.document().schemaType(s.type).documentId(s.id)),
      ),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => !HIDDEN.has(item.getId() ?? ""),
      ),
    ]);
