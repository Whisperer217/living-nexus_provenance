import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getDb: vi.fn(),
  loadArchiveFactory: vi.fn(),
}));

vi.mock("../_core/sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("../utils/db", () => ({ getDb: mocks.getDb }));
vi.mock("../utils/archiveFactory", () => ({ loadArchiveFactory: mocks.loadArchiveFactory }));
vi.mock("../../drizzle/schema", () => ({ songs: { id: "id", userId: "userId", createdAt: "createdAt" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), desc: vi.fn() }));

import { creatorExportRouter } from "../routes/creatorExportRoute";

type ResponseStub = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

function createResponse(): ResponseStub {
  const response: ResponseStub = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn(), destroy: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function exportHandler() {
  const layer = (creatorExportRouter as unknown as {
    stack: Array<{ route?: { path: string; stack: Array<{ handle: Function }> } }>;
  }).stack.find(entry => entry.route?.path === "/api/creator-export/batch");
  if (!layer?.route) throw new Error("Creator export handler was not registered");
  return layer.route.stack[0].handle;
}

function createDb(work: Record<string, unknown>) {
  const select = vi.fn()
    .mockImplementationOnce(() => ({ from: () => ({ where: () => Promise.resolve([{ id: 1 }]) }) }))
    .mockImplementationOnce(() => ({
      from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset: () => Promise.resolve([work]) }) }) }) }),
    }));
  return { select };
}

describe("creator export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({ id: 1 });
  });

  it("initializes a ZIP and completes a successful authenticated export", async () => {
    const archive = { on: vi.fn(), pipe: vi.fn(), append: vi.fn(), finalize: vi.fn().mockResolvedValue(undefined) };
    const factory = vi.fn().mockReturnValue(archive);
    const db = createDb({
      id: 1, title: "Archive Test", witnessId: "WID-MUS-TEST-12345678", lyricsWid: null,
      contentType: "audio", genre: "Witness", status: "Draft", aiDisclosure: "original", aiConsent: "prohibited",
      bpm: null, musicalKey: null, isrc: null, duration: null, fileUrl: null, fileKey: null,
      coverArtUrl: null, videoUrl: null, createdAt: new Date("2026-08-10T00:00:00.000Z"), updatedAt: new Date("2026-08-10T00:00:00.000Z"),
    });
    const response = createResponse();
    mocks.getDb.mockResolvedValue(db);
    mocks.loadArchiveFactory.mockReturnValue(factory);

    await exportHandler()({ query: { offset: "0", limit: "10" } }, response);

    expect(factory).toHaveBeenCalledWith("zip", { zlib: { level: 6 } });
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "application/zip");
    expect(archive.pipe).toHaveBeenCalledWith(response);
    expect(archive.append).toHaveBeenCalledWith(expect.any(String), { name: "batch-manifest.json" });
    expect(archive.finalize).toHaveBeenCalledOnce();
    expect(response.json).not.toHaveBeenCalled();
  });

  it("returns structured JSON when ZIP initialization fails", async () => {
    const response = createResponse();
    mocks.getDb.mockResolvedValue(createDb({ id: 1 }));
    mocks.loadArchiveFactory.mockImplementation(() => { throw new Error("archive unavailable"); });

    await exportHandler()({ query: { offset: "0", limit: "10" } }, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Archive service is temporarily unavailable. Please try again." });
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});

