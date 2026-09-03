import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Arrange domain reflection contract", () => {
  it("mounts the owner editor and public renderer for the same creator identity", () => {
    const page = read("client/src/pages/loop/LoopCreatorPage.tsx");

    expect(page).toContain("setShowDomainEditor((v) => !v)");
    expect(page).toContain("{showDomainEditor ? \"Close arrange\" : \"Arrange domain\"}");
    expect(page).toContain("<DomainEditor");
    expect(page).toContain("<DomainRenderer");
    expect(page).toContain("userId={creator.id}");
  });

  it("refreshes the persisted layout and its version history after an owner save", () => {
    const editor = read("client/src/components/domain/DomainEditor.tsx");

    expect(editor).toContain("trpc.domain.getLayout.useQuery(");
    expect(editor).toContain("{ userId },");
    expect(editor).toContain("{ enabled: userId > 0 }");
    expect(editor).toContain("trpc.domain.saveLayout.useMutation");
    expect(editor).toContain("utils.domain.getLayout.invalidate({ userId })");
    expect(editor).toContain("utils.domain.getVersionHistory.invalidate({})");
    expect(editor).toContain("const hydratedLayoutRef = useRef<string | null>(null)");
    expect(editor).toContain("hydratedLayoutRef.current === hydratedLayoutSignature");
    expect(editor).toContain("saveLayout.mutate({");
  });

  it("keeps save owner-scoped and rehydrates only visible blocks in stored position order", () => {
    const router = read("server/routers/domain.ts");
    const renderer = read("client/src/components/domain/DomainRenderer.tsx");

    const saveLayout = router.slice(router.indexOf("saveLayout: protectedProcedure"), router.indexOf("getVersionHistory: protectedProcedure"));
    expect(saveLayout).toContain("saveDomainLayout(\n          ctx.user.id,");
    expect(renderer).toContain("trpc.domain.getLayout.useQuery(");
    expect(renderer).toContain("{ userId }");
    expect(renderer).toContain("{ enabled: !!userId }");
    expect(renderer).toContain(".filter((b) => b.visible && pass(b.blockType))");
    expect(renderer).toContain(".sort((a, b) => a.position - b.position)");
  });
});
