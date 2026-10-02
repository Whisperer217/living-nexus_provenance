import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Explore creator follow and sorting contracts", () => {
  const explore = read("client/src/pages/ExplorePage.tsx");
  const subscriptionRouter = read("server/routers/witnessSubscription.ts");
  const db = read("server/utils/db.ts");
  const creators = read("server/db/users.ts");

  it("reuses the persisted witness subscription relationship with one bounded status query", () => {
    expect(subscriptionRouter).toContain("getSubscriptions: protectedProcedure");
    expect(subscriptionRouter).toContain("creatorIds: z.array(z.number().int().positive()).min(1).max(500)");
    expect(subscriptionRouter).toContain("getWitnessSubscriptionsForCreators(ctx.user.id, input.creatorIds)");
    expect(db).toContain("export async function getWitnessSubscriptionsForCreators");
    expect(db).toContain("inArray(witnessSubscriptions.creatorId, uniqueCreatorIds)");
    expect(explore).toContain("trpc.witnessSubscription.getSubscriptions.useQuery");
    expect(explore).toContain("trpc.witnessSubscription.subscribe.useMutation");
    expect(explore).toContain("trpc.witnessSubscription.unsubscribe.useMutation");
  });

  it("keeps reserve and steward subscriptions safe from the lightweight Follow toggle", () => {
    expect(explore).toContain('followTier === "witness" ? "Following" : followTier ? "Subscribed" : "Follow"');
    expect(explore).toContain('followTier === "reserve" || followTier === "steward"');
    expect(explore).toContain("Follow keeps you informed when this creator publishes.");
  });

  it("sorts the existing public creator projection by explicit public evidence", () => {
    expect(creators).toContain("createdAt: users.createdAt");
    expect(creators).toContain("totalPlays: sql<number>`coalesce(sum(${songs.playCount}), 0)`");
    expect(explore).toContain('type CreatorSort = "newest" | "popular"');
    expect(explore).toContain("function CreatorSortControl");
    expect(explore).toContain('aria-label="Sort creators"');
    expect(explore).toContain("b.totalPlays - a.totalPlays");
  });
});
