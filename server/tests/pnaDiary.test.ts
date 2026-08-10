import { beforeEach, describe, expect, it } from "vitest";
import {
  consumePnaDiaryReload,
  PNA_DIARY_RELOAD_KEY,
  writePnaDiaryReload,
} from "../../client/src/lib/pnaDiary";

function installSessionStorage() {
  const storage = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };
  return storage;
}

describe("PNA diary restoration handoff", () => {
  beforeEach(() => {
    delete (globalThis as any).sessionStorage;
  });

  it("writes the selected creator diary and consumes it exactly once", () => {
    const storage = installSessionStorage();
    const diary = {
      archiveId: 42,
      title: "Field Notes",
      diaryWid: "WID-CNV-1-42-ABC123",
      personaId: "guide",
      songTitle: "Witness Song",
      messages: [
        { id: "m1", role: "user" as const, content: "I remember this." },
        { id: "m2", role: "pna" as const, content: "The testimony remains." },
      ],
    };

    writePnaDiaryReload(diary);
    expect(storage.get(PNA_DIARY_RELOAD_KEY)).toContain("WID-CNV-1-42-ABC123");
    expect(consumePnaDiaryReload()).toEqual(diary);
    expect(storage.get(PNA_DIARY_RELOAD_KEY)).toBeUndefined();
    expect(consumePnaDiaryReload()).toBeNull();
  });

  it("fails closed for malformed session state", () => {
    const storage = installSessionStorage();
    storage.set(PNA_DIARY_RELOAD_KEY, "not-json");

    expect(consumePnaDiaryReload()).toBeNull();
    expect(storage.get(PNA_DIARY_RELOAD_KEY)).toBeUndefined();
  });
});
