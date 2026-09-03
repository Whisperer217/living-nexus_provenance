import React from "react";
import { beforeAll, describe, expect, it } from "vitest";

let shouldRenderCinematicSplash: (pathname: string, freshSession: boolean) => boolean;

beforeAll(async () => {
  Object.assign(globalThis, { React });
  ({ shouldRenderCinematicSplash } = await import("../../client/src/App"));
});

describe("cinematic entry boundary", () => {
  it.each([
    ["/", true, true],
    ["/home", true, true],
    ["/", false, false],
    ["/home", false, false],
    ["/explore", true, false],
    ["/song/1", true, false],
    ["/creator/1", true, false],
    ["/manifest", true, false],
  ])("renders splash=%s for path %s with fresh session %s", (pathname, freshSession, expected) => {
    expect(shouldRenderCinematicSplash(pathname, freshSession)).toBe(expected);
  });
});
