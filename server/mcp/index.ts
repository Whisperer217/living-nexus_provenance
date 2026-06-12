/**
 * Living Nexus MCP Server — Read Tier
 *
 * Streamable HTTP transport (stateless) mounted at POST /mcp.
 * Bearer token authentication via MCP_READ_TOKEN env var.
 * Rate limit: 60 requests/minute per token.
 * Witness logging: append-only JSONL file (logs/mcp-access.jsonl).
 *
 * Phase 208 — read-only, five tools, no write capability.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { ENV } from "../_core/env";
import {
  getWork,
  listWorks,
  getPageMeta,
  getSeoStatus,
  queryVerifyChain,
  generateRef,
} from "./tools";

// ─── Constants ────────────────────────────────────────────────────────────────

// Use ENV helper so the token is loaded via the same dotenv path as all other secrets
const MCP_READ_TOKEN = ENV.mcpReadToken;
const LOG_PATH = path.resolve(process.cwd(), "logs", "mcp-access.jsonl");

// Ensure logs directory exists
try {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
} catch {
  // Directory already exists
}

// ─── Witness logging ──────────────────────────────────────────────────────────

function logAccess(tool: string, input: unknown, ok: boolean): void {
  try {
    const inputHash = createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
    const entry = JSON.stringify({ ts: new Date().toISOString(), tool, inputHash, ok }) + "\n";
    fs.appendFileSync(LOG_PATH, entry, "utf-8");
  } catch {
    // Non-fatal — log failure should not break tool response
  }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_READ_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== MCP_READ_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

const mcpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Max 60 requests per minute." },
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader) return authHeader;
    return ipKeyGenerator(req.ip ?? "unknown");
  },
});

// ─── CORS ─────────────────────────────────────────────────────────────────────

function mcpCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin ?? "";
  const allowedOrigins = ["https://claude.ai", "https://www.livingnexus.org", "https://livingnexus.org"];
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Mcp-Session-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

// ─── WID pattern ─────────────────────────────────────────────────────────────

const WID_PATTERN = /^WID-[A-Z]{3}-[A-F0-9]{8}-[A-F0-9]{8}$/;

// ─── MCP Server factory ───────────────────────────────────────────────────────

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "living-nexus-mcp",
    version: "1.0.0",
  });

  // ── get_work ──────────────────────────────────────────────────────────────
  server.tool(
    "get_work",
    "Retrieve public metadata for a single work by its Witness ID (WID). Returns title, creator, genre, witness date, play count, share URL, and song URL. Does not return private fields.",
    {
      wid: z.string().regex(WID_PATTERN, "Invalid WID format. Expected WID-XXX-XXXXXXXX-XXXXXXXX"),
    },
    async (args) => {
      logAccess("get_work", args, false);
      try {
        const result = await getWork({ wid: args.wid });
        logAccess("get_work", args, true);
        if (!result) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "not_found", message: "No public work found for this WID." }) }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const ref = generateRef("MCP");
        if (err instanceof Error && err.name === "ZodError") {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "validation_error", message: err.message, ref }) }], isError: true };
        }
        console.error(`[MCP] [${ref}] get_work error:`, err instanceof Error ? err.stack ?? err.message : err);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "internal_error", code: "ERR_INTERNAL", ref }) }], isError: true };
      }
    }
  );

  // ── list_works ────────────────────────────────────────────────────────────
  server.tool(
    "list_works",
    "List public works registered on Living Nexus. Supports pagination and optional filtering by creator slug (numeric user ID string).",
    {
      limit: z.number().int().min(1).max(50).default(20).optional(),
      offset: z.number().int().min(0).default(0).optional(),
      creatorSlug: z.string().optional(),
    },
    async (args) => {
      logAccess("list_works", args, false);
      try {
        const result = await listWorks({
          limit: args.limit ?? 20,
          offset: args.offset ?? 0,
          creatorSlug: args.creatorSlug,
        });
        logAccess("list_works", args, true);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const ref = generateRef("MCP");
        if (err instanceof Error && err.name === "ZodError") {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "validation_error", message: err.message, ref }) }], isError: true };
        }
        console.error(`[MCP] [${ref}] list_works error:`, err instanceof Error ? err.stack ?? err.message : err);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "internal_error", code: "ERR_INTERNAL", ref }) }], isError: true };
      }
    }
  );

  // ── get_page_meta ─────────────────────────────────────────────────────────
  const allowedRoutes = ["/", "/manifesto", "/doctrine/wid-spec", "/lexicon", "/pricing", "/explore", "/verify", "/trust"];
  server.tool(
    "get_page_meta",
    "Retrieve the title, meta description, og:title, og:description, and og:image for an allowlisted Living Nexus route.",
    {
      route: z.string().refine(
        (r: string) => {
          if (allowedRoutes.includes(r)) return true;
          if (/^\/song\/\d+$/.test(r)) return true;
          if (/^\/share\/WID-[A-Z]{3}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(r)) return true;
          return false;
        },
        "Route not in allowlist"
      ),
    },
    async (args) => {
      logAccess("get_page_meta", args, false);
      try {
        const result = await getPageMeta({ route: args.route });
        logAccess("get_page_meta", args, true);
        if (!result) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "not_found", message: "No metadata found for this route." }) }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const ref = generateRef("MCP");
        if (err instanceof Error && err.name === "ZodError") {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "validation_error", message: err.message, ref }) }], isError: true };
        }
        console.error(`[MCP] [${ref}] get_page_meta error:`, err instanceof Error ? err.stack ?? err.message : err);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "internal_error", code: "ERR_INTERNAL", ref }) }], isError: true };
      }
    }
  );

  // ── get_seo_status ────────────────────────────────────────────────────────
  server.tool(
    "get_seo_status",
    "Retrieve aggregate platform statistics: total works with WIDs, public works, works with lyrics, estimated sitemap URL count, and last witness date.",
    {},
    async (args) => {
      logAccess("get_seo_status", args, false);
      try {
        const result = await getSeoStatus({});
        logAccess("get_seo_status", args, true);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const ref = generateRef("MCP");
        console.error(`[MCP] [${ref}] get_seo_status error:`, err instanceof Error ? err.stack ?? err.message : err);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "internal_error", code: "ERR_INTERNAL", ref }) }], isError: true };
      }
    }
  );

  // ── query_verify_chain ────────────────────────────────────────────────────
  server.tool(
    "query_verify_chain",
    "Retrieve the public verification fields for a work: content hash, witness timestamp, signature status, ECDSA public key/signature, harmonic signature, certificate URL, and anchor references.",
    {
      wid: z.string().regex(WID_PATTERN, "Invalid WID format. Expected WID-XXX-XXXXXXXX-XXXXXXXX"),
    },
    async (args) => {
      logAccess("query_verify_chain", args, false);
      try {
        const result = await queryVerifyChain({ wid: args.wid });
        logAccess("query_verify_chain", args, true);
        if (!result) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "not_found", message: "No public work found for this WID." }) }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const ref = generateRef("MCP");
        if (err instanceof Error && err.name === "ZodError") {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "validation_error", message: err.message, ref }) }], isError: true };
        }
        console.error(`[MCP] [${ref}] query_verify_chain error:`, err instanceof Error ? err.stack ?? err.message : err);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "internal_error", code: "ERR_INTERNAL", ref }) }], isError: true };
      }
    }
  );

  return server;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const mcpRouter = Router();

mcpRouter.use(mcpCors);
mcpRouter.use(bearerAuth);
mcpRouter.use(mcpRateLimit);

// Stateless Streamable HTTP — new server instance per request
mcpRouter.post("/", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });
  const mcpServer = createMcpServer();

  try {
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    const ref = generateRef("MCP");
    console.error(`[MCP] [${ref}] Transport error:`, err instanceof Error ? err.stack ?? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({ error: "internal_error", code: "ERR_INTERNAL", ref });
    }
  }
});

mcpRouter.get("/", (_req: Request, res: Response) => {
  res.status(405).json({
    error: "method_not_allowed",
    message: "This MCP endpoint uses Streamable HTTP transport. Send POST requests with JSON-RPC 2.0 payloads.",
  });
});
