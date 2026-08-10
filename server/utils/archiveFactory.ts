import { createRequire } from "module";
import type { ArchiverOptions, ZipArchive } from "archiver";

export type ArchiveFactory = (format: string, options?: ArchiverOptions) => InstanceType<typeof ZipArchive>;
type ZipArchiveConstructor = new (options?: ArchiverOptions) => ReturnType<ArchiveFactory>;

/**
 * Resolves both legacy callable modules and Archiver 8's ESM `ZipArchive`
 * export. The deployment bundler can provide either shape.
 */
export function resolveArchiveFactory(moduleValue: unknown): ArchiveFactory {
  if (typeof moduleValue === "function") {
    return moduleValue as ArchiveFactory;
  }

  if (
    moduleValue &&
    typeof moduleValue === "object" &&
    typeof (moduleValue as { default?: unknown }).default === "function"
  ) {
    return (moduleValue as { default: ArchiveFactory }).default;
  }

  if (
    moduleValue &&
    typeof moduleValue === "object" &&
    typeof (moduleValue as { ZipArchive?: unknown }).ZipArchive === "function"
  ) {
    const ZipArchive: ZipArchiveConstructor = (moduleValue as {
      ZipArchive: ZipArchiveConstructor;
    }).ZipArchive;

    return (format, options) => {
      if (format !== "zip") {
        throw new Error(`Archive format "${format}" is not available in this runtime.`);
      }
      return new ZipArchive(options);
    };
  }

  throw new Error("Archive service is unavailable: the archiver factory could not be loaded.");
}

export function loadArchiveFactory(): ArchiveFactory {
  const require = createRequire(import.meta.url);
  return resolveArchiveFactory(require("archiver"));
}
