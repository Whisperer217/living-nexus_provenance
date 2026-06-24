/**
 * useLike — persistent like/heart toggle backed by the database.
 *
 * Usage:
 *   const { liked, toggle, loading } = useLike(songId);
 *   // With pre-fetched data (skips individual getLikeStatus query):
 *   const { liked, toggle, loading } = useLike(songId, { skipQuery: true, initialLiked: true });
 *
 * - Calls songs.getLikeStatus on mount (only when authenticated AND skipQuery is false)
 * - Calls songs.toggleLike on user action with optimistic update
 * - Unauthenticated users see a toast prompt to sign in on toggle
 *
 * The `skipQuery` option is critical for pages that render many TrackCards (e.g. HomePage
 * with 24 Discover + 24 Trending). Without it, each card fires an individual getLikeStatus
 * query that gets batched into a single GET URL, causing HTTP 414 URI Too Long errors.
 * Use getBulkLikeStatuses instead and pass skipQuery=true + initialLiked to each card.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface UseLikeOptions {
  /** When true, suppresses the individual getLikeStatus query. Use when the parent
   *  component has already fetched like status via getBulkLikeStatuses. */
  skipQuery?: boolean;
  /** Initial liked state to use when skipQuery is true. */
  initialLiked?: boolean;
}

export function useLike(
  songId: number | string,
  options: UseLikeOptions = {}
) {
  const { skipQuery = false, initialLiked = false } = options;
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const id = typeof songId === "string" ? parseInt(songId, 10) : songId;

  // Fetch persisted like status from DB — disabled when skipQuery is true
  // (caller is responsible for providing initialLiked from a bulk fetch)
  const { data } = trpc.songs.getLikeStatus.useQuery(
    { songId: id },
    { enabled: !skipQuery && !!user && !isNaN(id) && id > 0 }
  );

  const [liked, setLiked] = useState(initialLiked);

  // Sync local state when DB data arrives (only relevant when skipQuery=false)
  useEffect(() => {
    if (data !== undefined) setLiked(data.liked);
  }, [data]);

  // When skipQuery=true, sync if the parent updates the initialLiked prop
  useEffect(() => {
    if (skipQuery) setLiked(initialLiked);
  }, [skipQuery, initialLiked]);

  const toggleMutation = trpc.songs.toggleLike.useMutation({
    onMutate: () => {
      // Optimistic toggle
      setLiked(prev => !prev);
    },
    onError: () => {
      // Rollback on error
      setLiked(prev => !prev);
      toast.error("Failed to update like");
    },
    onSuccess: (result) => {
      // Sync with server truth
      setLiked(result.liked);
      // Invalidate liked songs list so /liked page refreshes
      utils.songs.getLiked.invalidate();
    },
  });

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast.info("Sign in to like this track");
      return;
    }
    if (isNaN(id)) return;
    toggleMutation.mutate({ songId: id });
  };

  return {
    liked,
    toggle,
    loading: toggleMutation.isPending,
  };
}
