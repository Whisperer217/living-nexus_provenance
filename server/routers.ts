import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getOrCreateAgent,
  getEventsByCreator,
  getLatestCheckpointByCreator,
  getWidWithEvent,
  insertEvent,
  insertWid,
  setUserPublicKey,
  updateAgentFingerprint,
  getUserById,
} from "./db";
import {
  buildAnchorPayload,
  canonicalize,
  generateKeypair,
  sha256hex,
  signHex,
} from "./provenance";

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /** Generate Ed25519 keypair on first login. Returns public key + encrypted private key. */
    generateKeypair: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      // If already has a key, return the public key only
      if (user.publicKey) {
        return { publicKeyHex: user.publicKey, alreadyExists: true };
      }
      const { privateKeyHex, publicKeyHex } = await generateKeypair();
      await setUserPublicKey(ctx.user.id, publicKeyHex);
      // Return private key to client ONCE — client must store it securely
      return { publicKeyHex, privateKeyHex, alreadyExists: false };
    }),

    /** Check if user has a keypair registered. */
    hasKeypair: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return { hasKey: !!(user?.publicKey) };
    }),
  }),

  // ─── Agents (Personal Nexus Agent) ────────────────────────────────────────
  agents: router({
    /** Get or create the user's PNA. */
    getOrCreate: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateAgent(ctx.user.id);
    }),

    /** Update style fingerprint and/or frozen traits. */
    update: protectedProcedure
      .input(z.object({
        agentId: z.number(),
        styleFingerprint: z.object({
          tone: z.array(z.string()),
          structure_patterns: z.array(z.string()),
          common_transforms: z.array(z.string()),
        }).optional(),
        frozenTraits: z.object({
          voice_constraints: z.array(z.string()),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.styleFingerprint) {
          await updateAgentFingerprint(
            input.agentId,
            input.styleFingerprint,
            input.frozenTraits
          );
        }
        return { success: true };
      }),

    /** Get a contextual agent message based on mode and context. */
    message: protectedProcedure
      .input(z.object({
        mode: z.enum(["Guide", "Conductor", "Critic", "Custodian"]),
        context: z.string().max(2000),
        sessionLabel: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const modeInstructions: Record<string, string> = {
          Guide: "You are a Guide agent helping a creator understand the provenance system. Be welcoming, brief, and instructive. Max 2 sentences.",
          Conductor: "You are a Conductor agent directing the creator's next action. Suggest the most logical next step. Max 1-2 sentences.",
          Critic: "You are a Critic agent evaluating creative quality. Be precise, honest, and constructive. Max 2 sentences.",
          Custodian: "You are a Custodian agent protecting provenance integrity. Flag any concerns about attribution or lineage. Max 2 sentences.",
        };

        const result = await invokeLLM({
          messages: [
            { role: "system", content: modeInstructions[input.mode] },
            { role: "user", content: input.context || "Creator just opened the surface." },
          ],
        });

        const message = result.choices?.[0]?.message?.content ?? "Ready.";
        return { message: typeof message === "string" ? message : "Ready." };
      }),
  }),

  // ─── Events (append-only ledger) ──────────────────────────────────────────
  events: router({
    /** Create a checkpoint event (agent-mediated, not sealed). */
    checkpoint: protectedProcedure
      .input(z.object({
        payloadText: z.string().min(1),
        parentEventId: z.string().nullable().optional(),
        sessionLabel: z.string().optional(),
        privateKeyHex: z.string().min(64).max(64),
      }))
      .mutation(async ({ ctx, input }) => {
        const agent = await getOrCreateAgent(ctx.user.id);
        const payloadCanonical = canonicalize(input.payloadText);
        const contentHash = sha256hex(payloadCanonical);
        // Hash chain: incorporate parent event ID so each checkpoint links to its predecessor
        const chainInput = input.parentEventId
          ? `checkpoint:${contentHash}:${input.parentEventId}:${ctx.user.id}:${Date.now()}`
          : `checkpoint:${contentHash}:genesis:${ctx.user.id}:${Date.now()}`;
        const eventId = sha256hex(chainInput);
        const signature = await signHex(eventId, input.privateKeyHex);

        await insertEvent({
          eventId,
          creatorId: ctx.user.id,
          agentId: agent.id,
          actionType: "checkpoint",
          parentEventId: input.parentEventId ?? null,
          origin: { origin_type: "original", source_refs: [], transformation_type: null },
          payloadCanonical,
          signature,
          sessionLabel: input.sessionLabel ?? null,
        });

        return { eventId, contentHash, signature };
      }),

    /** Anchor event: full pipeline — canonicalize → hash → sign → Event + WID. */
    anchor: protectedProcedure
      .input(z.object({
        payloadText: z.string().min(1),
        parentEventId: z.string().nullable().optional(),
        sessionLabel: z.string().optional(),
        privateKeyHex: z.string().min(64).max(64),
        originType: z.enum(["original", "derived", "assisted"]).default("original"),
        sourceRefs: z.array(z.string()).default([]),
        transformationType: z.enum(["rewrite", "remix", "extension"]).nullable().default(null),
      }))
      .mutation(async ({ ctx, input }) => {
        const agent = await getOrCreateAgent(ctx.user.id);
        const { payloadCanonical, eventId, contentHash, signature, wid } =
          await buildAnchorPayload(
            input.payloadText,
            input.privateKeyHex,
            ctx.user.id,
            agent.id,
            input.parentEventId ?? null,
            input.sessionLabel ?? null
          );

        await insertEvent({
          eventId,
          creatorId: ctx.user.id,
          agentId: agent.id,
          actionType: "anchor",
          parentEventId: input.parentEventId ?? null,
          origin: {
            origin_type: input.originType,
            source_refs: input.sourceRefs,
            transformation_type: input.transformationType,
          },
          payloadCanonical,
          signature,
          sessionLabel: input.sessionLabel ?? null,
        });

        await insertWid({
          wid,
          eventId,
          contentHash,
          creatorId: ctx.user.id,
          signature,
        });

        return { eventId, contentHash, wid, signature };
      }),

    /** Fork from an existing event. */
    fork: protectedProcedure
      .input(z.object({
        originEventId: z.string().length(64),
        payloadText: z.string().min(1),
        sessionLabel: z.string().optional(),
        privateKeyHex: z.string().min(64).max(64),
      }))
      .mutation(async ({ ctx, input }) => {
        const agent = await getOrCreateAgent(ctx.user.id);
        const payloadCanonical = canonicalize(input.payloadText);
        const contentHash = sha256hex(payloadCanonical);
        const eventId = sha256hex(`fork:${contentHash}:${ctx.user.id}:${Date.now()}`);
        const signature = await signHex(eventId, input.privateKeyHex);

        await insertEvent({
          eventId,
          creatorId: ctx.user.id,
          agentId: agent.id,
          actionType: "fork",
          parentEventId: input.originEventId,
          origin: { origin_type: "derived", source_refs: [input.originEventId], transformation_type: "extension" },
          payloadCanonical,
          signature,
          sessionLabel: input.sessionLabel ?? null,
        });

        return { eventId, contentHash, signature };
      }),
  }),

  // ─── Satchel (readable history) ───────────────────────────────────────────
  satchel: router({
    /** List all events for the authenticated user. */
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const evts = await getEventsByCreator(ctx.user.id, input?.limit ?? 50);
        return evts;
      }),

    /** Get the latest checkpoint for the user. */
    latestCheckpoint: protectedProcedure.query(async ({ ctx }) => {
      return getLatestCheckpointByCreator(ctx.user.id);
    }),
  }),

  // ─── WIDs (public lookup) ──────────────────────────────────────────────────
  wids: router({
    /** Public read-only WID lookup. */
    lookup: publicProcedure
      .input(z.object({ wid: z.string().min(1).max(64) }))
      .query(async ({ input }) => {
        const result = await getWidWithEvent(input.wid);
        if (!result) return null;
        return {
          wid: result.wid.wid,
          contentHash: result.wid.contentHash,
          createdAt: result.wid.createdAt,
          creator: result.creator ? { id: result.creator.id, name: result.creator.name } : null,
          event: result.event ? {
            eventId: result.event.eventId,
            actionType: result.event.actionType,
            sessionLabel: result.event.sessionLabel,
            createdAt: result.event.createdAt,
            origin: result.event.origin,
          } : null,
        };
      }),
  }),

  // ─── PPG (Provenance Prompt Generator) ────────────────────────────────────
  ppg: router({
    /** Generate 3 prompt variants: conservative, exploratory, divergent. */
    generate: protectedProcedure
      .input(z.object({
        rawText: z.string().min(1).max(10000),
        agentProfile: z.object({
          tone: z.array(z.string()),
          structure_patterns: z.array(z.string()),
          common_transforms: z.array(z.string()),
        }).optional(),
        lineageParent: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const agentContext = input.agentProfile
          ? `Creator style: tone=[${input.agentProfile.tone.join(",")}], patterns=[${input.agentProfile.structure_patterns.join(",")}]`
          : "No prior style data.";

        const systemPrompt = `You are the Provenance Prompt Generator (PPG) for a lyric creation system.
Given raw lyric text and creator context, produce exactly 3 structured prompt variants.
${agentContext}
${input.lineageParent ? `This work derives from event: ${input.lineageParent}` : "This is an original work."}

Respond with valid JSON only, no markdown fences:
{
  "intent": "one sentence describing creator intent",
  "prompt_structured": "a clean, structured version of the input for hashing",
  "variants": {
    "conservative": "a prompt that stays close to the original voice and structure",
    "exploratory": "a prompt that expands themes while respecting the core",
    "divergent": "a prompt that pushes into new territory, challenging assumptions"
  },
  "lineage_parent": ${input.lineageParent ? `"${input.lineageParent}"` : "null"}
}`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.rawText },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ppg_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  intent: { type: "string" },
                  prompt_structured: { type: "string" },
                  variants: {
                    type: "object",
                    properties: {
                      conservative: { type: "string" },
                      exploratory: { type: "string" },
                      divergent: { type: "string" },
                    },
                    required: ["conservative", "exploratory", "divergent"],
                    additionalProperties: false,
                  },
                  lineage_parent: { type: ["string", "null"] },
                },
                required: ["intent", "prompt_structured", "variants", "lineage_parent"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices?.[0]?.message?.content;
        if (!content) throw new Error("PPG: no response from LLM");

        try {
          const parsed = typeof content === "string" ? JSON.parse(content) : content;
          return parsed as {
            intent: string;
            prompt_structured: string;
            variants: { conservative: string; exploratory: string; divergent: string };
            lineage_parent: string | null;
          };
        } catch {
          throw new Error("PPG: failed to parse LLM response");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
