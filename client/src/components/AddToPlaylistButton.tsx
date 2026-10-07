/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — AddToPlaylistButton
   Reusable button that adds/removes a song from the user's playlist.
   Shows a gold bookmark icon. Requires authentication.
═══════════════════════════════════════════════════════════════════ */

import { BookmarkPlus, BookmarkCheck, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

interface AddToPlaylistButtonProps {
  songId: number;
  /** compact = icon-only, full = icon + label */
  variant?: "compact" | "full";
  className?: string;
  /** Use when a dense Work shelf cannot safely issue one status query per card. */
  deferStatusQuery?: boolean;
}

export default function AddToPlaylistButton({ songId, variant = "compact", className = "", deferStatusQuery = false }: AddToPlaylistButtonProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: checkData, isLoading: checkLoading } = trpc.playlist.check.useQuery(
    { songId },
    { enabled: isAuthenticated && !deferStatusQuery, staleTime: 30_000 }
  );

  const inPlaylist = checkData?.inPlaylist ?? false;

  const addMutation = trpc.playlist.add.useMutation({
    onSuccess: (data) => {
      if (data.added) {
        toast.success("Added to playlist");
      } else {
        toast.info("Already in playlist");
      }
      utils.playlist.check.invalidate({ songId });
      utils.playlist.get.invalidate();
    },
    onError: () => toast.error("Failed to add to playlist"),
  });

  const removeMutation = trpc.playlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from playlist");
      utils.playlist.check.invalidate({ songId });
      utils.playlist.get.invalidate();
    },
    onError: () => toast.error("Failed to remove from playlist"),
  });

  const isPending = addMutation.isPending || removeMutation.isPending || checkLoading;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/playlist");
      return;
    }
    if (inPlaylist) {
      removeMutation.mutate({ songId });
    } else {
      addMutation.mutate({ songId });
    }
  };

  const title = inPlaylist ? "Remove from playlist" : "Add to playlist";

  if (variant === "full") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        title={title}
        aria-label={title}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-body transition-all
          ${inPlaylist
            ? "bg-[#111111]/20 text-[#C49A28] border border-[#C49A28]/40 hover:bg-[#111111]/30"
            : "bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.10] hover:text-white"
          } ${className}`}
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : inPlaylist ? (
          <BookmarkCheck size={13} />
        ) : (
          <BookmarkPlus size={13} />
        )}
        {inPlaylist ? "In Playlist" : "Add to Playlist"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={title}
      aria-label={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
        ${inPlaylist
          ? "bg-[#111111]/20 text-[#C49A28] border border-[#C49A28]/40 hover:bg-[#111111]/30"
          : "bg-white/[0.06] text-white/50 border border-white/[0.08] hover:bg-white/[0.10] hover:text-white"
        } ${className}`}
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : inPlaylist ? (
        <BookmarkCheck size={13} />
      ) : (
        <BookmarkPlus size={13} />
      )}
    </button>
  );
}
