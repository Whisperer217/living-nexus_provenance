import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractSignalMentionHandles } from "../utils/db";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("creator correspondence and Work Signal reference contracts", () => {
  const schema = read("drizzle/schema.ts");
  const commentsRouter = read("server/routers/comments.ts");
  const correspondenceRouter = read("server/routers/correspondence.ts");
  const routerIndex = read("server/routers/index.ts");
  const signalSurface = read("client/src/components/WorkVoices.tsx");
  const circle = read("client/src/components/layout/WitnessingCirclePanel.tsx");
  const css = read("client/src/index.css");
  const adr = read("docs/lnls/architecture/CREATOR-REFERENCE-AND-CORRESPONDENCE-ADR.md");

  it("persists resolved references without changing Signal text or provenance", () => {
    expect(schema).toContain('export const commentMentions = mysqlTable("commentMentions"');
    expect(schema).toContain("commentMentions_comment_mentioned_user_uq");
    expect(commentsRouter).toContain("mentionedCreatorHandles");
    expect(commentsRouter).toContain("notifySignalMentions");
    expect(commentsRouter).toContain('type: "signal_mention"');
    expect(adr).toContain("does not change a Work’s WID, Registry, or Participation Chain");
  });

  it("accepts only explicit, bounded creator handle tokens and deduplicates them", () => {
    expect(extractSignalMentionHandles("Witnessed @Ada and @ada with @Grace.Hopper.")).toEqual(["Ada", "Grace.Hopper"]);
    expect(extractSignalMentionHandles("not-an-email@creator @valid_creator @x-y")).toEqual(["valid_creator", "x-y"]);
    expect(extractSignalMentionHandles("@a @b @c @d @e @f")).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("requires a witnessed relationship, recipient policy, acceptance, and server-side participants", () => {
    expect(schema).toContain('export const creatorContactSettings = mysqlTable("creatorContactSettings"');
    expect(schema).toContain('export const correspondenceThreads = mysqlTable("correspondenceThreads"');
    expect(schema).toContain('export const correspondenceParticipants = mysqlTable("correspondenceParticipants"');
    expect(correspondenceRouter).toContain("verifyIncomingPolicy");
    expect(correspondenceRouter).toContain("witnessSubscriptions.witnessId");
    expect(correspondenceRouter).toContain("mutual_witnesses");
    expect(correspondenceRouter).toContain("requireThreadParticipant");
    expect(correspondenceRouter).toContain('participant.role !== "recipient" || participant.state !== "requested"');
    expect(correspondenceRouter).toContain('participant.state !== "accepted" || otherParticipant.state !== "accepted"');
  });

  it("hides private refusal state, blocks access, limits sends, and keeps message writes idempotent", () => {
    expect(schema).toContain('export const correspondenceBlocks = mysqlTable("correspondenceBlocks"');
    expect(schema).toContain('export const correspondenceReports = mysqlTable("correspondenceReports"');
    expect(correspondenceRouter).toContain("hasBlockingPair");
    expect(correspondenceRouter).toContain("recipient's decline");
    expect(correspondenceRouter).toContain("maxMessagesPerWindow");
    expect(correspondenceRouter).toContain("clientMessageId");
    expect(schema).toContain("correspondenceMessages_thread_sender_client_uq");
    expect(correspondenceRouter).toContain("correspondenceReports");
    expect(correspondenceRouter).not.toContain("pnaThreads");
  });

  it("provides keyboard-accessible mentions and reduced-motion-safe reorder feedback", () => {
    expect(signalSurface).toContain('aria-autocomplete="list"');
    expect(signalSurface).toContain('event.key === "ArrowDown"');
    expect(signalSurface).toContain('event.key === "Enter" && !event.shiftKey');
    expect(signalSurface).toContain("Reference a creator publicly");
    expect(signalSurface).toContain("ln-signal-list--reordered");
    expect(css).toContain(".ln-signal-mention-menu");
    expect(css).toContain("@keyframes ln-signal-reorder");
  });

  it("keeps private correspondence a separate Circle mode with explicit consent", () => {
    expect(routerIndex).toContain("correspondence:      correspondenceRouter");
    expect(circle).toContain("Private creator correspondence");
    expect(circle).toContain("Consent required.");
    expect(circle).toContain("not end-to-end encrypted");
    expect(circle).toContain("Request correspondence");
    expect(circle).toContain("Block creator");
    expect(circle).toContain("Contact settings");
  });
});
