import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mainEntry = path.resolve(process.cwd(), "client/src/main.tsx");
const appEntry = path.resolve(process.cwd(), "client/src/App.tsx");

describe("player provider composition", () => {
  it("wraps WorkEditorProvider with PlayerProvider at the application root", () => {
    const source = fs.readFileSync(mainEntry, "utf8");
    const playerOpen = source.indexOf("<PlayerProvider>");
    const workEditorOpen = source.indexOf("<WorkEditorProvider>");
    const workEditorClose = source.indexOf("</WorkEditorProvider>");
    const playerClose = source.indexOf("</PlayerProvider>");

    expect(playerOpen).toBeGreaterThan(-1);
    expect(workEditorOpen).toBeGreaterThan(playerOpen);
    expect(workEditorClose).toBeGreaterThan(workEditorOpen);
    expect(playerClose).toBeGreaterThan(workEditorClose);
  });

  it("does not mount a competing PlayerProvider inside the App shell", () => {
    const source = fs.readFileSync(appEntry, "utf8");

    expect(source).not.toContain("<PlayerProvider>");
    expect(source).not.toContain('from "./contexts/PlayerContext"');
  });
});
