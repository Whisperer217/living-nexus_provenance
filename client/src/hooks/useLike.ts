/**
 * useLike — persistent like/heart toggle backed by the database.
 *
 * Usage:
 *   const { liked, toggle, loading } = useLike(songId);
 *
 * - Calls songs.getLikeStatus on mount (only when authenticated)
 * - Calls songs.toggleLike on user action with optimistic update
 * - Unauthenticated users are redirected to sign-in on toggle
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

export function useLike(songId: number | string) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const id = typeof songId === "string" ? parseInt(songId, 10) : songId;

  // Fetch persisted like status from DB
  const { data } = trpc.songs.getLikeStatus.useQuery(
    { songId: id },
    { enabled: !!user && !isNaN(id) }
  );

  const [liked, setLiked] = useState(false);

  // Sync local state when DB data arrives
  useEffect(() => {
    if (data !== undefined) setLiked(data.liked);
  }, [data]);

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
      window.location.href = getLoginUrl();
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
