export type WorkHistoricalDates = {
  creationDate?: string | null;
  originalReleaseDate?: string | null;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseHistoricalDate(value?: string | null): Date | undefined {
  if (!value || !ISO_DATE_PATTERN.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return undefined;
  return date;
}

export function formatHistoricalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHistoricalDate(value?: string | null): string | null {
  const date = parseHistoricalDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function validateHistoricalDates({
  creationDate,
  originalReleaseDate,
}: WorkHistoricalDates): string | null {
  const creation = creationDate ? parseHistoricalDate(creationDate) : undefined;
  const originalRelease = originalReleaseDate ? parseHistoricalDate(originalReleaseDate) : undefined;

  if (creationDate && !creation) return "Creation Date must be a valid calendar date.";
  if (originalReleaseDate && !originalRelease) return "Original Release Date must be a valid calendar date.";
  if (creation && originalRelease && creation > originalRelease) {
    return "Original Release Date cannot be earlier than Creation Date.";
  }
  return null;
}
