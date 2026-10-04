import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), "utf8");

describe("PNA governance contracts", () => {
  it("defines explicit creator-controlled profile permissions and prohibitions", () => {
    const contracts = read("shared/pnaGovernance.ts");
    const settings = read("client/src/pages/PNASettingsPage.tsx");

    expect(contracts).toContain("PNA_STEWARDSHIP_PROFILES");
    expect(contracts).toContain("Create, alter, or issue a Work, WID, testimony, provenance event, declaration, publication, license, or payment.");
    expect(settings).toContain("Permit remote selected-context use");
    expect(settings).toContain("allowRemoteContext");
    expect(settings).toContain("Each send rechecks this setting, source ownership, source compatibility, and the Envelope revision.");
  });

  it("rechecks owner, profile, envelope revision, and selected source access at model-send time", () => {
    const governance = read("server/utils/pnaGovernance.ts");
    const keeper = read("server/routers/keeper.ts");

    expect(governance).toContain("requireOwnedPnaThread");
    expect(governance).toContain("resolveOwnedPnaContextSource");
    expect(governance).toContain("envelope.revision !== receipt.envelopeRevision");
    expect(governance).toContain("pnaContextUseEntries");
    expect(governance).toContain("sourceRefSnapshot");
    expect(keeper).toContain("pnaContextReceiptId");
    expect(keeper).toContain("resolvePnaContextUseForModel");
    expect(keeper).toContain("settlePnaContextReceipt");
    expect(keeper).toContain("Private PNA visual requests require a matched thread and Vision Profile.");
    expect(keeper).toContain('getPnaProfileSetting(ctx.user.id, "vision")');
    expect(keeper).toContain("input.pnaThreadId ? null : await getUserById");
  });

  it("keeps attached Context local instead of failing a normal PNA reply before remote consent", () => {
    const shell = read("client/src/pages/PNAShellPage.tsx");
    const composer = read("client/src/components/pna/PNAComposerBar.tsx");

    expect(shell).toContain("const canUseSelectedContext = Boolean(activeProfile?.allowRemoteContext);");
    expect(shell).toContain('activeMode === "vision" || !canUseSelectedContext');
    expect(shell).toContain("receiptId: null, sourceCount: 0");
    expect(composer).toContain("Attached context remains private and will not be sent with this reply.");
    expect(composer).toContain("Review permissions");
  });

  it("keeps Artifacts private and routes visual preservation through review before Quiver", () => {
    const router = read("server/routers/pnaGovernance.ts");
    const shell = read("client/src/pages/PNAShellPage.tsx");

    expect(router).toContain("if (artifact.state === \"draft\") throw new TRPCError");
    expect(router).toContain("state: \"preserved_private\"");
    expect(router).toContain("quiverImages");
    expect(router).toContain("No Work, Witness ID, testimony, provenance event, publication, license, payment, or public page changed.");
    expect(router).not.toContain("db.insert(songs)");
    expect(router).not.toContain("db.insert(wids)");
    expect(shell).toContain("createVisualArtifact.mutateAsync");
    expect(shell).toContain("PRIVATE ARTIFACT READY FOR REVIEW");
  });

  it("keeps migrations additive and records the exact source set used by a model receipt", () => {
    const schema = read("drizzle/schema.ts");
    const migration136 = read("drizzle/0136_nosy_sally_floyd.sql");
    const migration137 = read("drizzle/0137_magenta_newton_destine.sql");

    for (const table of ["pna_profile_settings", "pna_context_envelopes", "pna_context_entries", "pna_context_use_receipts", "pna_artifacts", "pna_artifact_sources", "pna_action_receipts", "pna_context_use_entries"]) {
      expect(schema).toContain(table);
    }
    expect(migration136).toContain("CREATE TABLE `pna_context_envelopes`");
    expect(migration136).not.toContain("DROP TABLE");
    expect(migration137).toContain("CREATE TABLE `pna_context_use_entries`");
    expect(migration137).not.toContain("DROP TABLE");
  });
});
