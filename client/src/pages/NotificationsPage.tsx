/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — NotificationsPage
   Notification inbox: witness events, comments, playlist invites,
   new tracks, tips — archived forever.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Bell, Eye, MessageSquare, Heart, Coins, ListMusic,
  Music, Megaphone, Check, CheckCheck, Archive, Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

/* ── Notification type → icon + color ──────────────────────────── */
function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    witness:        { icon: <Eye size={14} />,          color: "text-[#CBB183] bg-[#3F4A50]/10" },
    comment:        { icon: <MessageSquare size={14} />, color: "text-[#A78BFA] bg-[#A78BFA]/10" },
    like:           { icon: <Heart size={14} />,         color: "text-rose-400 bg-rose-400/10" },
    tip:            { icon: <Coins size={14} />,         color: "text-emerald-400 bg-emerald-400/10" },
    playlist_invite:{ icon: <ListMusic size={14} />,     color: "text-sky-400 bg-sky-400/10" },
    new_track:      { icon: <Music size={14} />,         color: "text-[#CBB183] bg-[#3F4A50]/10" },
    system:         { icon: <Megaphone size={14} />,     color: "text-white/50 bg-white/5" },
  };
  const { icon, color } = map[type] ?? map.system;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
  );
}

/* ── Single notification row ────────────────────────────────────── */
function NotifRow({
  notif, onRead, onArchive, onAcceptInvite,
}: {
  notif: any;
  onRead: (id: number) => void;
  onArchive: (id: number) => void;
  onAcceptInvite: (playlistId: number, notifId: number) => void;
}) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (!notif.isRead) onRead(notif.id);
    if (notif.refType === "song" && notif.refId) navigate(`/song/${notif.refId}`);
    else if (notif.refType === "playlist" && notif.refId) navigate(`/playlists`);
    else if (notif.refType === "user" && notif.refId) navigate(`/creator/${notif.refId}`);
  };

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all
        ${notif.isRead
          ? "bg-[#2C3438] border border-white/[0.04] hover:border-white/[0.08]"
          : "bg-[#2C3438] border border-[#CBB183]/10 hover:border-[#CBB183]/20"
        }`}
      onClick={handleClick}
    >
      {/* Actor avatar or type icon */}
      <div className="relative flex-shrink-0">
        {notif.actorAvatarUrl ? (
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src={notif.actorAvatarUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <NotifIcon type={notif.type} />
        )}
        {!notif.isRead && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3F4A50] border-2 border-[#2C3438]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug mb-0.5 ${notif.isRead ? "text-white/60" : "text-white"}`}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-[11px] text-white/35 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-[10px] text-white/25 mt-1">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
        {/* Accept invite button */}
        {notif.type === "playlist_invite" && notif.refId && !notif.isRead && (
          <button
            onClick={e => { e.stopPropagation(); onAcceptInvite(notif.refId, notif.id); }}
            className="mt-2 px-3 py-1 rounded-lg text-[11px] font-heading
              bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA]
              hover:bg-[#A78BFA]/20 transition-colors"
          >
            Accept Invite
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.isRead && (
          <button
            onClick={e => { e.stopPropagation(); onRead(notif.id); }}
            className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors"
            title="Mark read"
          >
            <Check size={11} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onArchive(notif.id); }}
          className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/40 transition-colors"
          title="Archive"
        >
          <Archive size={11} />
        </button>
      </div>
    </div>
  );
}

/* ── Main NotificationsPage ─────────────────────────────────────── */
export default function NotificationsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"inbox" | "all">("inbox");

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(
    { limit: 100 },
    { enabled: !!user, refetchInterval: 30_000 }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onMutate: async ({ id }) => {
      await utils.notifications.list.cancel();
      const prev = utils.notifications.list.getData({ limit: 100 });
      utils.notifications.list.setData({ limit: 100 }, (old: any) =>
        old?.map((n: any) => n.id === id ? { ...n, isRead: true } : n)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      utils.notifications.list.setData({ limit: 100 }, ctx?.prev);
    },
    onSettled: () => {
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("All marked as read");
    },
  });

  const archive = trpc.notifications.archive.useMutation({
    onMutate: async ({ id }) => {
      await utils.notifications.list.cancel();
      const prev = utils.notifications.list.getData({ limit: 100 });
      utils.notifications.list.setData({ limit: 100 }, (old: any) =>
        old?.filter((n: any) => n.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      utils.notifications.list.setData({ limit: 100 }, ctx?.prev);
    },
    onSettled: () => {
      utils.notifications.unreadCount.invalidate();
    },
  });

  const acceptInvite = trpc.playlists.acceptInvite.useMutation({
    onSuccess: (_data, vars) => {
      toast.success("Joined playlist!");
      utils.playlists.mine.invalidate();
      navigate("/playlists");
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-mark all as read when page opens — clears the sidebar badge
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      markAllRead.mutate(undefined, {
        onSuccess: () => {
          utils.notifications.unreadCount.invalidate();
          // Don't show toast on auto-mark
        },
      });
    }, 1500); // slight delay so user sees unread state first
    return () => clearTimeout(t);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <div className="min-h-screen bg-[#2C3438] flex items-center justify-center">
        <div className="text-center">
          <Bell size={40} className="mx-auto mb-4 text-[#CBB183]/40" />
          <p className="text-white/50 mb-4">Sign in to see your notifications</p>
          <Button onClick={() => navigate("/")} className="bg-[#3F4A50] text-black font-heading">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const unread = notifications.filter((n: any) => !n.isRead);
  const displayed = tab === "inbox" ? unread : notifications;

  return (
    <div className="min-h-screen bg-[#2C3438] pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading text-white mb-1 flex items-center gap-2">
              Signals
              {unread.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-heading
                  bg-[#3F4A50]/10 border border-[#CBB183]/20 text-[#CBB183]">
                  {unread.length}
                </span>
              )}
            </h1>
            <p className="text-sm text-white/40">Your witness interactions, archived forever</p>
          </div>
          {unread.length > 0 && (
            <Button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              size="sm"
              variant="ghost"
              className="text-white/40 hover:text-white text-xs"
            >
              <CheckCheck size={13} className="mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-[#2C3438] border border-white/[0.06]">
          {(["inbox", "all"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-heading transition-all ${
                tab === t
                  ? "bg-[#3F4A50] text-black"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "inbox" ? `Unread (${unread.length})` : `All (${notifications.length})`}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#CBB183]/50" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={36} className="mx-auto mb-4 text-[#CBB183]/20" />
            <p className="text-white/40 mb-1">
              {tab === "inbox" ? "You're all caught up" : "No notifications yet"}
            </p>
            <p className="text-sm text-white/25">
              {tab === "inbox"
                ? "Switch to All to see your full history"
                : "Witness activity, comments, and invites will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((n: any) => (
              <NotifRow
                key={n.id}
                notif={n}
                onRead={(id) => markRead.mutate({ id })}
                onArchive={(id) => archive.mutate({ id })}
                onAcceptInvite={(playlistId, notifId) => {
                  acceptInvite.mutate({ playlistId });
                  markRead.mutate({ id: notifId });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
