import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectProvenanceWorkingState,
  formatWorkingStateForAgent,
} from "../../shared/provenanceWorkingState";

describe("provenance working state", () => {
  it("labels sealed playback with the real WID and never invents one when unsealed", () => {
    const sealed = collectProvenanceWorkingState({
      route: "/pna",
      pnaMode: "witness",
      playing: true,
      track: { title: "Witness Song", artist: "Maria", id: "12", wid: "WID-1" },
    });
    expect(sealed.playback.provenance).toBe("sealed");
    expect(sealed.playback.wid).toBe("WID-1");
    const sealedBlock = formatWorkingStateForAgent(sealed);
    expect(sealedBlock).toContain("WID-1");
    expect(sealedBlock).toContain("never invent provenance");

    const unsealed = collectProvenanceWorkingState({
      route: "/explore",
      navMode: "explore",
      playing: true,
      track: { title: "Sketch", artist: "Anon", id: "9" },
    });
    expect(unsealed.playback.provenance).toBe("unsealed");
    expect(unsealed.playback.wid).toBeNull();
    const unsealedBlock = formatWorkingStateForAgent(unsealed);
    expect(unsealedBlock).not.toMatch(/WID-[A-Z0-9]/);
    expect(unsealedBlock).toContain("Do not invent one, a lineage, or a remix history");
  });

  it("wires working state into keeper.chat, PNA Exchange, the player strip, and the drawer", () => {
    const keeper = fs.readFileSync(path.resolve(process.cwd(), "server/routers/keeper.ts"), "utf8");
    const pna = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/PNAShellPage.tsx"), "utf8");
    const topBar = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/layout/TopBar.tsx"), "utf8");
    const drawer = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/layout/ContextDrawer.tsx"), "utf8");

    expect(keeper).toContain("workingState:");
    expect(keeper).toContain("formatWorkingStateForAgent");
    expect(pna).toContain("collectProvenanceWorkingState");
    expect(pna).toContain("workingState:");
    expect(pna).toContain('generateArtwork.mutateAsync({ prompt: text })');
    expect(topBar).toContain("Sealed · {track.witnessId}");
    expect(topBar).toContain("Unsealed · no WID");
    expect(drawer).toContain("BOUND WORK");
    expect(drawer).toContain("Do not invent lineage here");
  });
});
