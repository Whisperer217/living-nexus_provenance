import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = path.resolve(process.cwd(), "drizzle/schema.ts");
const servicePath = path.resolve(process.cwd(), "server/services/coreIngestion.ts");
const routePath = path.resolve(process.cwd(), "server/routes/coreIngestionScheduleRoute.ts");
const routerPath = path.resolve(process.cwd(), "server/routers/coreIngestion.ts");

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
}

describe("Core Ingestion Option B scheduler control plane", () => {
  it("uses an isolated disabled-by-default singleton configuration with the approved five-minute cadence", () => {
    const schema = fs.readFileSync(schemaPath, "utf8");
    const service = fs.readFileSync(servicePath, "utf8");

    expect(schema).toContain('mysqlTable("coreIngestionSchedulerConfigs"');
    expect(schema).toContain('default("0 */5 * * * *")');
    expect(schema).toContain('enabled: boolean("enabled").notNull().default(false)');
    expect(service).toContain('CORE_INGESTION_OPTION_B_CADENCE = "0 */5 * * * *"');
    expect(service).toContain('CORE_INGESTION_SCHEDULER_CALLBACK_PATH = "/api/scheduled/core-ingestion"');
  });

  it("makes unbound and disabled cron identities successful no-ops before the worker can execute", () => {
    const route = stripComments(fs.readFileSync(routePath, "utf8"));
    const guardIndex = route.indexOf("getEnabledCoreIngestionSchedulerConfig(taskUid)");
    const workerIndex = route.indexOf("processCoreIngestionBatch()");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(workerIndex).toBeGreaterThan(guardIndex);
    expect(route).toContain('if (scheduler.state !== "enabled")');
    expect(route).toContain('skipped: scheduler.state');
    expect(route).toContain('return res.status(403).json({ error: "cron-only" })');
    expect(route).toContain("if (!taskUid) {");
    expect(route).toContain('return res.status(403).json({ error: "cron-only" });');
  });

  it("permits scheduler binding only through an admin procedure that verifies the exact Option B task contract", () => {
    const router = stripComments(fs.readFileSync(routerPath, "utf8"));
    const binding = router.slice(router.indexOf("bindOptionBSchedulerTask"));

    expect(binding).toContain("adminProcedure");
    expect(binding).toContain("listHeartbeatJobs(\"\")");
    expect(binding).toContain('task.name !== "core-ingestion-option-b"');
    expect(binding).toContain("task.cronExpression !== CORE_INGESTION_OPTION_B_CADENCE");
    expect(binding).toContain("task.callbackPath !== CORE_INGESTION_SCHEDULER_CALLBACK_PATH");
    expect(binding).toContain("bindCoreIngestionSchedulerTask");
    expect(binding).not.toContain("createHeartbeatJob");
    expect(binding).not.toContain("updateHeartbeatJob");
  });

  it("keeps scheduler execution accounting content-safe and out of canonical authority paths", () => {
    const service = stripComments(fs.readFileSync(servicePath, "utf8"));
    const schedulerSection = service.slice(
      service.indexOf("function schedulerSummary"),
      service.indexOf("function proposalSnapshot"),
    );

    expect(schedulerSection).toContain('lastErrorCode: "SCHEDULER_BATCH_FAILED"');
    expect(schedulerSection).toContain("lastResult: result");
    expect(schedulerSection).not.toMatch(/\b(?:createSong|insertWid|addWorkEvent|publish|invokeLLM|storageGet)\b/);
  });
});
