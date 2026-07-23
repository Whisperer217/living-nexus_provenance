/**
 * @domain   Mission Control — Actionable Phase Ledger
 * @impl     tRPC router: list, lock/unlock, dispatch (copy-prompt model), mark complete
 *
 * Each phase is a pre-authored development task with an embedded prompt.
 * Dispatching returns the prompt text for the user to copy and paste into
 * the Manus chat — no external API calls, no credentials required.
 * The ledger is append-only — history is never deleted.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../utils/db";
import { missionPhases } from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";

// ─── Seed data — pre-authored phases from the Living Nexus backlog ────────────

export const SEED_PHASES = [
  {
    sortOrder: 10,
    title: "Living Identity Engine — Multi-Medium Rebuild",
    category: "backend",
    description: "Rebuild generateTagline to analyze ALL content types and produce a multi-paragraph Living Identity Snapshot.",
    status: "ready" as const,
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Rebuild the Living Identity Engine to support multi-medium creator analysis.

TASKS:
1. Rebuild the generateTagline server procedure to analyze ALL content types (music, books, comics, testimony, visual, games, lyrics, manuscripts, playlists, albums)
2. Include creator-written bio, origin statement, witness philosophy, active mediums, and recurring themes in the identity corpus
3. Count works accurately per medium type in the identity snapshot
4. Remove audio-only signals (key, BPM, harmonic data) as the primary identity axis — demote to one signal among many
5. Generate a multi-paragraph Living Identity Snapshot that reflects the full creative corpus
6. Add corpus_fingerprint to cache invalidation — regenerate when published works count changes by ≥5 or a new medium type appears
7. Rename "Nexus Witness Tagline" label to "Living Identity Snapshot" in the UI (desktop + mobile)
8. Add visual separator between Creator Bio (creator-written) and Living Identity Snapshot (platform-observed)
9. Add "Refresh Identity" button visible to owner that triggers forceRegenerate
10. Ensure Living Identity Snapshot does not duplicate the creator bio — it should complement, not restate

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system preserved.`,
  },
  {
    sortOrder: 20,
    title: "Witnessed Objects Gallery Page",
    category: "frontend",
    description: "Build /witnessed-objects card grid page for all 3D print works and add sidebar nav link.",
    status: "ready" as const,
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Build the Witnessed Objects gallery page for 3D print and G-code works.

TASKS:
1. Build /witnessed-objects page: card grid of all 3D print / gcode works (contentType = 'gcode' or '3dmodel')
2. Each card: cover art (extracted slicer thumbnail), title, creator, WID badge, print stats (layer count, filament, time)
3. Filter bar: by material, slicer, license tier
4. Add "Witnessed Objects" nav link to sidebar under the DISCOVER section
5. Wire /witnessed-objects route in App.tsx
6. Empty state: cathedral-styled message when no 3D works exist yet

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system (Cinzel, gold palette, dark coal bg) preserved.`,
  },
  {
    sortOrder: 30,
    title: "Guides Upload Flow Completion",
    category: "frontend",
    description: "Complete the Platform Guides upload wizard with AI image generation and fix ContextDrawer navigation.",
    status: "ready" as const,
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Complete the Platform Guides upload flow and ContextDrawer navigation.

TASKS:
1. Add AI image generation panel to GuideUploadWizard artwork step (uses guides.generateImage procedure)
2. Verify 3D Print / G-code tile is visible in ManifestationStudio TypeGateway
3. Add Platform Store to ContextDrawer left drawer navigation
4. Ensure Guides section is prominent in left drawer (not buried under Register)
5. Add "Guides & Tutorials" link to the DISCOVER section of the sidebar

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system preserved.`,
  },
  {
    sortOrder: 40,
    title: "Audio Player Phase 9 — Full Audit & Fix",
    category: "frontend",
    description: "Audit PlayerContext addAndPlay, player bar metadata display, and fix all track card click handlers.",
    status: "ready" as const,
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Full audit and fix of the global audio player system.

TASKS:
1. Audit PlayerContext addAndPlay, player bar metadata display, DiscoverPage/ExplorePage click handlers
2. Fix addAndPlay so clicking a track card loads it into the bottom player bar and starts playing
3. Player bar must show track title, artist name, and cover art correctly
4. Active track card shows animated waveform instead of play button
5. Verify queue system works: playing a track from a page builds a queue of related tracks
6. Test on mobile: player bar controls must be responsive and not frozen

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system preserved.`,
  },
  {
    sortOrder: 50,
    title: "Follow System — Creator Follows",
    category: "backend",
    description: "Build the follows table, mutations, and wire Follow button on creator profiles.",
    status: "ready" as const,
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Build the creator follow system end-to-end.

TASKS:
1. Add follows table to drizzle schema (followerId, followingId, createdAt, unique constraint)
2. Run db:push to apply migration
3. Add DB helpers: followCreator, unfollowCreator, getFollowStatus, getFollowerCount, getFollowingCount
4. Add tRPC procedures: profile.follow, profile.unfollow, profile.getFollowStatus, profile.getFollowerCount
5. Wire Follow/Following toggle button on CreatorProfilePage (gold button, Cinzel font)
6. Show follower count on creator profile page
7. Add /following page to ArchivePage tabs: list of creators the logged-in user follows
8. Write Vitest tests for follow/unfollow procedures

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system preserved.`,
  },
  {
    sortOrder: 60,
    title: "Seed Track Artist Name DB Update",
    category: "infra",
    description: "Update artist names on 8 seed songs in the database via title-matched UPDATE queries.",
    status: "ready" as const,
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Update the 8 seed track artist names in the database.

TASKS:
Run these SQL UPDATE statements via webdev_execute_sql to update the seed track artist names:
- "Celestial Drift" → artist: Nova Kaine
- "Golden Hour Protocol" → artist: VLTG3
- "Midnight Sermon" → artist: Seraph Cole
- "Sacred Frequencies" → artist: Aura Vessel
- "Throne of Bass" → artist: D-Rex
- "Violet Prophecy" → artist: Lyric Haze
- "Architect of Sound" → artist: Marco Spire
- "Divine Static" → artist: Ghost Lumen

The artist name is stored in the users table (name or artistHandle field) linked via the song's userId. Update the artistHandle field on the user records associated with these songs.

STANDARDS: Verify the updates with a SELECT query after applying them.`,
  },
  {
    sortOrder: 70,
    title: "Notification Center — In-App Alerts",
    category: "backend",
    description: "Build a persistent in-app notification system for platform events (tips, new followers, WID verifications).",
    status: "locked" as const,
    lockedReason: "Requires Follow System (phase 5) to be complete first",
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Build the in-app notification center.

TASKS:
1. Add notifications table to drizzle schema (userId, type, title, body, read, metadata, createdAt)
2. Notification types: tip_received, new_follower, wid_verified, comment_received, work_featured
3. Add DB helpers: createNotification, getNotifications, markRead, markAllRead, getUnreadCount
4. Add tRPC procedures: notifications.list, notifications.markRead, notifications.markAllRead, notifications.unreadCount
5. Build NotificationBell component in the top nav bar (gold bell icon, unread count badge)
6. Build NotificationDrawer: slide-out panel listing notifications with timestamps and links
7. Wire tip_received notifications into the Stripe webhook handler
8. Wire new_follower notifications into the follow mutation
9. Write Vitest tests for notification procedures

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system preserved.`,
  },
  {
    sortOrder: 80,
    title: "Search System — Global Full-Text Search",
    category: "backend",
    description: "Build a global search endpoint covering works, creators, and collections with a unified search UI.",
    status: "locked" as const,
    lockedReason: "Requires stable content types and follow system before indexing",
    prompt: `You are working on the Living Nexus platform (project path: /home/ubuntu/living-nexus).

MISSION: Build the global search system.

TASKS:
1. Add songs.search tRPC procedure: full-text search across title, genre, caption, description, lyricsText
2. Add profile.search tRPC procedure: search creators by name, artistHandle, bio
3. Add collections.search tRPC procedure: search albums, playlists by title
4. Build unified /search page with tabs: Works | Creators | Collections
5. Add search input to the top nav bar (magnifying glass icon, expands on click)
6. Debounced search with 300ms delay, minimum 2 characters
7. Search results show cover art, title, creator, WID badge
8. Empty state with cathedral-styled "No results found" message
9. Write Vitest tests for search procedures

STANDARDS: 0 TypeScript errors, all existing tests passing, cathedral design system preserved.`,
  },
];

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function seedPhasesIfEmpty() {
  const db = await getDb();
  const existing = await db.select({ id: missionPhases.id }).from(missionPhases).limit(1);
  if (existing.length > 0) return; // already seeded
  await db.insert(missionPhases).values(
    SEED_PHASES.map(p => ({
      ...p,
      prompt: p.prompt,
      lockedReason: (p as any).lockedReason ?? null,
    }))
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const missionControlRouter = router({
  /** List all phases ordered by sortOrder */
  listPhases: adminProcedure.query(async () => {
    await seedPhasesIfEmpty();
    const db = await getDb();
    return db.select().from(missionPhases).orderBy(asc(missionPhases.sortOrder), asc(missionPhases.id));
  }),

  /** Toggle lock/unlock on a phase */
  setLock: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      locked: z.boolean(),
      lockedReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(missionPhases)
        .set({
          status: input.locked ? "locked" : "ready",
          lockedReason: input.locked ? (input.lockedReason ?? null) : null,
          updatedAt: new Date(),
        })
        .where(eq(missionPhases.id, input.id));
      return { success: true };
    }),

  /** Add a new phase to the ledger */
  addPhase: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      category: z.string().default("general"),
      prompt: z.string().min(1),
      status: z.enum(["locked", "ready"]).default("ready"),
      lockedReason: z.string().optional(),
      manusProjectId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Place new phases at the end
      const last = await db.select({ sortOrder: missionPhases.sortOrder })
        .from(missionPhases)
        .orderBy(desc(missionPhases.sortOrder))
        .limit(1);
      const nextOrder = (last[0]?.sortOrder ?? 0) + 10;
      const [result] = await db.insert(missionPhases).values({
        sortOrder: nextOrder,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        prompt: input.prompt,
        status: input.status,
        lockedReason: input.lockedReason ?? null,
        manusProjectId: input.manusProjectId ?? null,
      });
      return { id: (result as any).insertId };
    }),

  /** Update an existing phase's title, description, prompt, or category */
  updatePhase: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().nullable().optional(),
      category: z.string().optional(),
      prompt: z.string().min(1).optional(),
      lockedReason: z.string().nullable().optional(),
      manusProjectId: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...fields } = input;
      await db.update(missionPhases)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(missionPhases.id, id));
      return { success: true };
    }),

  /**
   * Dispatch a phase — copy-prompt model.
   * Returns the embedded prompt text for the user to paste into the Manus chat.
   * Marks the phase as "dispatched" in the DB so history is preserved.
   * No external API calls, no credentials required.
   */
  dispatch: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [phase] = await db.select().from(missionPhases).where(eq(missionPhases.id, input.id));
      if (!phase) throw new TRPCError({ code: "NOT_FOUND", message: "Phase not found" });
      if (phase.status === "locked") throw new TRPCError({ code: "FORBIDDEN", message: "Phase is locked — unlock it first" });
      if (phase.status === "dispatched" || phase.status === "running") {
        throw new TRPCError({ code: "CONFLICT", message: "Phase is already dispatched" });
      }

      // Mark as dispatched in the ledger — no external call
      await db.update(missionPhases)
        .set({
          status: "dispatched",
          dispatchedAt: new Date(),
          updatedAt: new Date(),
          lastStatusMsg: "Prompt copied — paste into Manus chat to execute",
        })
        .where(eq(missionPhases.id, input.id));

      // Return the prompt so the UI can display it for copying
      return { prompt: phase.prompt, title: phase.title, success: true };
    }),

  /**
   * Poll stub — kept for API compatibility but does nothing externally.
   * Status updates are done manually via markComplete / markNotes.
   */
  pollStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [phase] = await db.select().from(missionPhases).where(eq(missionPhases.id, input.id));
      if (!phase) throw new TRPCError({ code: "NOT_FOUND", message: "Phase not found" });
      return { agentStatus: phase.status, newStatus: phase.status, lastMessage: phase.lastStatusMsg ?? "" };
    }),

  /** Mark a phase as complete manually (e.g. after reviewing results) */
  markComplete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(missionPhases)
        .set({ status: "complete", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(missionPhases.id, input.id));
      return { success: true };
    }),

  /** Reset a completed/error phase back to ready so it can be re-dispatched */
  resetPhase: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(missionPhases)
        .set({
          status: "ready",
          manusTaskId: null,
          lastStatusMsg: null,
          dispatchedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(missionPhases.id, input.id));
      return { success: true };
    }),
});
