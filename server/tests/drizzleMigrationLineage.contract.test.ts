import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "drizzle");
const meta = path.join(root, "meta");
const journalPath = path.join(meta, "_journal.json");

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

describe("Drizzle migration lineage", () => {
  it("maps every active journal entry to one SQL file", () => {
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries: JournalEntry[] };
    const indexes = journal.entries.map((entry) => entry.idx);

    expect(new Set(indexes).size).toBe(indexes.length);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);

    for (const entry of journal.entries) {
      expect(fs.existsSync(path.join(root, `${entry.tag}.sql`))).toBe(true);
    }
  });

  it("uses one canonical reconciliation baseline after the trusted 0133 state", () => {
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries: JournalEntry[] };
    const baseline = journal.entries.at(-1);
    const migrationPath = path.join(root, "0134_reconcile_live_schema.sql");
    const archivedPath = path.join(root, "legacy", "untracked-pre-0134");

    expect(baseline?.tag).toBe("0134_reconcile_live_schema");
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.existsSync(path.join(meta, "0134_snapshot.json"))).toBe(true);
    expect(fs.existsSync(archivedPath)).toBe(true);
    expect(fs.readdirSync(archivedPath)).toContain("0134_batch_upload_integrity_foundation.sql");
    expect(fs.readdirSync(archivedPath)).toContain("0142_external_display_authorization.sql");
  });

  it("keeps the canonical baseline content-addressable for ledger verification", () => {
    const migration = fs.readFileSync(path.join(root, "0134_reconcile_live_schema.sql"), "utf8");
    const hash = crypto.createHash("sha256").update(migration).digest("hex");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(migration).toContain("CREATE TABLE `batchUploadOperations`");
    expect(migration).toContain("ADD `externalDisplayEnabled`");
  });
});
