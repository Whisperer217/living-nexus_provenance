import { useState } from "react";
import { Download, Heart, Loader2 } from "lucide-react";
import { triggerTaggedDownload } from "@/lib/downloadTrack";
import { useLike } from "@/hooks/useLike";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import { toast } from "sonner";

type CreatorWorkQuickActionsProps = {
  songId: number;
  downloadPermission?: string | null;
  initialLiked?: boolean;
  className?: string;
  /** Pass false only when this surface has not loaded a bulk heart-state map. */
  deferLikeStatusQuery?: boolean;
  /** Pass false only when this surface can safely inspect its own playlist state. */
  deferPlaylistStatusQuery?: boolean;
};

/**
 * Compact creator-page actions. These intentionally reuse the canonical
 * like, playlist, and WID-tagged download paths; they do not alter Work
 * provenance or bypass a Work's download permission.
 */
export function CreatorWorkQuickActions({
  songId,
  downloadPermission,
  initialLiked = false,
  className = "",
  deferLikeStatusQuery = true,
  deferPlaylistStatusQuery = true,
}: CreatorWorkQuickActionsProps) {
  const { liked, toggle, loading: likePending } = useLike(songId, {
    skipQuery: deferLikeStatusQuery,
    initialLiked,
  });
  const [downloading, setDownloading] = useState(false);

  const downloadAvailable = Boolean(downloadPermission && downloadPermission !== "none");
  const downloadLabel = downloadPermission === "tipped" ? "Download (tip required)" : "Download Work";

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDownloading(true);
    try {
      // The tagged-download route is the canonical browser download path and
      // independently rechecks authentication, entitlement, and Work policy.
      await triggerTaggedDownload(songId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label="Quick Work actions">
      <button
        type="button"
        onClick={toggle}
        disabled={likePending}
        className="ln-creator-work-action"
        aria-label={liked ? "Remove heart" : "Heart this Work"}
        title={liked ? "Remove heart" : "Heart this Work"}
      >
        {likePending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Heart className="size-3.5" fill={liked ? "currentColor" : "none"} aria-hidden="true" />
        )}
      </button>
      <AddToPlaylistButton
        songId={songId}
        deferStatusQuery={deferPlaylistStatusQuery}
        className="ln-creator-work-action"
      />
      {downloadAvailable && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="ln-creator-work-action"
          aria-label={downloadLabel}
          title={downloadLabel}
        >
          {downloading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-3.5" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
