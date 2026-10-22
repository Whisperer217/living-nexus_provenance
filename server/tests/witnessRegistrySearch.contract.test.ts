import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Witness Registry public search", () => {
  it("extends the existing public cursor query with a bounded optional query instead of creating a second ledger route", () => {
    const router = source("server/routers/witnessRegistry.ts");

    expect(router).toContain('query: z.string().trim().max(120).optional()');
    expect(router).toContain('const { type, cursor, limit, query } = input;');
    expect(router).toContain('getWitnessRegistry({ type, offset: cursor, limit: limit + 1, query })');
    expect(router).not.toContain('search: protectedProcedure');
  });

  it("matches only existing published WID records by Work, WID, Creator name, or Creator handle", () => {
    const db = source("server/utils/db.ts");
    const start = db.indexOf("export async function getWitnessRegistry");
    const end = db.indexOf("// ─── Admin Helpers", start);
    const registryReader = db.slice(start, end);

    expect(registryReader).toContain('eq(songs.status, "Published")');
    expect(registryReader).toContain("sql`${songs.witnessId} IS NOT NULL`");
    expect(registryReader).toContain('const searchNeedle = (query ?? "").trim().replace(/^@+/, "");');
    expect(registryReader).toContain("like(songs.title, searchPattern)");
    expect(registryReader).toContain("like(songs.witnessId, searchPattern)");
    expect(registryReader).toContain("like(users.name, searchPattern)");
    expect(registryReader).toContain("like(users.artistHandle, searchPattern)");
    expect(registryReader).toContain(".limit(limit)");
    expect(registryReader).toContain(".offset(offset)");
    expect(registryReader).not.toMatch(/\.insert\(|\.update\(|\.delete\(|storagePut|addWorkEvent/);
  });

  it("keeps Creator, Work, and WID discovery on the existing responsive Registry page with a debounced input", () => {
    const page = source("client/src/pages/WitnessRegistryPage.tsx");

    expect(page).toContain("function useDebouncedValue<T>(value: T, delayMs: number): T");
    expect(page).toContain("const debouncedSearch = useDebouncedValue(trimmedSearch, 300);");
    expect(page).toContain('query: activeSearch || undefined');
    expect(page).toContain('htmlFor="witness-registry-search"');
    expect(page).toContain('placeholder="Search Creator, @handle, Work title, or WID…"');
    expect(page).toContain('aria-label="Clear Registry search"');
    expect(page).toContain("setCursor(0);");
    expect(page).toContain("setAllItems([]);");
    expect(page).toContain('className="w-full min-w-0 rounded-xl');
    expect(page).not.toContain("trpc.search.global.useQuery");
  });
});
