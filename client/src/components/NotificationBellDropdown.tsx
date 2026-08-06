/**
 * NotificationBellDropdown
 * Quick-access notification panel in the TopBar.
 * Shows last 5 notifications, mark all read, link to full inbox.
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Bell, X, CheckCheck, ChevronRight,
  Megaphone, Sparkles, AlertTriangle, Trophy,
  Shield, Users, Wrench, Gift,
  Heart, MessageSquare, Coins, Eye, Music, ListMusic,
} from "lucide-react";

// ─── Icon mapping ─────────────────────────────────────────────────────────────

function NotifIcon({ type, iconType, size = 14 }: { type: string; iconType?: string; size?: number }) {
  const style = { flexShrink: 0 as const };

  // Admin notification icon types
  if (iconType) {
    switch (iconType) {
      case "announcement": return <Megaphone size={size} style={style} />;
      case "feature": return <Sparkles size={size} style={style} />;
      case "alert": return <AlertTriangle size={size} style={style} />;
      case "milestone": return <Trophy size={size} style={style} />;
      case "provenance": return <Shield size={size} style={style} />;
      case "community": return <Users size={size} style={style} />;
      case "maintenance": return <Wrench size={size} style={style} />;
      case "reward": return <Gift size={size} style={style} />;
    }
  }

  // System notification types
  switch (type) {
    case "like": return <Heart size={size} style={style} />;
    case "comment": return <MessageSquare size={size} style={style} />;
    case "tip": return <Coins size={size} style={style} />;
    case "witness": return <Eye size={size} style={style} />;
    case "new_track": return <Music size={size} style={style} />;
    case "playlist_invite": return <ListMusic size={size} style={style} />;
    case "system": return <Megaphone size={size} style={style} />;
    default: return <Bell size={size} style={style} />;
  }
}

function notifColor(type: string): string {
  switch (type) {
    case "like": return "#E85D75";
    case "comment": return "#7B9EA6";
    case "tip": return "#C9A84C";
    case "witness": return "#7C3AED";
    case "new_track": return "#059669";
    case "system": return "#C9A84C";
    default: return "#6B6555";
  }
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NotificationBellDropdownProps {
  unreadCount: number;
}

export default function NotificationBellDropdown({ unreadCount }: NotificationBellDropdownProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    { limit: 8 },
    { enabled: open, staleTime: 30_000 }
  );

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markRead.mutate({ id: notif.id });
    if (notif.refType === "song" && notif.refId) {
      navigate(`/song/${notif.refId}`);
      setOpen(false);
    } else if (notif.refType === "admin_notification" && notif.body) {
      // For admin notifications with a CTA URL stored in refId, navigate there
      navigate("/notifications");
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center rounded-lg transition-all"
        style={{
          minWidth: 40, minHeight: 40, padding: "0 8px",
          color: open ? "var(--ln-gold)" : "#6B6555",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = "#6B6555"; }}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full animate-pulse"
            style={{
              background: "var(--ln-ember)",
              minWidth: unreadCount > 9 ? 14 : 8,
              height: unreadCount > 9 ? 14 : 8,
              fontSize: "0.4rem",
              color: "#fff",
              fontFamily: "'Space Mono', monospace",
              padding: unreadCount > 9 ? "0 2px" : 0,
            }}
          >
            {unreadCount > 9 ? "9+" : ""}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-[500] flex flex-col"
          style={{
            width: 340,
            background: "rgba(8,6,4,0.98)",
            border: "1px solid rgba(196,154,40,0.2)",
            borderRadius: 8,
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.1)" }}
          >
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: "var(--ln-gold)" }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.65rem", color: "#C9A84C", letterSpacing: "0.06em" }}>
                Signals
              </span>
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(196,154,40,0.15)", fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "#C9A84C" }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 px-2 py-1 rounded transition-opacity hover:opacity-70"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.15)" }}
                  title="Mark all read"
                >
                  <CheckCheck size={10} />
                  ALL READ
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded transition-opacity hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Bell size={28} style={{ color: "rgba(196,154,40,0.2)" }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.3)" }}>
                  No signals yet
                </span>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all hover:opacity-80"
                  style={{
                    background: notif.isRead ? "transparent" : "rgba(196,154,40,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${notifColor(notif.type)}18`, border: `1px solid ${notifColor(notif.type)}44` }}
                  >
                    <NotifIcon type={notif.type} size={12} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="leading-snug"
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.5rem",
                          color: notif.isRead ? "rgba(255,255,255,0.5)" : "rgba(232,213,163,0.9)",
                          fontWeight: notif.isRead ? 400 : 600,
                        }}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: "var(--ln-gold)" }} />
                      )}
                    </div>
                    {notif.body && (
                      <p
                        className="mt-0.5 line-clamp-2"
                        style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}
                      >
                        {notif.body}
                      </p>
                    )}
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.2)", marginTop: 3, display: "block" }}>
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => { navigate("/notifications"); setOpen(false); }}
            className="flex items-center justify-center gap-1.5 py-3 transition-opacity hover:opacity-70"
            style={{ borderTop: "1px solid rgba(196,154,40,0.1)", fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.6)" }}
          >
            VIEW ALL SIGNALS
            <ChevronRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
