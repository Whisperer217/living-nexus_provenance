/** PNA chat atmosphere + avatar capability catalog. Chrome only — not provenance. */

export const PNA_LOGO_URL = "/manus-storage/living-nexus-logo-2025_19c2d497.png";
export const LS_PNA_CHAT_THEME = "ln-pna-chat-theme";

export type PnaChatThemeId = "vine" | "ember";

export const PNA_CHAT_THEMES = [
  {
    id: "vine" as const,
    label: "Illuminated Vine",
    desc: "Flowery gold border · quiet breath",
    paid: false,
  },
  {
    id: "ember" as const,
    label: "Ember Stream",
    desc: "Warmer field · denser pulse · paid skin",
    paid: true,
  },
] as const;

export type PnaAvatarId = "hooded-scholar" | "conductor" | "witness" | "archivist" | "cipher";

export const PNA_AVATARS: {
  id: PnaAvatarId;
  name: string;
  capability: string;
  mode: "guide" | "conductor" | "witness" | "archivist" | "custodian";
  locked: boolean;
}[] = [
  { id: "hooded-scholar", name: "Hooded Scholar", capability: "Guide · direction · voice", mode: "guide", locked: false },
  { id: "conductor", name: "The Conductor", capability: "Compose · structure · flow", mode: "conductor", locked: true },
  { id: "witness", name: "The Witness", capability: "Testimony · emotional truth", mode: "witness", locked: true },
  { id: "archivist", name: "The Archivist", capability: "Archive · corpus · pattern", mode: "archivist", locked: true },
  { id: "cipher", name: "The Cipher", capability: "Registry · WID · lineage", mode: "custodian", locked: true },
];

export function pnaAvatarById(id: string | null | undefined) {
  return PNA_AVATARS.find((avatar) => avatar.id === id) ?? null;
}

export function normalizePnaChatTheme(raw: string | null | undefined): PnaChatThemeId {
  return raw === "ember" ? "ember" : "vine";
}

export function readPnaChatTheme(): PnaChatThemeId {
  try {
    return normalizePnaChatTheme(localStorage.getItem(LS_PNA_CHAT_THEME));
  } catch {
    return "vine";
  }
}

export function persistPnaChatTheme(id: PnaChatThemeId) {
  try {
    localStorage.setItem(LS_PNA_CHAT_THEME, id);
  } catch {
    /* ignore */
  }
}

export function bindNowPlayingContext(
  message: string,
  track: { title: string; artist?: string | null; wid?: string | null } | null,
): string {
  if (!track?.title) return message;
  const artist = track.artist?.trim() || "Unknown";
  const wid = track.wid?.trim() ? `WID ${track.wid.trim()}` : "WID pending";
  return `The creator's PNA dock is bound to this work (display only; do not invent provenance):\nTitle: ${track.title}\nArtist: ${artist}\n${wid}\n\nCreator message:\n${message}`;
}
