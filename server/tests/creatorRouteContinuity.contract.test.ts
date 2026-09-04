import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("creator route continuity contract", () => {
  it("keeps the active route able to resolve either a public handle or a numeric creator ID", () => {
    const app = read("client/src/App.tsx");
    const creatorPage = read("client/src/pages/loop/LoopCreatorPage.tsx");

    expect(app).toContain('path="/creator/:id"');
    expect(app).toContain('new RegExp("^/@(?<handle>[^/]+)/?$")');
    expect(creatorPage).toContain("trpc.profile.getByHandle.useQuery");
    expect(creatorPage).toContain("trpc.profile.getCreator.useQuery");
  });

  it("routes Home and player identity controls through canonical handle-or-ID data rather than display names", () => {
    const home = read("client/src/pages/HomePage.tsx");
    const playerBar = read("client/src/components/player/PlayerBar.tsx");

    expect(home).toContain('`/creator/${creator.artistHandle || creator.handle}`');
    expect(home).toContain('`/creator/${v.artistHandle}`');
    expect(playerBar).toContain('`/creator/${currentTrack.creatorHandle}`');
    expect(playerBar).toContain('`/creator/${currentTrack.creatorId}`');
    expect(playerBar).not.toContain('`/creator/${currentTrack.artist}`');
  });

  it("keeps every active client creator URL on a supported creator route family", () => {
    const clientRoot = resolve(process.cwd(), "client/src");
    const sources = readdirSync(clientRoot, { recursive: true })
      .filter((entry) => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
      .map((entry) => readFileSync(resolve(clientRoot, entry), "utf8"))
      .filter((source) => source.includes("/creator/"))
      .join("\n");

    expect(sources).toContain("/creator/");
    expect(sources).toContain("/@");
    expect(sources).not.toContain('`/creator/${currentTrack.artist}`');
  });

  it("keeps Arrange domain owner-gated and persisted through the existing protected router", () => {
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const editor = read("client/src/components/domain/DomainEditor.tsx");
    const router = read("server/routers/domain.ts");

    expect(page).toContain("isOwner &&");
    expect(page).toContain('"Arrange domain"');
    expect(page).toContain("<DomainEditor");
    expect(editor).toContain("isDirty");
    expect(editor).toContain("trpc.domain.saveLayout.useMutation");
    expect(router).toContain("saveLayout: protectedProcedure");
    expect(router).toContain("ctx.user.id");
  });
});
