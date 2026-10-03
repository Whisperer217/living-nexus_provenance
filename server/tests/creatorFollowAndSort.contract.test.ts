import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Explore creator witness and sorting contracts", () => {
  const explore = read("client/src/pages/ExplorePage.tsx");
  const subscriptionRouter = read("server/routers/witnessSubscription.ts");
  const db = read("server/utils/db.ts");
  const creators = read("server/db/users.ts");
  const workHeader = read("client/src/components/CinematicSongHeader.tsx");
  const identityColumn = read("client/src/components/IdentityColumn.tsx");
  const collection = read("client/src/pages/CollectionPage.tsx");
  const project = read("client/src/pages/ProjectPage.tsx");
  const supportDrawer = read("client/src/components/SupportCreatorDrawer.tsx");
  const activityRail = read("client/src/components/LivingContextRail.tsx");
  const archive = read("client/src/pages/ArchivePage.tsx");
  const domainEditor = read("client/src/components/domain/DomainEditor.tsx");
  const profile = read("client/src/pages/ProfilePage.tsx");
  const leftRail = read("client/src/components/layout/LeftRail.tsx");
  const topBar = read("client/src/components/layout/TopBar.tsx");
  const mobileShell = read("client/src/components/layout/MainLayout.tsx");
  const loopCreator = read("client/src/pages/loop/LoopCreatorPage.tsx");
  const creatorProfile = read("client/src/pages/CreatorProfilePage.tsx");
  const witnessSigil = read("client/src/components/icons/WitnessSigil.tsx");

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

  it("keeps reserve and steward witness tiers safe from the lightweight Witness toggle", () => {
    expect(explore).toContain('followTier === "witness" ? "Witnessing" : followTier ? "Witnessing" : "Witness"');
    expect(explore).toContain('followTier === "reserve" || followTier === "steward"');
    expect(explore).toContain("Witness a continuing creative record.");
  });

  it("explains Witness at the Explore action and gives profile a subscription-backed directory", () => {
    expect(explore).toContain("Witness a continuing creative record.");
    expect(explore).toContain("Witnessing is not a social follow; it connects you to this creator’s future registered manifestations.");
    expect(subscriptionRouter).toContain("myWitnessing: protectedProcedure");
    expect(subscriptionRouter).toContain("getMyWitnessedCreators(ctx.user.id)");
    expect(db).toContain("export async function getMyWitnessedCreators");
    expect(db).toContain("innerJoin(users, eq(witnessSubscriptions.creatorId, users.id))");
    expect(profile).toContain('id: "witnessing",      label: "Witnessing"');
    expect(profile).toContain("trpc.witnessSubscription.myWitnessing.useQuery");
    expect(profile).toContain("Creators whose future registered manifestations you have chosen to witness.");
  });

  it("uses canonical witness language across public relationship surfaces", () => {
    expect(workHeader).toContain('"Witness creator"');
    expect(workHeader).toContain("Witnessing");
    expect(identityColumn).toContain("Now witnessing");
    expect(collection).toContain('following ? "Witnessing" : "Witness"');
    expect(collection).toContain("witnesses");
    expect(project).toContain("Witnessing project");
    expect(project).toContain("witnesses");
    expect(supportDrawer).toContain("Witness the journey.");
    expect(activityRail).toContain("witnessed the creator");
    expect(archive).toContain("witness tiers you hold with creators");
    expect(domainEditor).toContain("Witnesses and collaborators");
  });

  it("uses the shared Witness Sigil and one immediate Witnessing Circle path", () => {
    expect(witnessSigil).toContain("The Living Nexus Witness Sigil");
    expect(witnessSigil).toContain('viewBox="0 0 24 24"');
    expect(explore).toContain('import { WitnessSigil } from "@/components/icons/WitnessSigil"');
    expect(workHeader).toContain('<WitnessSigil size={13} />');
    expect(loopCreator).toContain('<WitnessSigil size={16} />');
    expect(creatorProfile).toContain('<WitnessSigil size={16} />');
    expect(collection).toContain('<WitnessSigil size={15} className="mr-1" />');
    expect(project).toContain('<WitnessSigil size={16} className="mr-1.5" />');
    expect(leftRail).toContain('new Event("ln:open-witnessing-circle")');
    expect(topBar).toContain('new Event("ln:open-witnessing-circle")');
    expect(mobileShell).toContain('"ln:open-witnessing-circle"');
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
