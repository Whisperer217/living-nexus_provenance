import { describe, expect, it, vi } from "vitest";
import { loadArchiveFactory, resolveArchiveFactory } from "../utils/archiveFactory";

describe("archiveFactory", () => {
  it("accepts a CommonJS-shaped archiver factory", () => {
    const factory = vi.fn();
    expect(resolveArchiveFactory(factory)).toBe(factory);
  });

  it("accepts an ESM default-shaped archiver module", () => {
    const factory = vi.fn();
    expect(resolveArchiveFactory({ default: factory })).toBe(factory);
  });

  it("adapts Archiver 8's ESM ZipArchive export to the legacy factory contract", () => {
    const ZipArchive = vi.fn();
    const factory = resolveArchiveFactory({ ZipArchive });
    factory("zip", { zlib: { level: 0 } });

    expect(ZipArchive).toHaveBeenCalledWith({ zlib: { level: 0 } });
    expect(() => factory("tar")).toThrow('Archive format "tar" is not available');
  });

  it("loads the installed archiver package as a usable ZIP factory", () => {
    const archive = loadArchiveFactory()("zip", { zlib: { level: 0 } });
    expect(typeof archive.pipe).toBe("function");
    archive.destroy();
  });

  it("rejects an invalid archiver module before a download response starts", () => {
    expect(() => resolveArchiveFactory({})).toThrow("Archive service is unavailable");
  });
});
