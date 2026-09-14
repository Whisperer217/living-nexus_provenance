import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyPublicWitnessCandidates } from "../domains/registry/publicWitnessProjection";

const workRoutePath = path.resolve(process.cwd(), "server/routes/workRoute.ts");
const dbPath = path.resolve(process.cwd(), "server/utils/db.ts");
const registryRoutePath = path.resolve(process.cwd(), "server/routes/registryApiRoute.ts");

describe("Registry public WID projection repair", () => {
  it("resolves exactly one already-public candidate without considering historical rows", () => {
    const publicWork = { id: 1, state: "Published" };

    expect(classifyPublicWitnessCandidates([publicWork])).toEqual({
      state: "resolved",
      record: publicWork,
    });
  });

  it("refuses to choose between multiple public candidates sharing a WID", () => {
    expect(classifyPublicWitnessCandidates([{ id: 1 }, { id: 2 }])).toEqual({
      state: "ambiguous",
      publicCandidateCountAtLeast: 2,
    });
  });

  it("preserves a non-disclosing not-found state when no public candidate exists", () => {
    expect(classifyPublicWitnessCandidates([])).toEqual({ state: "not_found" });
  });

  it("filters legacy WID projection candidates before selection and returns a typed ambiguity response", () => {
    const dbSource = fs.readFileSync(dbPath, "utf8");
    const routeSource = fs.readFileSync(workRoutePath, "utf8");

    expect(dbSource).toContain("export async function getPublicSongByWitnessId");
    expect(dbSource).toContain('eq(songs.status, "Published")');
    expect(dbSource).toContain("eq(songs.isPublic, true)");
    expect(dbSource).toContain(".orderBy(asc(songs.createdAt), asc(songs.id))");
    expect(dbSource).toContain(".limit(2)");
    expect(routeSource).toContain("getPublicSongByWitnessId");
    expect(routeSource).toContain('selection.state === "ambiguous"');
    expect(routeSource).toContain("WID_AMBIGUOUS");
    expect(routeSource).toContain("res.status(409)");
  });

  it("contains public provenance read-model failures as a typed 503 without leaking the underlying error", () => {
    const routeSource = fs.readFileSync(registryRoutePath, "utf8");
    const provenanceStart = routeSource.indexOf('registryApiRouter.get(`${BASE_PATH}/works/:wid/provenance`');
    const permissionsStart = routeSource.indexOf('registryApiRouter.get(`${BASE_PATH}/works/:wid/permissions`', provenanceStart);
    const handler = routeSource.slice(provenanceStart, permissionsStart);

    expect(handler).toContain("try {");
    expect(handler).toContain("catch {");
    expect(handler).toContain("REGISTRY_READ_UNAVAILABLE");
    expect(handler).toContain("respond(req, res, 503");
    expect(handler).not.toContain("console.error(\"[Registry API] Public provenance read is unavailable.\", error)");
  });

  it("keeps the projection helper strictly read-only", () => {
    const dbSource = fs.readFileSync(dbPath, "utf8");
    const helperStart = dbSource.indexOf("export async function getPublicSongByWitnessId");
    const helperEnd = dbSource.indexOf("export async function updateSongMetadata", helperStart);
    const helper = dbSource.slice(helperStart, helperEnd);

    expect(helper).not.toMatch(/\.insert\(|\.update\(|\.delete\(|insertWid|updateSong|addWorkEvent|storagePut/);
  });
});
