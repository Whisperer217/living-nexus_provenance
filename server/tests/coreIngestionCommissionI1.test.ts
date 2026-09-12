import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = path.resolve(process.cwd(), "drizzle/schema.ts");
const migrationPath = path.resolve(process.cwd(), "drizzle/0139_core_ingestion_commission_i1.sql");
const servicePath = path.resolve(process.cwd(), "server/services/coreIngestion.ts");
const routerPath = path.resolve(process.cwd(), "server/routers/coreIngestion.ts");
const schedulePath = path.resolve(process.cwd(), "server/routes/coreIngestionScheduleRoute.ts");
const rootRouterPath = path.resolve(process.cwd(), "server/routers/index.ts");

function withoutComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
}

describe("Core Ingestion Commission I1 boundaries", () => {
  it("adds isolated Commission, job, and inspection-receipt persistence without modifying existing record models", () => {
    const schema = fs.readFileSync(schemaPath, "utf8");
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(schema).toContain('mysqlTable("coreIngestionCommissions"');
    expect(schema).toContain('mysqlTable("coreIngestionJobs"');
    expect(schema).toContain('mysqlTable("coreIngestionInspectionReceipts"');
    expect(migration).toContain("CREATE TABLE `coreIngestionCommissions`");
    expect(migration).toContain("CREATE TABLE `coreIngestionJobs`");
    expect(migration).toContain("CREATE TABLE `coreIngestionInspectionReceipts`");
    expect(migration).toContain("No existing Work, WID, provenance, PNA, Quiver, Keeper, Guide, avatar");
    expect(migration).not.toMatch(/ALTER TABLE `(?:songs|wids|pnaThreads|pnaThreadMessages|keeperSkins|marketplaceItems)`/);
    expect(schema).toContain("creatorIdempotencyUnique");
  });

  it("keeps I1 deterministic and excludes model, provider, registration, publication, and avatar mutations", () => {
    const service = withoutComments(fs.readFileSync(servicePath, "utf8"));

    expect(service).toContain("storageGet");
    expect(service).toContain("processCoreIngestionBatch");
    expect(service).toContain("CORE_INGESTION_POLICY_VERSION");
    expect(service).not.toMatch(/\b(?:invokeLLM|generateContent|storagePut|createSong|insertWid|addWorkEvent)\b/);
  });

  it("requires creator scope, an owned audio storage key, and a bounded one-time Commission state transition", () => {
    const service = fs.readFileSync(servicePath, "utf8");

    expect(service).toContain("getOwnedCommission");
    expect(service).toContain("assertOwnedStorageKey");
    expect(service).toContain("audio/${creatorId}/");
    expect(service).toContain('commission.status !== "awaiting_asset"');
    expect(service).toContain('status: "queued"');
  });

  it("uses durable optimistic job claims with bounded retries rather than an in-process timer", () => {
    const service = fs.readFileSync(servicePath, "utf8");
    const schedule = fs.readFileSync(schedulePath, "utf8");

    expect(service).toContain('eq(coreIngestionJobs.status, "queued")');
    expect(service).toContain('eq(coreIngestionJobs.attempts, job.attempts)');
    expect(service).toContain("leaseExpiresAt");
    expect(service).toContain("maxAttempts");
    expect(service).not.toContain("setInterval(");
    expect(schedule).toContain('post("/api/scheduled/core-ingestion"');
    expect(schedule).toContain("user.isCron");
    expect(schedule).toContain("processCoreIngestionBatch");
  });

  it("exposes only protected creator inspection procedures and mounts the new namespace explicitly", () => {
    const router = withoutComments(fs.readFileSync(routerPath, "utf8"));
    const rootRouter = fs.readFileSync(rootRouterPath, "utf8");

    expect(router).toContain("protectedProcedure");
    expect(router).toContain("start:");
    expect(router).toContain("attachAsset:");
    expect(router).toContain("cancel:");
    expect(router).toContain("get:");
    expect(router).toContain("list:");
    expect(router).not.toContain("publicProcedure");
    expect(router).not.toContain("publish:");
    expect(router).not.toContain("register:");
    expect(router).not.toContain("invokeLLM");
    expect(rootRouter).toContain('import { coreIngestionRouter }   from "./coreIngestion"');
    expect(rootRouter).toContain("coreIngestion:   coreIngestionRouter");
  });
});
