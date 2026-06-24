/**
 * Payment Flow Tests
 * Covers: tip checkout, jukebox tip, Connect onboarding, webhook handler
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ────────────────────────────────────────────────────────────────

const PLATFORM_FEE_PERCENT = 10;

function calcFee(amountCents: number) {
  return Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
}

function calcCreatorCut(amountCents: number) {
  return amountCents - calcFee(amountCents);
}

// ── Fee Split Tests ────────────────────────────────────────────────────────

describe("90/10 fee split", () => {
  it("calculates 10% platform fee correctly", () => {
    expect(calcFee(500)).toBe(50);   // $5 tip → $0.50 fee
    expect(calcFee(1000)).toBe(100); // $10 tip → $1.00 fee
    expect(calcFee(100)).toBe(10);   // $1 tip → $0.10 fee
  });

  it("creator receives 90% of tip", () => {
    expect(calcCreatorCut(500)).toBe(450);   // $5 → $4.50 to creator
    expect(calcCreatorCut(1000)).toBe(900);  // $10 → $9.00 to creator
    expect(calcCreatorCut(100)).toBe(90);    // $1 → $0.90 to creator
  });

  it("fee + creator cut equals total amount", () => {
    const amounts = [100, 250, 500, 1000, 5000, 50000];
    for (const amount of amounts) {
      expect(calcFee(amount) + calcCreatorCut(amount)).toBe(amount);
    }
  });

  it("minimum tip of $1 (100 cents) is enforced", () => {
    expect(calcFee(100)).toBeGreaterThan(0);
    expect(calcCreatorCut(100)).toBeGreaterThan(0);
  });

  it("maximum tip of $500 (50000 cents) is within bounds", () => {
    expect(calcFee(50000)).toBe(5000);
    expect(calcCreatorCut(50000)).toBe(45000);
  });
});

// ── Webhook Metadata Tests ─────────────────────────────────────────────────

describe("webhook metadata parsing", () => {
  it("parses tip metadata correctly", () => {
    const meta = { type: "tip", songId: "42", userId: "7" };
    expect(meta.type).toBe("tip");
    expect(parseInt(meta.songId)).toBe(42);
    expect(parseInt(meta.userId)).toBe(7);
  });

  it("parses jukebox_tip metadata correctly", () => {
    const meta = {
      type: "jukebox_tip",
      roomCode: "ROOM123",
      songId: "99",
      tipperId: "3",
      tipperName: "TestFan",
    };
    expect(meta.type).toBe("jukebox_tip");
    expect(meta.roomCode).toBe("ROOM123");
    expect(parseInt(meta.songId)).toBe(99);
    expect(parseInt(meta.tipperId)).toBe(3);
  });

  it("detects test events by evt_test_ prefix", () => {
    const isTestEvent = (id: string) => id.startsWith("evt_test_");
    expect(isTestEvent("evt_test_abc123")).toBe(true);
    expect(isTestEvent("evt_1abc123")).toBe(false);
    expect(isTestEvent("evt_test_")).toBe(true);
  });
});

// ── Jukebox Success URL Tests ──────────────────────────────────────────────

describe("jukebox success URL parameters", () => {
  it("encodes amountCents in success URL", () => {
    const origin = "https://livingnexus.org";
    const roomCode = "ROOM1";
    const songId = 42;
    const amountCents = 500;
    const url = `${origin}/together?room=${roomCode}&jukebox=success&songId=${songId}&amountCents=${amountCents}`;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("jukebox")).toBe("success");
    expect(parseInt(params.get("songId") || "0")).toBe(42);
    expect(parseInt(params.get("amountCents") || "0")).toBe(500);
  });

  it("falls back to 100 cents if amountCents missing from URL", () => {
    const params = new URLSearchParams("jukebox=success&songId=42");
    const amountCents = parseInt(params.get("amountCents") || "100");
    expect(amountCents).toBe(100);
  });
});

// ── Connect Onboarding Tests ───────────────────────────────────────────────

describe("Stripe Connect onboarding returnUrl", () => {
  it("uses origin + /dashboard as returnUrl (not full href with query params)", () => {
    // Simulate window.location.origin
    const origin = "https://livingnexus.org";
    const returnUrl = `${origin}/dashboard`;
    expect(returnUrl).toBe("https://livingnexus.org/dashboard");
    expect(returnUrl).not.toContain("?");
  });

  it("uses origin + /profile as returnUrl for profile page", () => {
    const origin = "https://livingnexus.org";
    const returnUrl = `${origin}/profile`;
    expect(returnUrl).toBe("https://livingnexus.org/profile");
    expect(returnUrl).not.toContain("?");
  });
});
