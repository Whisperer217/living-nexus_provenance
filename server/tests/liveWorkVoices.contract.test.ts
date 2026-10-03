import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("live Work Voices contract", () => {
  it("renders the canonical Voices surface from the public /song/:id route", () => {
    const app = read("client/src/App.tsx");
    const workPage = read("client/src/pages/loop/LoopWorkPage.tsx");
    const voices = read("client/src/components/WorkVoices.tsx");

    expect(app).toContain('lazy(() => import("./pages/loop/LoopWorkPage"))');
    expect(workPage).toContain('import { WorkVoices } from "@/components/WorkVoices"');
    expect(workPage).toContain("<WorkVoices songId={songId} />");
    expect(workPage).toContain("openVoices");
    expect(voices).toContain('id="voices"');
    expect(voices).toContain("trpc.comments.list.useQuery");
    expect(voices).toContain("trpc.comments.add.useMutation");
    expect(voices).toContain("trpc.comments.addReply.useMutation");
    expect(voices).toContain("A visible conversation around this Work");
    expect(voices).toContain("voice.replies.map");
  });

  it("keeps a visible Voices entry point in Explore Work rows", () => {
    const row = read("client/src/components/WorkListRow.tsx");

    expect(row).toContain("MessageSquare");
    expect(row).toContain("#voices");
    expect(row).toContain("Open Voices conversation");
  });
});
