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
    expect(card).toContain('renderCardToCanvas(canvasRef.current, entity, entity.canonicalUrl, "preview")');
    expect(card).toContain("canonicalUrl?: string");
  });

  it("uses only creator-owned public visual and declared identity data with a neutral fallback", () => {
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const card = read("client/src/components/QRIdentityCard.tsx");

    expect(page).toContain("thumbnailUrl: creator.bannerUrl || creator.profilePhotoUrl || undefined");
    expect(page).toContain("description: why || bio || `${displayName} on ${LOOP_PRODUCT.name}`");
    expect(card).toContain("thumbnailPositionX?: number");
    expect(card).toContain("thumbnailPositionY?: number");
    expect(card).toContain('renderMode === "export" || !entity.thumbnailUrl');
    expect(card).toContain('backgroundImage: `url(${entity.thumbnailUrl})`');
    expect(card).not.toContain("generateImage");
  });

  it("keeps the full creator-declared testimony readable in the modal while using only a labelled canvas excerpt", () => {
    const card = read("client/src/components/QRIdentityCard.tsx");

    expect(card).toContain("CREATOR-DECLARED TESTIMONY");
    expect(card).toContain("Creator-declared testimony");
    expect(card).toContain("whitespace-pre-wrap break-words");
    expect(card).toContain("{entity.description}");
    expect(card).toContain("if (entity.description)");
  });

  it("uses full-vertical creator art for preview/export while limiting motion to the screen preview", () => {
    const card = read("client/src/components/QRIdentityCard.tsx");
    const styles = read("client/src/index.css");

    expect(card).toContain('renderMode: "preview" | "export"');
    expect(card).toContain('renderCardToCanvas(exportCanvas, entity, shareUrl, "export")');
    expect(card).toContain("creator-witness-card-preview-art");
    expect(styles).toContain("creator-witness-art-drift 18s");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(card).toContain("ctx.drawImage(img, (CARD_W - drawnW) * cropX, (CARD_H - drawnH) * cropY, drawnW, drawnH)");
  });

  it("opens the modal with a restrained fade and static subtle backdrop blur while honoring reduced motion", () => {
    const card = read("client/src/components/QRIdentityCard.tsx");
    const styles = read("client/src/index.css");

    expect(card).toContain("creator-witness-modal-backdrop");
    expect(card).toContain("backdrop-blur-sm");
    expect(card).toContain("creator-witness-modal-surface");
    expect(styles).toContain("creator-witness-modal-backdrop-in 180ms");
    expect(styles).toContain("creator-witness-modal-surface-in 260ms");
    expect(styles).toContain("transform: translateY(8px) scale(0.985)");
    expect(styles).toContain(".creator-witness-modal-backdrop,");
  });

  it("keeps the QR on an opaque quiet plane above the art field", () => {
    const card = read("client/src/components/QRIdentityCard.tsx");

    expect(card).toContain("const qrSize = 140");
    expect(card).toContain('ctx.fillStyle = "#ffffff"');
    expect(card).toContain("ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10)");
    expect(card).toContain("SCAN TO WITNESS");
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
