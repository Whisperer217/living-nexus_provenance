import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = path.resolve(process.cwd(), "drizzle/schema.ts");
const migrationPath = path.resolve(process.cwd(), "drizzle/0140_core_ingestion_review_i2.sql");
const servicePath = path.resolve(process.cwd(), "server/services/coreIngestion.ts");
const routerPath = path.resolve(process.cwd(), "server/routers/coreIngestion.ts");
const pagePath = path.resolve(process.cwd(), "client/src/pages/CoreIngestionReviewPage.tsx");
const appPath = path.resolve(process.cwd(), "client/src/App.tsx");

function withoutComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
}

describe("Core Ingestion review I2 boundaries", () => {
  it("adds isolated proposal, confirmation, and private-Draft records without altering canonical record models", () => {
    const schema = fs.readFileSync(schemaPath, "utf8");
    const migration = fs.readFileSync(migrationPath, "utf8");

    expect(schema).toContain('mysqlTable("coreIngestionDraftProposals"');
    expect(schema).toContain('mysqlTable("coreIngestionDraftConfirmations"');
    expect(schema).toContain('mysqlTable("coreIngestionPrivateDrafts"');
    expect(migration).toContain("CREATE TABLE `coreIngestionDraftProposals`");
    expect(migration).toContain("CREATE TABLE `coreIngestionDraftConfirmations`");
    expect(migration).toContain("CREATE TABLE `coreIngestionPrivateDrafts`");
    expect(migration).not.toMatch(/ALTER TABLE `(?:songs|wids|pnaThreads|pnaThreadMessages|keeperSkins|marketplaceItems)`/);
  });

  it("binds a private proposal to the exact inspected receipt and asset hash", () => {
    const service = withoutComments(fs.readFileSync(servicePath, "utf8"));

    expect(service).toContain("offerCoreIngestionDraftProposal");
    expect(service).toContain("coreIngestionInspectionReceipts");
    expect(service).toContain("receipt.rootAssetHash !== commission.assetSha256");
    expect(service).toContain("proposalDigest");
    expect(service).toContain("CORE_INGESTION_REVIEW_VERSION");
    expect(service).toContain("CORE_INGESTION_PROPOSAL_TTL_MS");
  });

  it("stores only an opaque confirmation digest, uses constant-time comparison, and consumes one confirmation once", () => {
    const service = withoutComments(fs.readFileSync(servicePath, "utf8"));

    expect(service).toContain("randomBytes(32).toString(\"base64url\")");
    expect(service).toContain("tokenHash: sha256hex(confirmationToken)");
    expect(service).toContain("timingSafeEqual");
    expect(service).toContain("CORE_INGESTION_CONFIRMATION_TTL_MS");
    expect(service).toContain('status: "consumed"');
    expect(service).toContain("coreIngestionPrivateDrafts.confirmationId");
  });

  it("has no I2 path to a model, provider, canonical Work, WID, provenance, PNA, avatar, or scheduler activation", () => {
    const service = withoutComments(fs.readFileSync(servicePath, "utf8"));
    const router = withoutComments(fs.readFileSync(routerPath, "utf8"));
    const reviewSection = service.slice(
      service.indexOf("export async function offerCoreIngestionDraftProposal"),
      service.indexOf("async function inspectQueuedJob"),
    );

    expect(reviewSection).not.toMatch(/\b(?:invokeLLM|generateContent|storagePut|createSong|insertWid|addWorkEvent|processCoreIngestionBatch)\b/);
    expect(reviewSection).not.toMatch(/\b(?:pnaThreads|keeperSkins|marketplaceItems|quiverImages)\b/);
    expect(router).toContain("protectedProcedure");
    expect(router).not.toContain("publicProcedure");
    expect(router).not.toContain("publish:");
    expect(router).not.toContain("register:");
  });

  it("presents I2 as a private creator review surface and does not expose an automatic registration action", () => {
    const page = fs.readFileSync(pagePath, "utf8");
    const app = fs.readFileSync(appPath, "utf8");

    expect(page).toContain("Ingestion Commission Review");
    expect(page).toContain("One-time confirmation held only in this page session");
    expect(page).toContain("Private Commission Draft created. It is not a Work, has no WID, and has not been published.");
    expect(page).not.toContain("songs.upload");
    expect(page).not.toContain("issueWID");
    expect(app).toContain('const CoreIngestionReviewPage = lazy(() => import("./pages/CoreIngestionReviewPage"));');
    expect(app).toContain('<Route path="/ingestion/review" component={CoreIngestionReviewPage} />');
  });
});
