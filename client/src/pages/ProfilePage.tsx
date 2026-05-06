/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ProfilePage
   Fully DB-backed: loads profile from trpc.profile.me, saves via
   trpc.profile.update / uploadAvatar / uploadBanner mutations.
   All changes persist across logout/login.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { useLocation, Link, useSearch } from "wouter";
import {
  Camera, Edit2, Check, X, Music, Heart, DollarSign,
  MapPin, Globe, Twitter, Instagram, Youtube, Share2,
  Play, ExternalLink, Copy, TrendingUp, Loader2,
  CheckCircle, AlertCircle, Zap, LogOut,
  Fingerprint, ScrollText, Activity, Upload, Star, Layers, Eye, Users, Shield,
  Download, Trash2, AlertTriangle, Sun, Moon,
  FolderOpen, Plus, ChevronDown, ChevronRight, GripVertical,
} from "lucide-react";
import { AddToCollectionButton } from "@/components/AddToCollectionModal";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLightsMode } from "@/contexts/LightsModeContext";
import { ImagePositioner } from "@/components/ImagePositioner";
import SupporterBadge from "@/components/SupporterBadge";
import { usePlayer, Track } from "@/contexts/PlayerContext";

import { EDIT_GENRES } from "@shared/contentTypes";
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

/* ── Editable inline field ─────────────────────────────────────── */
function EditableField({
  label, value, onSave, multiline = false, placeholder = ""
}: {
  label: string; value: string; onSave: (v: string) => void;
  multiline?: boolean; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  const save = () => { onSave(val.trim()); setEditing(false); };
  const cancel = () => { setVal(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-start gap-2 w-full">
        {multiline ? (
          <textarea
            value={val}
            onChange={e => {
              setVal(e.target.value);
              // Auto-grow height
              const t = e.target;
              t.style.height = "auto";
              t.style.height = `${t.scrollHeight}px`;
            }}
            rows={3}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-xl text-[13px] font-body text-white/80
              bg-[#111009] border border-[#A78BFA]/50 outline-none resize-none
              placeholder:text-white/60 overflow-hidden"
            style={{ minHeight: "4.5rem" }}
            autoFocus
          />
        ) : (
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-xl text-[13px] font-body text-white/80
              bg-[#111009] border border-[#A78BFA]/50 outline-none
              placeholder:text-white/60"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
        )}
        <button type="button" onClick={save} className="p-2 text-[#C49A28] hover:text-[#C49A28]/80 flex-shrink-0">
          <Check size={14} />
        </button>
        <button type="button" onClick={cancel} className="p-2 text-white/70 hover:text-white/60 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setEditing(true)}>
      <span className={`text-[13px] font-body ${value ? "text-white/60" : "text-white/60 italic"}`}>
        {value || placeholder}
      </span>
      <Edit2 size={11} className="text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

/* ── Handle field — @ prefix is integrated to avoid duplication when editing ── */
function HandleField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  const save = () => { onSave(val.trim()); setEditing(false); };
  const cancel = () => { setVal(value); setEditing(false); };
  if (editing) {
    return (
      <div className="flex items-center gap-1 w-full">
        <span className="text-sm text-white/40 font-body flex-shrink-0">@</span>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="artist-handle"
          className="flex-1 px-2 py-1 rounded-lg text-[13px] font-body text-white/80
            bg-[#111009] border border-[#A78BFA]/50 outline-none
            placeholder:text-white/60"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
        <button type="button" onClick={save} className="p-1.5 text-[#C49A28] hover:text-[#C49A28]/80 flex-shrink-0">
          <Check size={13} />
        </button>
        <button type="button" onClick={cancel} className="p-1.5 text-white/70 hover:text-white/60 flex-shrink-0">
          <X size={13} />
        </button>
      </div>
    );
  }
  return (
    <div className="group flex items-center gap-1 cursor-pointer min-w-0 max-w-full" onClick={() => setEditing(true)}>
      <span className="text-sm text-white/40 font-body flex-shrink-0">@</span>
      <span className={`text-[13px] font-body truncate whitespace-nowrap overflow-hidden ${value ? "text-white/60" : "text-white/40 italic"}`}>
        {value || "artist-handle"}
      </span>
      <Edit2 size={11} className="text-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

/* ── Main ProfilePage ──────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { addAndPlay, currentTrackId, state: playerState } = usePlayer();
  // ── Lights mode ────────────────────────────────────────────────
  const { mode: lightsMode, setMode: setLightsModeLocal } = useLightsMode();
  const setLightsModeMutation = trpc.profile.setLightsMode.useMutation({
    onSuccess: (data) => {
      setLightsModeLocal(data.mode);
      toast.success(data.mode === 'on' ? '☀ Lights On — Espresso Crème mode' : '🌙 Lights Dim — Lantern mode');
    },
    onError: (e) => toast.error(e.message),
  });
  const handleLightsToggle = () => {
    const next = lightsMode === 'dim' ? 'on' : 'dim';
    setLightsModeLocal(next); // optimistic
    setLightsModeMutation.mutate({ mode: next });
  };
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  // Load full profile from DB — always fetch fresh on mount so bio/photo updates are immediately visible
  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: !!user,
    staleTime: 0,           // treat cached data as immediately stale
    refetchOnMount: true,   // always re-fetch when the profile page is visited
    refetchOnWindowFocus: true, // re-fetch when tab regains focus
  });

  // Load user's songs from DB
  const { data: dbSongs = [], isLoading: songsLoading } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
  });

  // Read ?tab= URL param for deep-links from ContextDrawer and other navigation sources
  const search = useSearch();
  const tabFromUrl = new URLSearchParams(search).get("tab") as
    | "overview" | "works" | "collections" | "liked" | "signals" | "field-notes" | "testimony"
    | null;
  const validTabs = ["overview", "works", "collections", "liked", "signals", "field-notes", "testimony"] as const;
  const initialTab = tabFromUrl && (validTabs as readonly string[]).includes(tabFromUrl) ? tabFromUrl : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "works" | "collections" | "liked" | "signals" | "field-notes" | "testimony">(initialTab);
  const [showAddTestimony, setShowAddTestimony] = useState(false);
  const [testimonyContent, setTestimonyContent] = useState("");
  const [testimonyLinkedWorks, setTestimonyLinkedWorks] = useState<string[]>([]);

  // ── Identity data ────────────────────────────────────────────────
  const { data: myStats } = trpc.profile.myStats.useQuery(undefined, { enabled: !!user });
  const { data: myActivity = [] } = trpc.profile.myActivity.useQuery({ limit: 20 }, { enabled: !!user && activeTab === "overview" });
  const { data: witnessNetwork } = trpc.witness.network.useQuery(undefined, { enabled: !!user && activeTab === "overview" });
  const { data: analytics } = trpc.profile.myAnalytics.useQuery(undefined, { enabled: !!user && activeTab === "overview", staleTime: 60_000 });
  // ── Command center tab data ───────────────────────────────────────
  const { data: likedSongs = [] } = trpc.songs.getLikedOrdered.useQuery(undefined, { enabled: !!user && activeTab === "liked" });
  const { data: myCollections = [] } = trpc.userCollections.list.useQuery(undefined, { enabled: !!user && activeTab === "collections" });
  const [expandedCollectionId, setExpandedCollectionId] = useState<number | null>(null);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const { data: expandedCollectionTracks } = trpc.userCollections.getTracks.useQuery(
    { collectionId: expandedCollectionId! },
    { enabled: expandedCollectionId !== null }
  );
  const createCollection = trpc.userCollections.create.useMutation({
    onSuccess: () => { utils.userCollections.list.invalidate(); setCreatingCollection(false); setNewCollectionName(""); },
  });
  const deleteCollection = trpc.userCollections.delete.useMutation({
    onSuccess: () => utils.userCollections.list.invalidate(),
  });
  const removeFromCollection = trpc.userCollections.removeTrack.useMutation({
    onSuccess: () => utils.userCollections.getTracks.invalidate(),
  });
  const reorderLikesMutation = trpc.songs.reorderLikes.useMutation({
    onSuccess: () => utils.songs.getLikedOrdered.invalidate(),
  });
  // ── Legacy playlists (shown in Collections tab) ─────────────────
  const { data: myLegacyPlaylists = [] } = trpc.playlists.mine.useQuery(undefined, { enabled: !!user && activeTab === "collections" });
  const [expandedLegacyPlaylistId, setExpandedLegacyPlaylistId] = useState<number | null>(null);
  const { data: expandedLegacyPlaylistData } = trpc.playlists.getById.useQuery(
    { id: expandedLegacyPlaylistId! },
    { enabled: expandedLegacyPlaylistId !== null }
  );
  const expandedLegacyPlaylistTracks = expandedLegacyPlaylistData?.tracks ?? [];

  const { data: myFieldNotes = [] } = trpc.fieldNotes.mine.useQuery(undefined, { enabled: !!user && activeTab === "field-notes" });
  const { data: myTestimonies = [] } = trpc.testimony.mine.useQuery(undefined, { enabled: !!user && activeTab === "testimony" });
  const createTestimonyMutation = trpc.testimony.create.useMutation({
    onSuccess: () => {
      utils.testimony.mine.invalidate();
      setShowAddTestimony(false);
      setTestimonyContent("");
      setTestimonyLinkedWorks([]);
      toast.success("Testimony witnessed — WID-TST generated!");
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: notifications = [] } = trpc.notifications.list.useQuery(undefined, { enabled: !!user && activeTab === "signals" });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    }
  });
  const markOneRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    }
  });
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: !!user });
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [activityLimit, setActivityLimit] = useState(8);
  // Local genre state — avoids stale-read bug when clicking chips in rapid succession
  const [localGenres, setLocalGenres] = useState<string[]>([]);
  const [genresInitialized, setGenresInitialized] = useState(false);
  // Sync localGenres from server profile (only on initial load or external change)
  useEffect(() => {
    if (profile?.primaryGenre !== undefined && !genresInitialized) {
      const raw = profile.primaryGenre || "";
      setLocalGenres(raw ? raw.split(",").map((g: string) => g.trim()).filter(Boolean) : []);
      setGenresInitialized(true);
    }
  }, [profile?.primaryGenre, genresInitialized]);
  const replyMutation = trpc.notifications.reply.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      setReplyingTo(null);
      setReplyText("");
      toast.success("Reply sent!");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Stripe Connect ───────────────────────────────────────────────
  const { data: connectData, refetch: refetchConnect } = trpc.tips.connectStatus.useQuery(
    undefined, { enabled: !!user }
  );
  const connectMutation = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (data) => {
      // Same-window redirect so Stripe Connect return_url works on mobile
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Mutations ────────────────────────────────────────────────────
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      utils.profile.me.invalidate();
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save profile"),
  });

  const uploadAvatar = trpc.profile.uploadAvatar.useMutation({
    onSuccess: () => {
      utils.profile.me.invalidate();
      toast.success("Avatar updated");
    },
    onError: () => toast.error("Failed to upload avatar"),
  });

  const uploadBanner = trpc.profile.uploadBanner.useMutation({
    onSuccess: (data) => {
      utils.profile.me.invalidate();
      toast.success("Banner updated");
      // If AI detected a focal point, persist it automatically
      if (data?.focalX !== undefined && data?.focalY !== undefined) {
        updateProfile.mutate({ bannerPositionX: data.focalX, bannerPositionY: data.focalY });
        setBannerPos({ x: data.focalX, y: data.focalY });
      }
    },
    onError: () => toast.error("Failed to upload banner"),
  });

  // ── File refs ────────────────────────────────────────────────────
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // ── Avatar position state ─────────────────────────────────────────
  const [showAvatarPositioner, setShowAvatarPositioner] = useState(false);
  const [avatarPos, setAvatarPos] = useState({ x: 50, y: 50 });

  // Sync position from DB on load
  useEffect(() => {
    if (profile?.avatarObjectPosition) {
      const parts = profile.avatarObjectPosition.split(" ");
      if (parts.length === 2) {
        const x = parseInt(parts[0]);
        const y = parseInt(parts[1]);
        if (!isNaN(x) && !isNaN(y)) setAvatarPos({ x, y });
      }
    }
  }, [profile?.avatarObjectPosition]);

  const saveAvatarPosition = (pos: { x: number; y: number }) => {
    updateProfile.mutate({ avatarObjectPosition: `${pos.x}% ${pos.y}%` });
  };
  // ── Banner position state ─────────────────────────────────────────
  const [showBannerPositioner, setShowBannerPositioner] = useState(false);
  const [pendingBannerUrl, setPendingBannerUrl] = useState<string | null>(null);
  const [bannerPos, setBannerPos] = useState({ x: 50, y: 50 });
  // AI focal point returned from uploadBanner — auto-populates position sliders
  const [aiFocalPos, setAiFocalPos] = useState<{ x: number; y: number } | null>(null);
  // Sync banner position from DB on load
  useEffect(() => {
    if (profile?.bannerPositionX !== undefined && profile?.bannerPositionY !== undefined) {
      setBannerPos({ x: profile.bannerPositionX, y: profile.bannerPositionY });
    }
  }, [profile?.bannerPositionX, profile?.bannerPositionY]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const base64 = await toBase64(f);
    uploadAvatar.mutate({ base64, mimeType: f.type });
  };

  const handleBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Show a local preview URL so the user can reposition before uploading
    const objectUrl = URL.createObjectURL(f);
    setPendingBannerUrl(objectUrl);
    setAiFocalPos(null); // reset until AI responds
    setShowBannerPositioner(true);
    // Store the file for later upload
    (bannerRef.current as any)._pendingFile = f;
  };
  const confirmBannerUpload = async (pos: { x: number; y: number; zoom?: number }) => {
    const f = (bannerRef.current as any)?._pendingFile as File | undefined;
    if (!f) return;
    setBannerPos(pos);
    setShowBannerPositioner(false);
    setAiFocalPos(null);
    const base64 = await toBase64(f);
    // Upload and let onSuccess handle AI focal point persistence
    uploadBanner.mutateAsync({ base64, mimeType: f.type }).then((data) => {
      // Use user-chosen position (overrides AI focal if user moved sliders)
      updateProfile.mutate({ bannerPositionX: pos.x, bannerPositionY: pos.y });
      setBannerPos({ x: pos.x, y: pos.y });
      // Surface AI focal point for next reposition session
      if (data?.focalX !== undefined && data?.focalY !== undefined) {
        setAiFocalPos({ x: data.focalX, y: data.focalY });
      }
    });
    if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl);
    setPendingBannerUrl(null);
  };
  const saveBannerPosition = (pos: { x: number; y: number }) => {
    setBannerPos(pos);
    updateProfile.mutate({ bannerPositionX: pos.x, bannerPositionY: pos.y });
    setShowBannerPositioner(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const save = (field: Parameters<typeof updateProfile.mutate>[0]) => {
    updateProfile.mutate(field);
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/creator/${user?.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Profile link copied!"));
  };

  // ── Auth guard ───────────────────────────────────────────────────
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#A78BFA]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-white/40 font-body text-[14px]">Sign in to view your profile</p>
        <a href={getLoginUrl()} className="px-5 py-2.5 rounded-xl bg-[#1C1A14]/10 border border-[#C49A28]/30 text-[#C49A28] font-heading text-[13px] tracking-wider hover:bg-[#1C1A14]/20 transition-all">
          Sign In
        </a>
      </div>
    );
  }

  const artistName = profile?.artistHandle || profile?.name || user.name || "Artist";
  const totalPlays = dbSongs.reduce((sum: number, s: any) => sum + (s.playCount || 0), 0);

  return (
    <div className="animate-fade-up pb-4">
      {/* ── Banner wrapper with gold border ── */}
      <div
        className="relative h-[360px] group"
        style={{
          borderTop: "2px solid rgba(201,168,76,0.6)",
          borderBottom: "2px solid #c9a84c",
          boxShadow: "inset 0 0 0 1px rgba(201,168,76,0.2)",
        }}
      >
        {profile?.bannerUrl ? (
          // Populated state: background-image for zoom support
          <div
            className="w-full h-full overflow-hidden"
            style={{
              backgroundImage: `url(${profile.bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: `${bannerPos.x}% ${bannerPos.y}%`,
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : (
          // Empty state: gold-framed Upload CTA — no plain gradient
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer group/cta"
            style={{
              background: "linear-gradient(135deg, var(--ln-coal), #111009)",
            }}
            onClick={() => bannerRef.current?.click()}
          >
            {/* Subtle grid texture */}
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Upload icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover/cta:scale-110"
              style={{
                background: "rgba(201,168,76,0.1)",
                border: "1.5px solid rgba(201,168,76,0.4)",
              }}
            >
              {uploadBanner.isPending
                ? <Loader2 size={22} className="animate-spin" style={{ color: "#c9a84c" }} />
                : <Upload size={22} style={{ color: "#c9a84c" }} />}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "#c9a84c", fontFamily: "'Cinzel', serif" }}>
                {uploadBanner.isPending ? "Uploading…" : "Upload Banner"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Define your profile presence
              </p>
            </div>
          </div>
        )}
        {/* Bottom fade — only when banner is populated */}
        {profile?.bannerUrl && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#111009] to-transparent pointer-events-none" />
        )}
        {/* Gold corner accents */}
        <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none" style={{ borderTop: "3px solid #c9a84c", borderLeft: "3px solid #c9a84c" }} />
        <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none" style={{ borderTop: "3px solid #c9a84c", borderRight: "3px solid #c9a84c" }} />
        <div className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none" style={{ borderBottom: "3px solid #c9a84c", borderLeft: "3px solid #c9a84c" }} />
        <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none" style={{ borderBottom: "3px solid #c9a84c", borderRight: "3px solid #c9a84c" }} />
        {/* Change banner button — only shown when banner exists */}
        {profile?.bannerUrl && (
          <button
            onClick={() => bannerRef.current?.click()}
            disabled={uploadBanner.isPending}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[11px] font-body opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#c9a84c",
            }}
          >
            {uploadBanner.isPending ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            {uploadBanner.isPending ? "Uploading…" : "Change Banner"}
          </button>
        )}
        {/* Reposition existing banner button */}
        {profile?.bannerUrl && (
          <button
            onClick={() => setShowBannerPositioner(true)}
            className="absolute top-3 right-[140px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[11px] font-body opacity-0 group-hover:opacity-100 transition-all"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#c9a84c",
            }}
          >
            <Edit2 size={12} />
            Reposition
          </button>
        )}
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
      </div>
      {/* ── Banner inline repositioner ── */}
      {showBannerPositioner && (pendingBannerUrl || profile?.bannerUrl) && (
        <ImagePositioner
          imageUrl={pendingBannerUrl || profile!.bannerUrl!}
          initialX={aiFocalPos?.x ?? bannerPos.x}
          initialY={aiFocalPos?.y ?? bannerPos.y}
          initialZoom={110}
          aiFocal={!!aiFocalPos}
          previewHeight="16rem"
          roundedTop={false}
          label={pendingBannerUrl ? "Set Banner Position" : "Reposition Banner"}
          onSave={pendingBannerUrl ? confirmBannerUpload : saveBannerPosition}
          onCancel={() => {
            setShowBannerPositioner(false);
            if (pendingBannerUrl) { URL.revokeObjectURL(pendingBannerUrl); setPendingBannerUrl(null); }
          }}
        />
      )}

      {/*
        LAYER SYSTEM — ProfilePage:
        1. Banner at natural height (220px)
        2. Header panel: controlled backdrop, no -mt bleed
        3. Avatar pulled up slightly with -mt, outline seals the gap
        4. Identity (avatar + name + handle + bio) anchored left
        5. Signals (track count, supporter badge) right-aligned, minimal
        6. Actions (copy link, logout) right-aligned below signals
        7. Edit fields (handle, bio, defaults, socials) in a clean section below the header panel
      */}
      {/* ── Header panel ── */}
      <div
        className="w-full"
        style={{
          background: "var(--ln-coal)",
          borderBottom: "1px solid #111009",
        }}
      >
        <div className="px-6">
          <div className="flex items-start gap-6 py-7">

            {/* ── Avatar — anchored left, slight pull-up ── */}
            <div className="-mt-20 flex-shrink-0">
              <div className="relative group">
                <div
                  className="w-36 h-36 rounded-2xl overflow-hidden bg-[#111009] flex items-center justify-center"
                  style={{
                    outline: "3px solid #111009",
                    border: "1.5px solid rgba(212,175,55,0.25)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  {profile?.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${avatarPos.x}% ${avatarPos.y}%` }}
                    />
                  ) : (
                    <img src={LOGO_URL} alt="LN" className="w-14 h-14 object-contain opacity-60" />
                  )}
                </div>
                {/* Hover overlay: camera + adjust buttons */}
                <div className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-1
                  opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => avatarRef.current?.click()}
                    disabled={uploadAvatar.isPending}
                    className="flex items-center gap-1 text-white text-[10px] font-body disabled:opacity-50"
                  >
                    {uploadAvatar.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Camera size={14} />}
                    <span>Change</span>
                  </button>
                  {profile?.profilePhotoUrl && (
                    <button
                      onClick={() => setShowAvatarPositioner(true)}
                      className="flex items-center gap-1 text-white/70 hover:text-[#C49A28] text-[10px] font-body transition-colors"
                    >
                      <Edit2 size={12} />
                      <span>Adjust</span>
                    </button>
                  )}
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>

              {/* Avatar floating repositioner — portal-rendered, does not disrupt layout */}
              {showAvatarPositioner && profile?.profilePhotoUrl && createPortal(
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowAvatarPositioner(false)}
                  />
                  {/* Floating panel */}
                  <div
                    className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: "min(360px, 90vw)" }}
                    onClick={e => e.stopPropagation()}
                  >
                    <ImagePositioner
                      imageUrl={profile.profilePhotoUrl}
                      initialX={avatarPos.x}
                      initialY={avatarPos.y}
                      initialZoom={110}
                      previewHeight="10rem"
                      previewClass="rounded-t-xl"
                      roundedTop={true}
                      label="Adjust Avatar"
                      onSave={(pos: { x: number; y: number; zoom: number }) => {
                        setAvatarPos(pos);
                        setShowAvatarPositioner(false);
                        saveAvatarPosition(pos);
                      }}
                      onCancel={() => setShowAvatarPositioner(false)}
                    />
                  </div>
                </>,
                document.body
              )}
            </div>

            {/* ── Identity block — left-anchored ── */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Name + ARTIST tag */}
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <EditableField
                  label="Artist Name"
                  value={profile?.name || ""}
                  onSave={v => save({ name: v })}
                  placeholder="Your artist name"
                />
                <span className="text-[10px] px-2 py-0.5 rounded tracking-widest font-mono flex-shrink-0"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "var(--ln-gold)" }}
                >
                  ARTIST
                </span>
              </div>
              {/* Handle — @ prefix integrated into HandleField to avoid duplication when editing */}
              <div className="flex items-center gap-1 mb-1 min-w-0 overflow-hidden">
                <HandleField
                  value={profile?.artistHandle || ""}
                  onSave={v => save({ artistHandle: v })}
                />
              </div>
              {/* Bio — inline edit, single line preview */}
              <EditableField
                label="Bio"
                value={profile?.bio || ""}
                onSave={v => save({ bio: v })}
                multiline
                placeholder="Tell the world about your music…"
              />
            </div>

            {/* ── Right column: signals + actions ── */}
            <div className="flex-shrink-0 flex flex-col items-end gap-3 pt-1">
              {/* Signals */}
              <div className="flex items-center gap-3">
                {(profile as any)?.supporterTier && (
                  <SupporterBadge tier={(profile as any).supporterTier as "covenant" | "patron" | "supporter"} linkToFounders />
                )}
                <span className="text-sm" style={{ color: "var(--ln-smoke)" }}>
                  <span style={{ color: "var(--ln-parchment)", fontVariantNumeric: "tabular-nums" }}>{dbSongs.length}</span>
                  {" "}tracks
                </span>
                {totalPlays > 0 && (
                  <span className="text-sm" style={{ color: "var(--ln-smoke)" }}>
                    <span style={{ color: "var(--ln-parchment)", fontVariantNumeric: "tabular-nums" }}>
                      {totalPlays >= 1000 ? `${(totalPlays/1000).toFixed(1)}k` : totalPlays}
                    </span>
                    {" "}plays
                  </span>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyProfileLink}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-smoke)", background: "transparent" }}
                  title="Copy profile link"
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={copyProfileLink}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-smoke)", background: "transparent" }}
                  title="Share profile"
                >
                  <Share2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit fields section — below header, inside page body ── */}
      <div className="px-6 pt-5">

        {/* ── Creator Defaults: AI Disclosure + Primary Genre ── */}
        <div className="mb-4 p-4 rounded-xl border border-white/[0.07] bg-[#111009]">
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#E2E8F0", fontFamily: "'Cinzel', serif" }}>
            Creator Defaults — applied to every upload
          </p>
          <div className="flex flex-wrap gap-4">
            {/* AI Disclosure */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-[11px] text-white/70 font-body">AI Disclosure</label>
              <select
                value={profile?.aiDisclosure || "original"}
                onChange={e => save({ aiDisclosure: e.target.value as "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument" })}
                className="px-3 py-2 rounded-lg text-[13px] font-body text-white/80 bg-[#111009] border border-white/[0.1] outline-none cursor-pointer hover:border-[#A78BFA]/50 transition-colors"
                style={{ background: "var(--ln-coal)" }}
              >
                <option value="original">Human-Made — No AI Used</option>
                <option value="ai_assisted">AI-Assisted — Human + AI Tools</option>
                <option value="human_authored_ai_instrument">HAAI — Human-Authored via AI Instrument</option>
                <option value="ai_generated">AI-Generated — AI-Created</option>
              </select>
            </div>
            {/* Primary Genre — multi-select chips */}
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <label className="text-[11px] font-body flex items-center gap-2" style={{ color: "var(--ln-smoke)" }}>
                Primary Genre / Style
                <span className="text-[10px] font-normal" style={{ color: "var(--ln-iron)" }}>select all that apply</span>
              </label>
              {(() => {
                const toggle = (g: string) => {
                  const next = localGenres.includes(g)
                    ? localGenres.filter((x: string) => x !== g)
                    : [...localGenres, g];
                  setLocalGenres(next);
                  save({ primaryGenre: next.join(", ") });
                };
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {EDIT_GENRES.map((g) => {
                      const active = localGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggle(g)}
                          className="px-2.5 py-1 rounded-full text-xs transition-all"
                          style={{
                            background: active ? "rgba(196,154,40,0.22)" : "rgba(255,255,255,0.06)",
                            color: active ? "var(--ln-gold)" : "var(--ln-smoke)",
                            border: `1px solid ${active ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.15)"}`,
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {active && <span className="mr-1 text-[10px]">✓</span>}{g}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Location + Website ── */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-white/65" />
            <EditableField
              label="Location"
              value={profile?.location || ""}
              onSave={v => save({ location: v })}
              placeholder="Add location"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-white/65" />
            <EditableField
              label="Website"
              value={profile?.website || ""}
              onSave={v => save({ website: v })}
              placeholder="Add website URL"
            />
          </div>
        </div>

        {/* ── Social Links ── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {profile?.twitterHandle && (
            <a href={`https://twitter.com/${profile.twitterHandle}`} target="_blank" rel="noreferrer"
              className="p-2 rounded-lg bg-[#111009] border border-white/[0.06] text-white/40 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30 transition-all">
              <Twitter size={14} />
            </a>
          )}
          {profile?.instagramHandle && (
            <a href={`https://instagram.com/${profile.instagramHandle}`} target="_blank" rel="noreferrer"
              className="p-2 rounded-lg bg-[#111009] border border-white/[0.06] text-white/40 hover:text-[#E1306C] hover:border-[#E1306C]/30 transition-all">
              <Instagram size={14} />
            </a>
          )}
          {profile?.youtubeHandle && (
            <a href={`https://youtube.com/@${profile.youtubeHandle}`} target="_blank" rel="noreferrer"
              className="p-2 rounded-lg bg-[#111009] border border-white/[0.06] text-white/40 hover:text-[#FF0000] hover:border-[#FF0000]/30 transition-all">
              <Youtube size={14} />
            </a>
          )}
          <SocialsEditor
            twitter={profile?.twitterHandle || ""}
            instagram={profile?.instagramHandle || ""}
            youtube={profile?.youtubeHandle || ""}
            onSave={(t, i, y) => save({ twitterHandle: t, instagramHandle: i, youtubeHandle: y })}
          />
        </div>

        {/* ── Command Center Tabs ── */}
        {(() => {
          const tabs: { id: typeof activeTab; label: string; badge?: string | null }[] = [
            { id: "overview",     label: "Overview" },
            { id: "works",        label: "Works" },
            { id: "collections",  label: "Collections" },
            { id: "liked",        label: "Liked" },
            { id: "signals",      label: "Signals", badge: (unreadCount as number) > 0 ? String(unreadCount) : null },
            { id: "field-notes",  label: "Field Notes" },
            { id: "testimony",     label: "Testimony" },
          ];
          return (
            <div className="flex gap-0 mb-5 border-b border-white/[0.07] overflow-x-auto scrollbar-none">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-heading tracking-wider whitespace-nowrap transition-all border-b-2 -mb-px flex-shrink-0
                    ${activeTab === tab.id
                      ? "border-[#C49A28] text-[#C49A28]"
                      : "border-transparent text-white/40 hover:text-white/65"
                    }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center animate-pulse"
                      style={{ background: "var(--ln-ember)", color: "white" }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════
             OVERVIEW TAB — Stats + Activity + Witness Network
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Plays", value: (analytics?.totalPlays ?? totalPlays).toLocaleString(), sub: analytics?.playsThisWeek ? `+${analytics.playsThisWeek} this week` : "across all tracks", color: "var(--ln-gold)" },
                { label: "Total Resonance", value: (analytics?.totalLikes ?? 0).toLocaleString(), sub: analytics?.likesThisWeek ? `+${analytics.likesThisWeek} this week` : "across all tracks", color: "#f472b6" },
                { label: "Tracks Published", value: dbSongs.filter((s: any) => s.status === "Published").length, sub: "live on Explore", color: "#A78BFA" },
                { label: "Gifts Received", value: analytics?.totalGiftsReceived ?? 0, sub: analytics?.totalAmountReceived ? `$${((analytics.totalAmountReceived) / 100).toFixed(2)} total` : "tip income", color: "#4ade80" },
                { label: "Witnessing", value: witnessNetwork?.witnessing?.length ?? 0, sub: "creators you witness", color: "#60a5fa" },
                { label: "Witnesses", value: witnessNetwork?.witnessedBy?.length ?? 0, sub: "creators witnessing you", color: "#fb923c" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-xl bg-[#111009] border border-white/[0.06]">
                  <div className="text-[22px] font-heading mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[12px] font-body text-white/70">{s.label}</div>
                  <div className="text-[11px] font-body text-white/40 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
            {/* Stripe Connect status card */}
            <div className="p-4 rounded-xl border border-white/[0.07] bg-[#111009]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-[#C49A28]" />
                  <span className="font-heading text-[13px] text-white/80 tracking-wide">Stripe Connect</span>
                </div>
                {connectData?.status === "enabled" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.12)", color: "var(--ln-seal-bright)", border: "1px solid rgba(74,222,128,0.28)" }}>Active</span>
                ) : connectData?.status === "pending" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(170,142,100,0.12)", color: "var(--ln-smoke)", border: "1px solid rgba(170,142,100,0.3)" }}>Pending</span>
                ) : (
                  <button
                    onClick={() => connectMutation.mutate({ returnUrl: `${window.location.origin}/profile` })}
                    disabled={connectMutation.isPending}
                    className="text-[11px] px-3 py-1 rounded-lg font-body text-black disabled:opacity-50"
                    style={{ background: "var(--ln-iron)" }}
                  >
                    {connectMutation.isPending ? "Connecting…" : "Connect Stripe"}
                  </button>
                )}
              </div>
              <p className="text-[11px] font-body text-white/50 mt-2">Receive tips — you keep 90%</p>
            </div>
            {/* Recent activity */}
            <div>
              <div className="text-[11px] font-heading tracking-widest text-white/50 mb-3">RECENT ACTIVITY</div>
              {myActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity size={24} className="mx-auto mb-2 text-white/15" />
                  <p className="text-white/50 font-body text-[12px]">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(myActivity as any[]).slice(0, activityLimit).map((evt) => {
                    const iconMap: Record<string, { icon: any; color: string; label: string }> = {
                      TIP: { icon: DollarSign, color: "#4ade80", label: "Gift received" },
                      COMMENT: { icon: ScrollText, color: "#A78BFA", label: "Comment" },
                      LIKE: { icon: Heart, color: "#f472b6", label: "Like" },
                      WITNESS_REGISTERED: { icon: Fingerprint, color: "var(--ln-gold)", label: "WID Registered" },
                      WITNESS_VERIFIED: { icon: CheckCircle, color: "var(--ln-gold)", label: "WID Verified" },
                      WORK_REFERENCED: { icon: Layers, color: "#fb923c", label: "Work Referenced" },
                      SYSTEM_UPDATE: { icon: Zap, color: "#60a5fa", label: "System Update" },
                      PRESERVATION_MODE: { icon: Star, color: "var(--ln-gold)", label: "Preservation Mode" },
                      PROJECT_PUBLISHED: { icon: Layers, color: "#34d399", label: "Project Published" },
                      PROJECT_FUNDED: { icon: DollarSign, color: "#34d399", label: "Project Funded" },
                      FOLLOW: { icon: Users, color: "#f472b6", label: "New Follower" },
                      PROJECT_ARCHIVED: { icon: Star, color: "#94a3b8", label: "Project Archived" },
                      PROJECT_DRAFT: { icon: Star, color: "#94a3b8", label: "Project Saved as Draft" },
                    };
                    const meta = iconMap[evt.type] ?? { icon: Activity, color: "#A78BFA", label: evt.type };
                    const Icon = meta.icon;
                    // Build navigation link: song link or project link
                    const evtLink = (evt as any).songLink ?? ((evt as any).projectSlug ? `/project/${(evt as any).projectSlug}` : null);
                    const titleEl = evt.songTitle ? (
                      evtLink ? (
                        <Link href={evtLink} className="text-[11px] font-body text-[#A78BFA]/70 ml-1 truncate hover:text-[#A78BFA] transition-colors">— {evt.songTitle}</Link>
                      ) : (
                        <span className="text-[11px] font-body text-white/55 ml-1 truncate">— {evt.songTitle}</span>
                      )
                    ) : null;
                    return (
                      <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02]">
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${meta.color}15` }}>
                          <Icon size={12} style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0 flex items-baseline flex-wrap gap-x-0">
                          <span className="text-[12px] font-body text-white/65">{meta.label}</span>
                          {titleEl}
                        </div>
                        <span className="text-[10px] font-body text-white/45 flex-shrink-0">
                          {new Date(evt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                  {(myActivity as any[]).length > activityLimit && (
                    <button
                      onClick={() => setActivityLimit(prev => prev + 12)}
                      className="w-full py-2 text-[11px] font-body text-white/55 hover:text-white/60 transition-colors rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
                    >
                      Show more ({(myActivity as any[]).length - activityLimit} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             WORKS TAB — My uploaded tracks
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "works" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-heading tracking-widest text-white/50">{dbSongs.length} TRACKS</span>
              <button
                onClick={() => navigate("/upload")}
                className="flex items-center gap-1.5 text-[11px] font-body px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#A78BFA" }}
              >
                <Upload size={11} /> Upload
              </button>
            </div>
            {songsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-[#111009] animate-pulse">
                    <div className="w-11 h-11 rounded-lg flex-shrink-0 bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded bg-white/[0.06] w-2/3" />
                      <div className="h-2.5 rounded bg-white/[0.04] w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dbSongs.length === 0 ? (
              <div className="text-center py-12 text-white/40 font-body text-[13px]">
                No tracks yet.{" "}
                <button type="button" onClick={() => navigate("/upload")} className="text-[#A78BFA] hover:underline">Upload your first track</button>
              </div>
            ) : (
              (dbSongs as any[]).map((song) => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#111009] hover:border-white/[0.12] transition-all group">
                  <div className="w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden bg-[#111009]">
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${(song as any).coverPositionX ?? 50}% ${(song as any).coverPositionY ?? 50}%` }} />
                      : <div className="w-full h-full flex items-center justify-center text-white/60"><Music size={16} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-body text-white/85 truncate flex-1 min-w-0">{song.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-body flex-shrink-0 ${
                        song.status === "Published" ? "bg-green-500/10 text-lnx-green" :
                        song.status === "Draft" ? "bg-amber-500/10 text-amber-400" : "bg-white/[0.05] text-white/70"
                      }`}>{song.status || "Published"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {song.genre && <span className="text-[10px] text-white/50 font-body truncate max-w-[100px]">{song.genre}</span>}
                      <span className="text-[10px] text-white/40 font-body flex-shrink-0 flex items-center gap-0.5">
                        <Play size={8} className="inline" />{(song.playCount || 0).toLocaleString()}
                      </span>
                      {analytics && (() => {
                        const likeEntry = analytics.likesByTrack?.find((l: any) => l.trackId === String(song.id));
                        return likeEntry && likeEntry.likes > 0 ? (
                          <span className="text-[10px] text-pink-400/60 font-body flex-shrink-0 flex items-center gap-0.5">
                            <Heart size={8} className="inline" />{likeEntry.likes}
                          </span>
                        ) : null;
                      })()}
                      {analytics && (() => {
                        const giftEntry = analytics.giftsByTrack?.find((g: any) => g.trackId === String(song.id));
                        return giftEntry && giftEntry.giftCount > 0 ? (
                          <span className="text-[10px] text-lnx-green/60 font-body flex-shrink-0 flex items-center gap-0.5">
                            <DollarSign size={8} className="inline" />{giftEntry.giftCount}
                          </span>
                        ) : null;
                      })()}
                      {song.createdAt && <span className="text-[10px] text-white/55 font-body flex-shrink-0">{new Date(song.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => navigate(`/song/${song.id}`)} className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#A78BFA] hover:bg-white/[0.1] transition-all" title="Open song page"><ExternalLink size={12} /></button>
                    {song.witnessId && (
                      <button
                        onClick={() => navigate(`/song/${song.id}#witness-records`)}
                        className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#C49A28] hover:bg-white/[0.1] transition-all"
                        title="View Witness Records"
                      >
                        <Shield size={12} />
                      </button>
                    )}
                    <button type="button" onClick={() => { const url = `${window.location.origin}/song/${song.id}`; navigator.clipboard.writeText(url).then(() => toast.success("Song link copied!")); }} className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#C49A28] hover:bg-white/[0.1] transition-all" title="Copy song link"><Copy size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             COLLECTIONS TAB — User-created named collections
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "collections" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-heading tracking-widest text-white/50">{myCollections.length} COLLECTIONS</span>
              <button
                onClick={() => setCreatingCollection(true)}
                className="flex items-center gap-1.5 text-[11px] font-body px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.3)", color: "#C49A28" }}
              >
                <Plus size={11} /> New Collection
              </button>
            </div>

            {/* New collection input */}
            {creatingCollection && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-[rgba(196,154,40,0.3)] bg-[#111009]">
                <FolderOpen size={14} className="text-[#C49A28] flex-shrink-0" />
                <input
                  autoFocus
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newCollectionName.trim()) createCollection.mutate({ name: newCollectionName.trim() }); if (e.key === "Escape") { setCreatingCollection(false); setNewCollectionName(""); } }}
                  placeholder="Collection name..."
                  className="flex-1 bg-transparent text-[13px] font-body text-white/80 outline-none placeholder:text-white/25"
                />
                <button onClick={() => newCollectionName.trim() && createCollection.mutate({ name: newCollectionName.trim() })} className="text-[#C49A28] hover:text-[#e8b83a] transition-colors"><Check size={13} /></button>
                <button onClick={() => { setCreatingCollection(false); setNewCollectionName(""); }} className="text-white/30 hover:text-white/60 transition-colors"><X size={13} /></button>
              </div>
            )}

            {myCollections.length === 0 && !creatingCollection ? (
              <div className="text-center py-12">
                <FolderOpen size={24} className="mx-auto mb-2 text-white/15" />
                <p className="text-white/50 font-body text-[12px]">No collections yet</p>
                <p className="text-white/30 font-body text-[11px] mt-1">Click + on any track to add it to a collection</p>
              </div>
            ) : (
              (myCollections as any[]).map((col) => {
                const isExpanded = expandedCollectionId === col.id;
                return (
                  <div key={col.id} className="rounded-xl border border-white/[0.06] bg-[#111009] overflow-hidden">
                    {/* Collection header */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-all"
                      onClick={() => setExpandedCollectionId(isExpanded ? null : col.id)}
                    >
                      <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}>
                        <FolderOpen size={14} className="text-[#C49A28]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-body text-white/80 truncate">{col.name}</p>
                        <p className="text-[11px] font-body text-white/40 mt-0.5">{col.trackCount ?? 0} tracks</p>
                      </div>
                      {isExpanded ? <ChevronDown size={13} className="text-white/30 flex-shrink-0" /> : <ChevronRight size={13} className="text-white/30 flex-shrink-0" />}
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm(`Delete "${col.name}"?`)) deleteCollection.mutate({ collectionId: col.id }); }}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                      ><Trash2 size={11} /></button>
                    </div>
                    {/* Expanded track list */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.04]">
                        {!expandedCollectionTracks ? (
                          <div className="flex items-center justify-center py-6"><Loader2 size={14} className="text-[#C49A28]/40 animate-spin" /></div>
                        ) : expandedCollectionTracks.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-white/30 font-body text-[11px]">No tracks yet — click + on any track</p>
                          </div>
                        ) : (
                          (expandedCollectionTracks as any[]).map((item) => {
                            const s = item.song ?? item;
                            return (
                              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-all border-b border-white/[0.03] last:border-0">
                                <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden bg-[#0a0a08]">
                                  {s.coverArtUrl
                                    ? <img src={s.coverArtUrl} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center"><Music size={11} className="text-white/30" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-body text-white/75 truncate">{s.title}</p>
                                  <p className="text-[10px] font-body text-white/40 truncate">{s.artistHandle ?? s.creatorName ?? ""}</p>
                                </div>
                                <button
                                  onClick={() => removeFromCollection.mutate({ collectionId: col.id, songId: s.id })}
                                  className="p-1.5 rounded text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                                ><X size={10} /></button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* ── Legacy Playlists section ── */}
            {(myLegacyPlaylists as any[]).length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3 pt-4 border-t border-white/[0.06]">
                  <Music size={11} className="text-white/30" />
                  <span className="text-[11px] font-heading tracking-widest text-white/50">{(myLegacyPlaylists as any[]).length} PLAYLISTS</span>
                </div>
                {(myLegacyPlaylists as any[]).map((pl: any) => {
                  const isExpanded = expandedLegacyPlaylistId === pl.id;
                  return (
                    <div key={pl.id} className="rounded-xl border border-white/[0.06] bg-[#111009] overflow-hidden mb-2">
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-all"
                        onClick={() => setExpandedLegacyPlaylistId(isExpanded ? null : pl.id)}
                      >
                        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                          <Music size={14} className="text-[#A78BFA]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-body text-white/80 truncate">{pl.name}</p>
                          <p className="text-[11px] font-body text-white/40 mt-0.5">Playlist</p>
                        </div>
                        {isExpanded ? <ChevronDown size={13} className="text-white/30 flex-shrink-0" /> : <ChevronRight size={13} className="text-white/30 flex-shrink-0" />}
                      </div>
                      {isExpanded && (
                        <div className="border-t border-white/[0.04]">
                          {expandedLegacyPlaylistTracks.length === 0 ? (
                            <div className="text-center py-6">
                              <p className="text-white/30 font-body text-[11px]">No tracks in this playlist</p>
                            </div>
                          ) : (
                            (expandedLegacyPlaylistTracks as any[]).map((item: any) => {
                              const s = item.song ?? item;
                              return (
                                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-all border-b border-white/[0.03] last:border-0">
                                  <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden bg-[#0a0a08]">
                                    {s.coverArtUrl
                                      ? <img src={s.coverArtUrl} alt="" className="w-full h-full object-cover" />
                                      : <div className="w-full h-full flex items-center justify-center"><Music size={11} className="text-white/30" /></div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-body text-white/75 truncate">{s.title}</p>
                                    <p className="text-[10px] font-body text-white/40 truncate">{s.artistHandle ?? s.creatorName ?? ""}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             LIKED TAB — Liked songs
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "liked" && (
          <div className="space-y-3">
            <span className="text-[11px] font-heading tracking-widest text-white/50 block mb-1">{(likedSongs as any[]).length} LIKED TRACKS</span>
            {(likedSongs as any[]).length === 0 ? (
              <div className="text-center py-12">
                <Heart size={24} className="mx-auto mb-2 text-white/15" />
                <p className="text-white/50 font-body text-[12px]">No liked tracks yet</p>
                <button type="button" onClick={() => navigate("/explore")} className="text-[#A78BFA] hover:underline text-[12px] font-body mt-1">Explore music</button>
              </div>
            ) : (
              (likedSongs as any[]).map((item) => {
                const s = item.song ?? item;
                const creatorName = item.creator?.artistHandle || item.creator?.name || artistName;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#111009] hover:border-white/[0.12] transition-all">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-[#111009]">
                      {s.coverArtUrl
                        ? <img src={s.coverArtUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-white/40" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-body text-white/80 truncate">{s.title}</p>
                      <p className="text-[11px] font-body text-white/55 mt-0.5 truncate">{creatorName}</p>
                    </div>
                    <AddToCollectionButton songId={s.id} songTitle={s.title} />
                    <button type="button" onClick={() => navigate(`/song/${s.id}`)} className="p-2 rounded-lg bg-white/[0.06] text-white/40 hover:text-[#A78BFA] transition-all flex-shrink-0"><ExternalLink size={12} /></button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             SIGNALS TAB — Notifications inbox
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "signals" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-heading tracking-widest text-white/50">{(notifications as any[]).length} SIGNALS</span>
              {(notifications as any[]).some((n: any) => !n.isRead) && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] font-body px-3 py-1 rounded-lg transition-all"
                  style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#A78BFA" }}
                >
                  Mark all read
                </button>
              )}
            </div>
            {(notifications as any[]).length === 0 ? (
              <div className="text-center py-12">
                <Zap size={24} className="mx-auto mb-2 text-white/15" />
                <p className="text-white/50 font-body text-[12px]">No signals yet</p>
              </div>
            ) : (
              (notifications as any[]).map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border transition-all ${
                    n.isRead
                      ? "border-white/[0.04] bg-white/[0.01]"
                      : "border-[#A78BFA]/20 bg-[#A78BFA]/[0.04]"
                  }`}
                >
                  {/* Signal row */}
                  <div
                    className="flex items-start gap-3 p-3"
                    onClick={() => { if (!n.isRead) markOneRead.mutate({ id: n.id }); }}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? "bg-white/10" : "bg-[#A78BFA]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-body truncate ${n.isRead ? "text-white/50" : "text-white/80"}`}>{n.title}</p>
                      {n.body && <p className="text-[11px] font-body text-white/40 mt-0.5 line-clamp-2">{n.body}</p>}
                      {/* Track card — shown for any signal with a referenced song */}
                      {n.refId && n.refType === "song" && n.songTitle && (
                        <div
                          className="mt-2 flex items-center gap-2 rounded-lg overflow-hidden"
                          style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Cover art — links to song page */}
                          <Link href={`/song/${n.refId}`} className="flex-shrink-0 relative group">
                            <div className="w-10 h-10 bg-white/5 flex items-center justify-center overflow-hidden">
                              {n.songCoverArtUrl ? (
                                <img src={n.songCoverArtUrl} alt={n.songTitle} className="w-full h-full object-cover" />
                              ) : (
                                <Music size={14} className="text-white/50" />
                              )}
                            </div>
                          </Link>
                          {/* Title + artist */}
                          <div className="flex-1 min-w-0 py-1">
                            <Link href={`/song/${n.refId}`}>
                              <p className="text-[11px] font-body text-white/80 truncate hover:text-[#A78BFA] transition-colors leading-tight">{n.songTitle}</p>
                            </Link>
                            {n.songArtistName && (
                              <p className="text-[10px] font-body text-white/55 truncate leading-tight">{n.songArtistName}</p>
                            )}
                          </div>
                          {/* Play / Now-Playing indicator */}
                          {n.songFileUrl && (() => {
                            const isSignalActive = currentTrackId === String(n.refId);
                            const isSignalPlaying = isSignalActive && playerState.isPlaying;
                            return (
                              <button
                                onClick={() => {
                                  const track: Track = {
                                    id: String(n.refId),
                                    title: n.songTitle!,
                                    artist: n.songArtistName || "Unknown",
                                    genre: "",
                                    audioUrl: n.songFileUrl!,
                                    artUrl: n.songCoverArtUrl || undefined,
                                    creatorId: n.songCreatorId || undefined,
                                  };
                                  addAndPlay(track);
                                }}
                                className="flex-shrink-0 w-8 h-8 mr-1 flex items-center justify-center rounded-full transition-all hover:scale-105"
                                style={{
                                  background: isSignalActive ? "var(--ln-coal)" : "var(--ln-coal)",
                                  border: `1px solid ${isSignalActive ? "var(--ln-smoke)" : "var(--ln-coal)"}`,
                                }}
                                title={isSignalActive ? "Now playing" : "Play track"}
                              >
                                {isSignalPlaying ? (
                                  <div className="live-wave scale-75" style={{ "--gold": "var(--ln-gold)" } as React.CSSProperties}>
                                    <span /><span /><span /><span /><span />
                                  </div>
                                ) : isSignalActive ? (
                                  <div className="live-wave paused scale-75" style={{ "--gold": "var(--ln-gold)" } as React.CSSProperties}>
                                    <span /><span /><span /><span /><span />
                                  </div>
                                ) : (
                                  <Play size={12} className="text-[#A78BFA] ml-0.5" fill="#A78BFA" />
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      )}
                      {/* Reply button — only for comment signals that have a refId */}
                      {n.type === "comment" && n.refId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(replyingTo === n.id ? null : n.id);
                            setReplyText("");
                          }}
                          className="mt-1.5 text-[10px] font-body px-2 py-0.5 rounded-md transition-all"
                          style={{
                            background: replyingTo === n.id ? "var(--ln-coal)" : "var(--ln-coal)",
                            border: "1px solid #111009",
                            color: replyingTo === n.id ? "#A78BFA" : "var(--ln-smoke)",
                          }}
                        >
                          {replyingTo === n.id ? "Cancel" : "Reply"}
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] font-body text-white/45 flex-shrink-0">
                      {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {/* Inline reply box — expands when Reply is clicked */}
                  {replyingTo === n.id && (
                    <div
                      className="px-3 pb-3 flex flex-col gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${n.actorName || "this comment"}…`}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl text-[12px] font-body text-white/80 resize-none outline-none placeholder:text-white/40"
                        style={{
                          background: "var(--ln-coal)",
                          border: "1px solid #111009",
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            if (replyText.trim()) replyMutation.mutate({ notificationId: n.id, content: replyText.trim() });
                          }
                          if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-body text-white/45">Cmd+Enter to send</span>
                        <button
                          onClick={() => {
                            if (replyText.trim()) replyMutation.mutate({ notificationId: n.id, content: replyText.trim() });
                          }}
                          disabled={!replyText.trim() || replyMutation.isPending}
                          className="text-[11px] font-body px-3 py-1 rounded-lg transition-all disabled:opacity-40"
                          style={{
                            background: "var(--ln-coal)",
                            border: "1px solid #111009",
                            color: "#A78BFA",
                          }}
                        >
                          {replyMutation.isPending ? "Sending…" : "Send Reply"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             FIELD NOTES TAB — Creator journal / doctrine entries
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "field-notes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-heading tracking-widest text-white/50">{(myFieldNotes as any[]).length} NOTES</span>
              <button
                onClick={() => navigate("/field-notes")}
                className="text-[11px] font-body px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#A78BFA" }}
              >
                Open Field Notes
              </button>
            </div>
            {(myFieldNotes as any[]).length === 0 ? (
              <div className="text-center py-12">
                <ScrollText size={24} className="mx-auto mb-2 text-white/15" />
                <p className="text-white/50 font-body text-[12px]">No field notes yet</p>
                <button type="button" onClick={() => navigate("/field-notes")} className="text-[#A78BFA] hover:underline text-[12px] font-body mt-1">Write your first note</button>
              </div>
            ) : (
              (myFieldNotes as any[]).map((note: any) => (
                <div key={note.id} className="p-3 rounded-xl border border-white/[0.06] bg-[#111009] hover:border-white/[0.12] transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-body text-white/80 truncate">{note.title}</p>
                      <p className="text-[11px] font-body text-white/55 mt-0.5 line-clamp-2">{note.body?.slice(0, 120)}{note.body?.length > 120 ? "…" : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-body capitalize" style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)" }}>{note.category}</span>
                      <span className="text-[10px] font-body text-white/45">{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             TESTIMONY TAB — Immutable WID-TST creator statements
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === "testimony" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-[11px] font-heading tracking-widest text-white/50">{(myTestimonies as any[]).length} TESTIMONIES</span>
                <p className="text-[10px] font-body text-white/20 mt-0.5">Permanent, immutable statements of creator intent — each sealed with a WID-TST</p>
              </div>
              <button
                onClick={() => setShowAddTestimony(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body transition-all"
                style={{ background: "var(--ln-coal)", border: "1px solid #7A5A1E", color: "var(--ln-gold)" }}
              >
                <Fingerprint size={11} /> Add Testimony
              </button>
            </div>

            {/* Add Testimony Modal */}
            {showAddTestimony && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
                <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[16px] font-heading text-white">Add Testimony</h3>
                      <p className="text-[11px] font-body text-white/40 mt-0.5">This statement is permanent and cannot be edited after creation.</p>
                    </div>
                    <button type="button" onClick={() => setShowAddTestimony(false)} className="text-white/50 hover:text-white/70 transition-colors"><X size={18} /></button>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-[10px] font-heading tracking-widest text-white/40 block mb-1.5">YOUR TESTIMONY</label>
                    <textarea
                      value={testimonyContent}
                      onChange={e => setTestimonyContent(e.target.value)}
                      placeholder="State why this work exists, what it means, or what you want the world to know about your creation..."
                      rows={6}
                      maxLength={5000}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] font-body text-white/85 resize-none focus:outline-none focus:ring-1"
                      style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", caretColor: "var(--ln-gold)" }}
                    />
                    <div className="text-right text-[10px] font-body text-white/45 mt-1">{testimonyContent.length}/5000</div>
                  </div>

                  {/* Linked Works */}
                  <div>
                    <label className="text-[10px] font-heading tracking-widest text-white/40 block mb-1.5">LINKED WORK WIDs (optional)</label>
                    <input
                      type="text"
                      placeholder="WID-MUS-XXXXXXXX-YYYYYYYY (comma-separated)"
                      className="w-full rounded-xl px-3 py-2 text-[12px] font-body text-white/70 focus:outline-none focus:ring-1"
                      style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D" }}
                      onChange={e => {
                        const wids = e.target.value.split(",").map(w => w.trim()).filter(Boolean);
                        setTestimonyLinkedWorks(wids);
                      }}
                    />
                    <p className="text-[10px] font-body text-white/45 mt-1">Link this testimony to specific works by their Witness IDs</p>
                  </div>

                  {/* WID preview */}
                  <div className="rounded-xl p-3" style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}>
                    <div className="text-[10px] font-heading tracking-widest text-white/50 mb-1">WILL GENERATE</div>
                    <div className="font-mono text-[13px]" style={{ color: "var(--ln-gold)" }}>WID-TST-XXXXXXXX-YYYYYYYY</div>
                    <div className="text-[10px] font-body text-white/50 mt-0.5">A unique Witness ID sealed to your identity and this content</div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowAddTestimony(false)}
                      className="flex-1 py-2 rounded-xl text-[13px] font-body text-white/40 transition-all"
                      style={{ border: "1px solid #C49A28" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => createTestimonyMutation.mutate({ content: testimonyContent, linkedWorks: testimonyLinkedWorks.length > 0 ? testimonyLinkedWorks : undefined })}
                      disabled={testimonyContent.length < 10 || createTestimonyMutation.isPending}
                      className="flex-1 py-2 rounded-xl text-[13px] font-heading tracking-wide transition-all disabled:opacity-40"
                      style={{ background: "var(--ln-smoke)", color: "var(--ln-coal)" }}
                    >
                      {createTestimonyMutation.isPending ? "Witnessing…" : "Seal Testimony"}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* Testimony list */}
            {(myTestimonies as any[]).length === 0 ? (
              <div className="text-center py-14">
                <Fingerprint size={28} className="mx-auto mb-3 text-white/15" />
                <p className="text-white/50 font-body text-[13px] mb-1">No testimonies yet</p>
                <p className="text-[11px] font-body text-white/20 mb-4 max-w-xs mx-auto">A testimony is a permanent statement of why your work exists. It cannot be changed — only added to.</p>
                <button
                  onClick={() => setShowAddTestimony(true)}
                  className="text-[#C49A28] hover:underline text-[12px] font-body"
                >
                  Add your first testimony
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(myTestimonies as any[]).map((t: any) => (
                  <div key={t.id} className="p-4 rounded-xl border border-white/[0.06] bg-[#111009] hover:border-white/[0.12] transition-all">
                    {/* WID badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-mono text-[10px] px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: "var(--ln-coal)", color: "var(--ln-gold)", border: "1px solid #7A5A1E" }}
                        onClick={() => { navigator.clipboard.writeText(t.wid); toast.success("WID-TST copied!"); }}
                        title="Click to copy WID"
                      >
                        {t.wid}
                      </span>
                      <span className="text-[10px] font-body text-white/45">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    {/* Content */}
                    <p className="text-[13px] font-body text-white/75 leading-relaxed whitespace-pre-wrap">{t.content}</p>
                    {/* Linked works */}
                    {t.linkedWorks && (t.linkedWorks as string[]).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(t.linkedWorks as string[]).map((wid: string) => (
                          <span key={wid} className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid #111009" }}>{wid}</span>
                        ))}
                      </div>
                    )}
                    {/* Immutability notice */}
                    <div className="mt-2 flex items-center gap-1">
                      <Shield size={9} className="text-white/20" />
                      <span className="text-[9px] font-body text-white/20">Immutable — sealed at creation</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings utility bar ── */}
        <div className="mt-8 pb-8">
          <div className="text-[10px] font-heading tracking-widest text-white/20 mb-3">SETTINGS</div>
          {/* ── Lights On / Lights Dim toggle ────────────────────────────────── */}
          <div className="mb-4 flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
            <div>
              <div className="text-[12px] font-heading tracking-wide" style={{ color: "var(--ln-gold)" }}>
                {lightsMode === 'on' ? '☀️ Lights On' : '🌙 Lights Dim'}
              </div>
              <div className="text-[10px] font-body mt-0.5" style={{ color: "var(--ln-smoke)" }}>
                {lightsMode === 'on'
                  ? 'Espresso Crème — warm cream palette for all visitors'
                  : 'Lantern Mode — charred oak dark palette for all visitors'}
              </div>
            </div>
            <button
              onClick={handleLightsToggle}
              disabled={setLightsModeMutation.isPending}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all disabled:opacity-60"
              style={{
                background: lightsMode === 'on'
                  ? "rgba(170,142,100,0.2)"
                  : "var(--ln-gold)",
                border: lightsMode === 'on'
                  ? "1px solid rgba(170,142,100,0.5)"
                  : "1px solid #111009",
                color: lightsMode === 'on' ? "var(--ln-smoke)" : "var(--ln-smoke)",
              }}
            >
              {setLightsModeMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : lightsMode === 'on' ? (
                <><Moon size={12} /> Switch to Dim</>
              ) : (
                <><Sun size={12} /> Switch to On</>
              )}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/redeem")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body transition-all"
              style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-gold)" }}
            >
              <Zap size={11} /> Redeem Code
            </button>
            <button
              onClick={() => navigate("/learn")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body transition-all"
              style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-smoke)" }}
            >
              <ScrollText size={11} /> WID Spec &amp; Lexicon
            </button>
            <button
              onClick={() => navigate("/founders")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body transition-all"
              style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-smoke)" }}
            >
              <Star size={11} /> Founders
            </button>
          </div>
          {/* ── Data Rights ─────────────────────────────────────── */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #C49A28" }}>
            <div className="text-[10px] font-heading tracking-widest text-white/20 mb-3">DATA RIGHTS</div>
            <p className="text-[11px] font-body text-white/55 mb-3 leading-relaxed">
              Per our Privacy Policy, you have the right to export your data or request account deletion. Deletion requests are processed within 90 days.
            </p>
            <div className="flex flex-wrap gap-2">
              <ExportDataButton />
              <RequestDeletionButton />
            </div>
          </div>

          <div className="flex justify-start mt-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-white/20 hover:text-white/45 hover:bg-white/[0.04] text-[12px] font-body"
            >
              <LogOut size={12} />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Socials editor sub-component ─────────────────────────────── */
function SocialsEditor({
  twitter, instagram, youtube, onSave
}: {
  twitter: string; instagram: string; youtube: string;
  onSave: (t: string, i: string, y: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(twitter);
  const [i, setI] = useState(instagram);
  const [y, setY] = useState(youtube);

  useEffect(() => { setT(twitter); setI(instagram); setY(youtube); }, [twitter, instagram, youtube]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body
          bg-[#111009] border border-white/[0.06] text-white/70
          hover:border-[#A78BFA]/30 hover:text-[#A78BFA] transition-all"
      >
        <Edit2 size={10} /> Edit Socials
      </button>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-2 gap-2 w-full">
      {([
        { key: "twitter", val: t, set: setT, placeholder: "Twitter handle" },
        { key: "instagram", val: i, set: setI, placeholder: "Instagram handle" },
        { key: "youtube", val: y, set: setY, placeholder: "YouTube handle" },
      ] as const).map(({ key, val, set, placeholder }) => (
        <input
          key={key}
          value={val}
          onChange={e => set(e.target.value)}
          placeholder={placeholder}
          className="px-3 py-1.5 rounded-lg text-[12px] font-body text-white/70
            bg-[#111009] border border-white/[0.08] outline-none
            focus:border-[#A78BFA]/50 placeholder:text-white/60"
        />
      ))}
      <div className="col-span-2 flex gap-2">
        <button
          onClick={() => { onSave(t, i, y); setEditing(false); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-[#1C1A14]/10 border border-[#C49A28]/30 text-[#C49A28]"
        >
          <Check size={12} /> Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.04] border border-white/[0.08] text-white/40"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Data Rights sub-components ──────────────────────────────────── */

function ExportDataButton() {
  const exportQuery = trpc.onboarding.exportData.useQuery(undefined, { enabled: false });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportQuery.refetch();
      if (data.data) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `living-nexus-data-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data export downloaded");
      }
    } catch {
      toast.error("Export failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body transition-all disabled:opacity-50"
      style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-seal-bright)" }}
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
      Export My Data
    </button>
  );
}

function RequestDeletionButton() {
  const [confirming, setConfirming] = useState(false);
  const deleteMutation = trpc.onboarding.requestDeletion.useMutation({
    onSuccess: () => {
      toast.success("Deletion request submitted. We will process it within 90 days.");
      setConfirming(false);
    },
    onError: () => toast.error("Failed to submit deletion request — please try again"),
  });

  if (confirming) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-body"
        style={{ background: "var(--ln-coal)", border: "1px solid #EF4444", color: "var(--ln-ember)" }}
      >
        <AlertTriangle size={11} />
        <span>Confirm deletion request?</span>
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="underline hover:no-underline"
        >
          {deleteMutation.isPending ? "Submitting…" : "Yes, submit"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-white/40 hover:text-white/60 ml-1">
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body transition-all"
      style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-smoke)" }}
    >
      <Trash2 size={11} /> Request Account Deletion
    </button>
  );
}
