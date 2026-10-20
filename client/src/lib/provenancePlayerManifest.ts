export type ProvenancePlayerManifest = {
  schema: "living-nexus-player/1";
  tracks: unknown[];
};

export function serializeProvenancePlayerManifest(manifest: ProvenancePlayerManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export async function copyProvenancePlayerManifest(manifest: ProvenancePlayerManifest): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(serializeProvenancePlayerManifest(manifest));
    return true;
  } catch {
    return false;
  }
}

export function downloadProvenancePlayerManifest(manifest: ProvenancePlayerManifest, fileStem: string): void {
  const blob = new Blob([serializeProvenancePlayerManifest(manifest)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeStem = fileStem.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "living-nexus";

  anchor.href = objectUrl;
  anchor.download = `${safeStem}-provenance-player.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
