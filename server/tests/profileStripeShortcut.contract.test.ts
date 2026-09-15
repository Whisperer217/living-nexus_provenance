import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const profilePageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/ProfilePage.tsx"),
  "utf8"
);

describe("Profile Stripe shortcut contract", () => {
  it("keeps the existing protected Stripe status and onboarding procedures as the sole flow", () => {
    expect(profilePageSource).toContain("trpc.tips.connectStatus.useQuery");
    expect(profilePageSource).toContain("trpc.tips.connectOnboarding.useMutation");
    expect(profilePageSource).toContain("returnUrl: `${window.location.origin}/profile`");
  });

  it("surfaces status-aware owner actions in the profile header", () => {
    expect(profilePageSource).toContain("Get paid · Connect Stripe");
    expect(profilePageSource).toContain("Finish payout setup");
    expect(profilePageSource).toContain("Payouts ready");
    expect(profilePageSource).toContain("Open Stripe Connect setup");
  });

  it("stacks the owner action cluster into a full-width mobile row", () => {
    expect(profilePageSource).toContain("flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-6 sm:py-7");
    expect(profilePageSource).toContain("flex w-full flex-shrink-0 flex-col items-start gap-3 sm:w-auto sm:items-end sm:pt-1");
    expect(profilePageSource).toContain("flex w-full flex-wrap items-center justify-start gap-1.5 sm:w-auto sm:justify-end");
    expect(profilePageSource).toContain("<LayoutGrid size={13} />");
    expect(profilePageSource).toContain("My Domain");
  });

  it("does not add a public payment route or a new Stripe backend surface", () => {
    expect(profilePageSource).not.toContain('href="/stripe"');
    expect(profilePageSource).not.toContain("trpc.stripe.");
    expect(profilePageSource).not.toContain("fetch(\"/api/stripe");
  });
});
