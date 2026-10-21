export type UploadEntryDestination =
  | { kind: "draft-resume"; draftId: number }
  | { kind: "manifest"; href: string };

/**
 * Resolves the retired `/upload` entry without dropping a historic Draft's
 * identity. Valid owner Draft resumes remain on the existing UploadPage, whose
 * protected `songs.getMyDraft` query performs the authority check. All other
 * registration URLs retain their complete query string on the canonical
 * Manifestation Studio.
 */
export function resolveUploadEntry(search: string): UploadEntryDestination {
  const rawSearch = search.startsWith("?") ? search.slice(1) : search;
  const draftIdParam = new URLSearchParams(rawSearch).get("editId")?.trim() ?? "";

  if (/^\d+$/.test(draftIdParam)) {
    const draftId = Number(draftIdParam);
    if (Number.isSafeInteger(draftId) && draftId > 0) {
      return { kind: "draft-resume", draftId };
    }
  }

  return {
    kind: "manifest",
    href: rawSearch ? `/manifest?${rawSearch}` : "/manifest",
  };
}
