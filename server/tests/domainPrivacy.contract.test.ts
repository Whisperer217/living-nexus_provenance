import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("P0 Domain privacy boundary", () => {
  it("projects only visible blocks to anonymous visitors", () => {
    const db = read("server/utils/db.ts");
    const start = db.indexOf("export async function getPublicDomainBlocks");
    const end = db.indexOf("export async function saveDomainLayout", start);
    const helper = db.slice(start, end);
    expect(helper).toContain("eq(domainBlocks.visible, true)");
    expect(helper).toContain("blockType: domainBlocks.blockType");
    expect(helper).not.toContain(".select()");
  });

  it("keeps raw layout and history on protected owner paths only", () => {
    const router = read("server/routers/domain.ts");
    const publicLayout = router.slice(router.indexOf("getLayout: publicProcedure"), router.indexOf("getMyLayout: protectedProcedure"));
    expect(publicLayout).toContain("getPublicDomainBlocks");
    expect(publicLayout).not.toContain("getDomainBlocks(input.userId)");
    expect(router).toContain("getMyLayout: protectedProcedure");
    expect(router).toContain("getVersionHistory: protectedProcedure");
    expect(router).not.toContain("getPublicVersionHistory:");
  });

  it("does not leave an anonymous history query in the public renderer", () => {
    const renderer = read("client/src/components/domain/DomainRenderer.tsx");
    const editor = read("client/src/components/domain/DomainEditor.tsx");
    expect(renderer).not.toContain("getPublicVersionHistory.useQuery");
    expect(renderer).toContain("getVersionHistory.useQuery");
    expect(editor).toContain("getMyLayout.useQuery");
    expect(editor).not.toContain("getLayout.useQuery(\n    { userId }");
  });
});
