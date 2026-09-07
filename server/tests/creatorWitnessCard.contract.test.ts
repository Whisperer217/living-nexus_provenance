import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Creator Witness Card contract", () => {
  it("reuses the established QR identity artifact instead of creating a parallel creator-card system", () => {
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const card = read("client/src/components/QRIdentityCard.tsx");

    expect(page).toContain('import { QRShareModal } from "@/components/QRIdentityCard"');
    expect(page).toContain("Creator Witness Card");
    expect(page).toContain("<QRShareModal");
    expect(card).toContain("const CARD_W = 480");
    expect(card).toContain("const CARD_H = 760");
    expect(card).toContain("Download Card");
  });

  it("builds a creator QR that resolves directly to the active canonical creator page", () => {
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const card = read("client/src/components/QRIdentityCard.tsx");

    expect(page).toContain("const canonicalCreatorPath = `/creator/${encodeURIComponent(creator.artistHandle || String(creator.id))}`");
    expect(page).toContain("canonicalUrl: `${window.location.origin}${canonicalCreatorPath}`");
    expect(card).toContain("if (entity.canonicalUrl)");
    expect(card).toContain("renderCardToCanvas(canvasRef.current, entity, entity.canonicalUrl)");
    expect(card).toContain("canonicalUrl?: string");
  });

  it("uses only creator-owned public visual and declared identity data with a neutral fallback", () => {
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const card = read("client/src/components/QRIdentityCard.tsx");

    expect(page).toContain("thumbnailUrl: creator.bannerUrl || creator.profilePhotoUrl || undefined");
    expect(page).toContain("description: why || bio || `${displayName} on ${LOOP_PRODUCT.name}`");
    expect(card).toContain("thumbnailPositionX?: number");
    expect(card).toContain("thumbnailPositionY?: number");
    expect(card).toContain("Placeholder gradient");
    expect(card).not.toContain("generateImage");
  });

  it("does not treat QR card generation as a Work, WID, or provenance mutation", () => {
    const card = read("client/src/components/QRIdentityCard.tsx");
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");

    expect(card).not.toContain("songs.upload");
    expect(card).not.toContain("generateWID");
    expect(card).not.toContain("createProvenance");
    expect(page).not.toContain("witness.register");
  });
});
