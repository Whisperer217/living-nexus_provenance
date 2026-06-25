/**
 * triggerTaggedDownload — fetch+blob single-track download utility
 *
 * Uses fetch() + createObjectURL instead of a bare anchor-click so the download
 * works even when the server falls back to a cross-origin S3/CloudFront redirect.
 * (Browsers ignore the `download` attribute on cross-origin anchors, causing
 * navigation to the S3 URL and a "Service Unavailable" page instead of a file save.)
 *
 * The fetch() call follows the 302 redirect transparently and returns the final
 * response as a blob, which is then handed to a same-origin object URL that the
 * browser will always treat as a download.
 */
export async function triggerTaggedDownload(
  songId: number,
  onProgress?: (state: "loading" | "done" | "error") => void
): Promise<void> {
  onProgress?.("loading");
  try {
    const resp = await fetch(`/api/download/${songId}`, {
      credentials: "include",
    });
    if (!resp.ok) {
      let msg = "Download failed";
      try {
        const body = await resp.json();
        msg = body?.error ?? msg;
      } catch {
        // ignore parse error
      }
      onProgress?.("error");
      throw new Error(msg);
    }
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    // Extract filename from Content-Disposition header if available
    const cd = resp.headers.get("content-disposition") ?? "";
    const match = cd.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
    const rawName = match?.[1]?.replace(/^"|"$/g, "").trim() ?? `track-${songId}.mp3`;
    try {
      a.download = decodeURIComponent(rawName);
    } catch {
      a.download = rawName;
    }
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a short delay to allow the browser to start the download
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    onProgress?.("done");
  } catch (err) {
    onProgress?.("error");
    throw err;
  }
}
