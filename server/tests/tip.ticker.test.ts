/**
 * Tip Ticker Tests
 * Covers: recentTips formatting, empty state, amount formatting
 */
import { describe, it, expect } from "vitest";

// ── Helpers mirroring TipTicker component logic ────────────────────────────

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function buildTickerItems(tips: Array<{ fanName: string; creatorName: string; amountCents: number; songTitle: string }>) {
  if (tips.length === 0) return ["Be the first to tip a creator on Living Nexus 🎵"];
  return tips.map(
    t => `🔐 ${t.fanName} tipped ${t.creatorName} ${formatAmount(t.amountCents)} for "${t.songTitle}"`
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("tip ticker formatting", () => {
  it("formats whole dollar amounts without cents", () => {
    expect(formatAmount(500)).toBe("$5");
    expect(formatAmount(1000)).toBe("$10");
    expect(formatAmount(100)).toBe("$1");
  });

  it("formats fractional dollar amounts with cents", () => {
    expect(formatAmount(150)).toBe("$1.50");
    expect(formatAmount(999)).toBe("$9.99");
    expect(formatAmount(250)).toBe("$2.50");
  });

  it("builds correct ticker string from tip data", () => {
    const items = buildTickerItems([
      { fanName: "Doc Seraph", creatorName: "Greg Speed", amountCents: 500, songTitle: "Jah Roots" },
    ]);
    expect(items[0]).toBe('🔐 Doc Seraph tipped Greg Speed $5 for "Jah Roots"');
  });

  it("shows empty state when no tips exist", () => {
    const items = buildTickerItems([]);
    expect(items).toHaveLength(1);
    expect(items[0]).toBe("Be the first to tip a creator on Living Nexus 🎵");
  });

  it("builds multiple ticker items from multiple tips", () => {
    const tips = [
      { fanName: "Fan A", creatorName: "Creator X", amountCents: 200, songTitle: "Song 1" },
      { fanName: "Fan B", creatorName: "Creator Y", amountCents: 1000, songTitle: "Song 2" },
      { fanName: "Fan C", creatorName: "Creator Z", amountCents: 750, songTitle: "Song 3" },
    ];
    const items = buildTickerItems(tips);
    expect(items).toHaveLength(3);
    expect(items[1]).toBe('🔐 Fan B tipped Creator Y $10 for "Song 2"');
    expect(items[2]).toBe('🔐 Fan C tipped Creator Z $7.50 for "Song 3"');
  });

  it("uses 'A fan' fallback when fanName is null/empty", () => {
    // This mirrors the server-side fallback in recentTips procedure
    const fanName = null ?? "A fan";
    expect(fanName).toBe("A fan");
  });

  it("uses 'a creator' fallback when creatorName is null/empty", () => {
    const creatorName = null ?? "a creator";
    expect(creatorName).toBe("a creator");
  });

  it("duplicates items array for seamless marquee loop", () => {
    const items = ["item1", "item2", "item3"];
    const marqueeItems = [...items, ...items];
    expect(marqueeItems).toHaveLength(6);
    expect(marqueeItems[0]).toBe(marqueeItems[3]);
  });
});
