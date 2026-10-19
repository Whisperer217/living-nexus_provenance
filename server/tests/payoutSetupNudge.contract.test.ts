import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "../../client/src", p), "utf8");

describe("Stripe payout visibility contract", () => {
  const nudge = read("components/layout/PayoutSetupNudge.tsx");
  it("MainLayout mounts the site-wide nudge with signed-in user and works count", () => {
    expect(read("components/layout/MainLayout.tsx")).toContain("<PayoutSetupNudge user={user as any} worksCount={archiveSongCount} />");
  });
  it("nudge uses cached auth state, not a per-page Stripe API query", () => {
    expect(nudge).not.toContain("connectStatus");
    expect(nudge).toContain("stripeAccountId");
  });
  it("nudge covers not-connected, pending and restricted accounts", () => {
    expect(nudge).toContain('"pending"');
    expect(nudge).toContain('"restricted"');
    expect(nudge).toContain('"not_connected"');
  });
  it("dashboard banner also surfaces restricted accounts", () => {
    expect(read("pages/DashboardPage.tsx")).toContain('connectData?.status === "restricted" || connectData?.status === "not_connected"');
  });
  it("creator profile owner CTA stays visible until Stripe is enabled and redirects in-window", () => {
    const cp = read("pages/CreatorProfilePage.tsx");
    expect(cp).not.toContain("{!creator.stripeAccountId && (");
    expect(cp).toContain("window.location.href = d.url");
  });
});
