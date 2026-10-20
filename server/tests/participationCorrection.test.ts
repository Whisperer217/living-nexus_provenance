import { describe, expect, it } from "vitest";
import { prepareParticipationCorrection } from "../domains/work/participationCorrection";

describe("participation declaration correction policy", () => {
  const previous = { music: "AI", lyrics: "Human", voice: "None" } as const;

  it("accepts an owner correction from AI to Both and preserves a before/after event payload", () => {
    const correction = prepareParticipationCorrection({
      ownerId: 42,
      actorId: 42,
      previous,
      current: { music: "Both", lyrics: "Human", voice: "None" },
      witnessId: "WID-MUS-EXAMPLE",
      explanation: "The creator directed and transformed the music layer.",
    });

    expect(correction.current.music).toBe("Both");
    expect(correction.eventData).toEqual({
      previous,
      current: { music: "Both", lyrics: "Human", voice: "None" },
      witnessId: "WID-MUS-EXAMPLE",
      explanation: "The creator directed and transformed the music layer.",
    });
  });

  it("rejects an unauthorized correction before a current declaration can be changed", () => {
    expect(() => prepareParticipationCorrection({
      ownerId: 42,
      actorId: 7,
      previous,
      current: { music: "Both", lyrics: "Human", voice: "None" },
      witnessId: "WID-MUS-EXAMPLE",
    })).toThrow(/not available to your creator account/i);
  });

  it("rejects a no-op correction so history receives no redundant event", () => {
    expect(() => prepareParticipationCorrection({
      ownerId: 42,
      actorId: 42,
      previous,
      current: previous,
      witnessId: "WID-MUS-EXAMPLE",
    })).toThrow(/changed participation declaration/i);
  });
});
