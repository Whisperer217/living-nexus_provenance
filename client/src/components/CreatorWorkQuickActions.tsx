import { Download, Heart, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { triggerTaggedDownload } from "@/lib/downloadTrack";
import { useLike } from "@/hooks/useLike";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import { toast } from "sonner";

type CreatorWorkQuickActionsProps = {
  songId: number;
  downloadPermission?: string | null;
  initialLiked?: boolean;
  className?: string;
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
}: CreatorWorkQuickActionsProps) {
  const { liked, toggle, loading: likePending } = useLike(songId, {
    skipQuery: true,
    initialLiked,
  });

  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: async (_data: { url: string }, variables: { songId: number }) => {
      try {
        await triggerTaggedDownload(variables.songId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Download failed");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const downloadAvailable = Boolean(downloadPermission && downloadPermission !== "none");
  const downloadLabel = downloadPermission === "tipped" ? "Download (tip required)" : "Download Work";

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
      <AddToPlaylistButton songId={songId} deferStatusQuery className="ln-creator-work-action" />
      {downloadAvailable && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            downloadMutation.mutate({ songId });
          }}
          disabled={downloadMutation.isPending}
          className="ln-creator-work-action"
          aria-label={downloadLabel}
          title={downloadLabel}
        >
          {downloadMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-3.5" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
