import { describe, expect, it } from "vitest";
import {
  ReleaseDraftPersistenceError,
  requireInsertId,
} from "../domains/releases/insertResult";

describe("Draft Release insert-result normalization", () => {
  it("accepts a direct MySQL insert header", () => {
    expect(requireInsertId({ insertId: 41 })).toBe(41);
  });

  it("accepts the tuple-shaped MySQL transaction insert response", () => {
    expect(requireInsertId([{ insertId: 42 }, []])).toBe(42);
  });

  it("accepts a numeric-string insert ID returned by a compatible driver", () => {
    expect(requireInsertId([{ insertId: "43" }, []])).toBe(43);
  });

  it("fails before a related Draft Release write when no valid insert ID exists", () => {
    expect(() => requireInsertId([{ affectedRows: 1 }, []])).toThrow(ReleaseDraftPersistenceError);
    expect(() => requireInsertId({ insertId: 0 })).toThrow(ReleaseDraftPersistenceError);
    expect(() => requireInsertId(undefined)).toThrow(ReleaseDraftPersistenceError);
  });
});
