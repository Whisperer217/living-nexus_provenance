/**
 * Shared key + payload for reopening a PNA diary thread in /pna.
 * Written by Keeper NOTES diary browser; consumed once by PNAShellPage.
 */

export const PNA_DIARY_RELOAD_KEY = "ln-pna-diary-reload";

export type PnaDiaryReloadMessage = {
  id?: string;
  role: "user" | "assistant" | "pna";
  content: string;
  mode?: string;
};

export type PnaDiaryReloadPayload = {
  archiveId: number;
  title: string;
  diaryWid?: string | null;
  personaId?: string | null;
  songTitle?: string | null;
  messages: PnaDiaryReloadMessage[];
};

export function writePnaDiaryReload(payload: PnaDiaryReloadPayload): void {
  try {
    sessionStorage.setItem(PNA_DIARY_RELOAD_KEY, JSON.stringify(payload));
  } catch {
    /* private browsing */
  }
}

export function consumePnaDiaryReload(): PnaDiaryReloadPayload | null {
  try {
    const raw = sessionStorage.getItem(PNA_DIARY_RELOAD_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PNA_DIARY_RELOAD_KEY);
    return JSON.parse(raw) as PnaDiaryReloadPayload;
  } catch {
    return null;
  }
}
