import { describe, expect, it } from "vitest";
import {
  normalizeDiscoveryInterpretation,
  parseDiscoveryQueryFallback,
} from "../services/discoveryQuery";

describe("discovery query interpretation", () => {
  it("extracts supported, transparent constraints without a model call", () => {
    expect(parseDiscoveryQueryFallback("Find newest gospel songs by @DocSMercer")).toMatchObject({
      creator: "DocSMercer",
      contentType: "audio",
      sort: "newest",
      source: "fallback",
    });
  });

  it("keeps a WID lookup intact instead of inferring a record", () => {
    const wid = "WID-MUS-60E2BFE1-DD885D5E";
    expect(parseDiscoveryQueryFallback(wid)).toMatchObject({
      query: wid,
      creator: null,
      genre: null,
      source: "fallback",
    });
  });

  it("drops unsupported model values and bounds visible text", () => {
    const interpretation = normalizeDiscoveryInterpretation({
      query: "  witness gospel  ",
      creator: "<DocSMercer>",
      genre: "gospel",
      contentType: "video",
      sort: "trending",
      explanation: "  Shows only what the public Registry can match.  ",
    }, "find gospel works");

    expect(interpretation).toMatchObject({
      query: "witness gospel",
      creator: "DocSMercer",
      genre: "gospel",
      contentType: null,
      sort: "relevance",
      explanation: "Shows only what the public Registry can match.",
      source: "model",
    });
  });

  it("falls back deterministically when model output is not an object", () => {
    expect(normalizeDiscoveryInterpretation(null, "recent comics")).toMatchObject({
      contentType: "comic",
      sort: "newest",
      source: "fallback",
    });
  });
});
