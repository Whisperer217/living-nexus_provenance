import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Legacy Stewardship custody boundary", () => {
  it("uses an additive, revocable, creator-scoped grant instead of a global role change", () => {
    const schema = read("drizzle/schema.ts");
    const helper = read("server/utils/legacyStewardship.ts");
    const router = read("server/routers/legacyStewardship.ts");

    expect(schema).toContain('export const legacyStewardshipGrants = mysqlTable("legacyStewardshipGrants"');
    expect(schema).toContain('status: mysqlEnum("status", ["active", "revoked"])');
    expect(schema).toContain('activeKey: varchar("activeKey", { length: 64 })');
    expect(schema).toContain('activePairUnique: uniqueIndex("legacyStewardshipGrants_active_pair_uq").on(t.activeKey)');
    expect(helper).toContain('return `${creatorId}:${stewardId}`;');
    expect(router).toContain("adminProcedure");
    expect(router).toContain("input.creatorId === input.stewardId");
    expect(router).not.toContain("ctx.user.role =");
  });

  it("persists append-only custody events and immutable memorial body hashes", () => {
    const schema = read("drizzle/schema.ts");
    const helper = read("server/utils/legacyStewardship.ts");
    const router = read("server/routers/legacyStewardship.ts");

    expect(schema).toContain('export const legacyStewardshipEvents = mysqlTable("legacyStewardshipEvents"');
    expect(schema).toContain('eventType: mysqlEnum("eventType", ["granted", "revoked", "reconciliation_recorded", "memorial_published"])');
    expect(schema).toContain('export const legacyMemorialStatements = mysqlTable("legacyMemorialStatements"');
    expect(schema).toContain('bodyHash: varchar("bodyHash", { length: 64 }).notNull()');
    expect(helper).toContain('createHash("sha256").update(input.body, "utf8").digest("hex")');
    expect(router).toContain("appendMemorial");
    expect(router).not.toContain("updateMemorial");
    expect(router).not.toContain("deleteMemorial");
  });

  it("keeps public memorial presentation separate from private grant and audit data", () => {
    const router = read("server/routers/legacyStewardship.ts");
    const helper = read("server/utils/legacyStewardship.ts");

    expect(router).toContain("publicMemorials: publicProcedure");
    expect(router).toContain("myAuthority: protectedProcedure");
    expect(router).toContain("events: protectedProcedure");
    expect(router).toContain('message: "Legacy Stewardship access is not available."');
    expect(helper).toContain("stewardName: users.name");
    expect(helper).not.toContain("fileUrl:");
    expect(helper).not.toContain("email:");
  });

  it("reconciles canonical Work WIDs without treating the auxiliary WID index as authority", () => {
    const helper = read("server/utils/legacyStewardship.ts");
    const router = read("server/routers/legacyStewardship.ts");

    expect(helper).toContain("const canonicalWidPattern = /^WID-");
    expect(helper).toContain("missingCanonicalWids");
    expect(helper).toContain("duplicateCanonicalWids");
    expect(helper).toContain("auxiliaryWidsNotAttachedToCurrentWorks");
    expect(helper).toContain("snapshotSha256");
    expect(router).toContain("reconcile: protectedProcedure");
    expect(router).toContain('requireScope(grant, "viewRegistry")');
    expect(router).toContain("recordReconciliation: protectedProcedure");
  });

  it("records the intended initial grant and memorial draft without publishing either in source", () => {
    const adr = read("docs/lnls/architecture/LEGACY-STEWARDSHIP-AND-MEMORIAL-ADR.md");
    const draft = read("docs/lnls/legacy/RANDALL-SMITH-NEROS-SHADOW-MEMORIAL-DRAFT.md");

    expect(adr).toContain("`@Nero's Shadow` (`users.id = 1320247`)");
    expect(adr).toContain("Doc Seraph Mercer (`users.id = 1`)");
    expect(adr).toContain("does **not** transfer copyright, authorship, ownership, or legal authority");
    expect(draft).toContain("**Status:** Draft only — **not published**");
    expect(draft).toContain("append-only stewardship notice");
  });
});
