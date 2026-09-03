/**
 * Work metadata helpers shared by Register and Edit Work. Genre remains
 * editorial metadata: it is intentionally not a WID-signature input.
 */
export const OTHER_GENRE = "Other";

export function parseWorkGenres(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .filter((genre, index, values) => values.indexOf(genre) === index);
}

export function serializeWorkGenres(genres: readonly string[]): string | undefined {
  const normalized = genres
    .map((genre) => genre.trim())
    .filter(Boolean)
    .filter((genre, index, values) => values.indexOf(genre) === index);
  return normalized.length ? normalized.join(", ") : undefined;
}

export function toggleWorkGenre(value: string | null | undefined, genre: string): string | undefined {
  const selected = parseWorkGenres(value);
  return serializeWorkGenres(
    selected.includes(genre)
      ? selected.filter((selectedGenre) => selectedGenre !== genre)
      : [...selected, genre]
  );
}
