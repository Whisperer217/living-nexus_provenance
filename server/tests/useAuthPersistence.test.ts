import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hookPath = path.resolve(process.cwd(), "client/src/_core/hooks/useAuth.ts");

describe("useAuth runtime user persistence", () => {
  it("moves localStorage synchronization into an idempotent post-commit effect", () => {
    const source = fs.readFileSync(hookPath, "utf8");

    expect(source).toContain('const RUNTIME_USER_INFO_KEY = "manus-runtime-user-info"');
    expect(source).toContain("useEffect(() => {");
    expect(source).toContain("localStorage.getItem(RUNTIME_USER_INFO_KEY) !== serializedUser");
    expect(source).toContain("localStorage.setItem(RUNTIME_USER_INFO_KEY, serializedUser)");
    expect(source).toContain("const state = useMemo(() => {\n    return {");
  });
});

