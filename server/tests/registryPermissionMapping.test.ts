import { describe, expect, it } from "vitest";
import { mapRegistryAiPermission } from "../registry/readService";

describe("Registry R1 AI permission projection", () => {
  it("does not infer AI permission from public visibility and maps only explicit creator consent", () => {
    expect(mapRegistryAiPermission("permitted")).toEqual({ state: "ALLOW", attributionRequired: false });
    expect(mapRegistryAiPermission("permitted_attribution")).toEqual({ state: "ALLOW", attributionRequired: true });
    expect(mapRegistryAiPermission("prohibited")).toEqual({ state: "DENY", attributionRequired: false });
    expect(mapRegistryAiPermission(null)).toEqual({ state: "UNSPECIFIED", attributionRequired: false });
    expect(mapRegistryAiPermission("unknown")).toEqual({ state: "UNSPECIFIED", attributionRequired: false });
  });
});
