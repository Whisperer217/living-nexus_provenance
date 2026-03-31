/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ProfilePage
   Fully DB-backed: loads profile from trpc.profile.me, saves via
   trpc.profile.update / uploadAvatar / uploadBanner mutations.
   All changes persist across logout/login.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Camera, Edit2, Check, X, Music, Heart, DollarSign,
  MapPin, Globe, Twitter, Instagram, Youtube, Share2,
  Play, ExternalLink, Copy, TrendingUp, Loader2,
  CheckCircle, AlertCircle, Zap, LogOut,
  Fingerprint, ScrollText, Activity, Upload, Star, Layers, Eye, Users,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { ImagePositioner } from "@/components/ImagePositioner";
import SupporterBadge from "@/components/SupporterBadge";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

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
            onChange={e => setVal(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-xl text-[13px] font-body text-white/80
              bg-[oklch(0.14_0.013_280)] border border-[#A78BFA]/50 outline-none resize-none
              placeholder:text-white/60"
            autoFocus
          />
        ) : (
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-xl text-[13px] font-body text-white/80
              bg-[oklch(0.14_0.013_280)] border border-[#A78BFA]/50 outline-none
              placeholder:text-white/60"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
        )}
        <button onClick={save} className="p-2 text-[#D4AF37] hover:text-[#D4AF37]/80 flex-shrink-0">
          <Check size={14} />
        </button>
        <button onClick={cancel} className="p-2 text-white/70 hover:text-white/60 flex-shrink-0">
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

/* ── Main ProfilePage ──────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  };

  // Load full profile from DB
  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: !!user,
  });

  // Load user's songs from DB
  const { data: dbSongs = [] } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
  });

  const [activeTab, setActiveTab] = useState<"tracks" | "stats" | "activity" | "payments" | "network">("tracks");

  // ── Identity data ────────────────────────────────────────────────
  const { data: myStats } = trpc.profile.myStats.useQuery(undefined, { enabled: !!user });
  const { data: myActivity = [] } = trpc.profile.myActivity.useQuery({ limit: 20 }, { enabled: !!user && activeTab === "activity" });
  const { data: witnessNetwork } = trpc.witness.network.useQuery(undefined, { enabled: !!user && activeTab === "network" });

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
        <a href={getLoginUrl()} className="px-5 py-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-heading text-[13px] tracking-wider hover:bg-[#D4AF37]/20 transition-all">
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
        className="relative h-[200px] group"
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
              background: "linear-gradient(135deg, oklch(0.10 0.03 270), oklch(0.12 0.04 280))",
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
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[oklch(0.08_0.01_280)] to-transparent pointer-events-none" />
        )}
        {/* Gold corner accents */}
        <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none" style={{ borderTop: "2px solid #c9a84c", borderLeft: "2px solid #c9a84c" }} />
        <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none" style={{ borderTop: "2px solid #c9a84c", borderRight: "2px solid #c9a84c" }} />
        <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none" style={{ borderBottom: "2px solid #c9a84c", borderLeft: "2px solid #c9a84c" }} />
        <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" style={{ borderBottom: "2px solid #c9a84c", borderRight: "2px solid #c9a84c" }} />
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
          background: "oklch(0.09 0.04 265)",
          borderBottom: "1px solid oklch(0.14 0.012 280)",
        }}
      >
        <div className="px-6">
          <div className="flex items-start gap-5 py-5">

            {/* ── Avatar — anchored left, slight pull-up ── */}
            <div className="-mt-12 flex-shrink-0">
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-2xl overflow-hidden bg-[oklch(0.14_0.013_280)] flex items-center justify-center"
                  style={{
                    outline: "3px solid oklch(0.09 0.04 265)",
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
                      className="flex items-center gap-1 text-white/70 hover:text-[#D4AF37] text-[10px] font-body transition-colors"
                    >
                      <Edit2 size={12} />
                      <span>Adjust</span>
                    </button>
                  )}
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>

              {/* Avatar inline repositioner */}
              {showAvatarPositioner && profile?.profilePhotoUrl && (
                <div className="mt-2 w-64">
                  <ImagePositioner
                    imageUrl={profile.profilePhotoUrl}
                    initialX={avatarPos.x}
                    initialY={avatarPos.y}
                    initialZoom={110}
                    previewHeight="8rem"
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
                <span className="text-[9px] px-1.5 py-0.5 rounded tracking-widest font-mono flex-shrink-0"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "#D4AF37" }}
                >
                  ARTIST
                </span>
              </div>
              {/* Handle */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px] text-white/40 font-body">@</span>
                <EditableField
                  label="Artist Handle"
                  value={profile?.artistHandle || ""}
                  onSave={v => save({ artistHandle: v })}
                  placeholder="artist-handle"
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
                <span className="text-[11px]" style={{ color: "oklch(0.5 0.03 280)" }}>
                  <span style={{ color: "oklch(0.75 0.03 280)", fontVariantNumeric: "tabular-nums" }}>{dbSongs.length}</span>
                  {" "}tracks
                </span>
                {totalPlays > 0 && (
                  <span className="text-[11px]" style={{ color: "oklch(0.5 0.03 280)" }}>
                    <span style={{ color: "oklch(0.75 0.03 280)", fontVariantNumeric: "tabular-nums" }}>
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.5 0.03 280)", background: "transparent" }}
                  title="Copy profile link"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={copyProfileLink}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.5 0.03 280)", background: "transparent" }}
                  title="Share profile"
                >
                  <Share2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit fields section — below header, inside page body ── */}
      <div className="px-6 pt-5">

        {/* ── Creator Defaults: AI Disclosure + Primary Genre ── */}
        <div className="mb-4 p-4 rounded-xl border border-white/[0.07] bg-[oklch(0.11_0.012_280)]">
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#E2E8F0", fontFamily: "'Cinzel', serif" }}>
            Creator Defaults — applied to every upload
          </p>
          <div className="flex flex-wrap gap-4">
            {/* AI Disclosure */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-[11px] text-white/70 font-body">AI Disclosure</label>
              <select
                value={profile?.aiDisclosure || "original"}
                onChange={e => save({ aiDisclosure: e.target.value as "original" | "ai_assisted" | "ai_generated" })}
                className="px-3 py-2 rounded-lg text-[13px] font-body text-white/80 bg-[oklch(0.14_0.013_280)] border border-white/[0.1] outline-none cursor-pointer hover:border-[#A78BFA]/50 transition-colors"
                style={{ background: "oklch(0.14 0.013 280)" }}
              >
                <option value="original">Original — Human-created</option>
                <option value="ai_assisted">AI-Assisted — Human + AI</option>
                <option value="ai_generated">AI-Generated — AI-created</option>
              </select>
            </div>
            {/* Primary Genre */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <label className="text-[11px] text-white/70 font-body">Primary Genre / Style</label>
              <input
                type="text"
                defaultValue={profile?.primaryGenre || ""}
                placeholder="e.g. Gospel, Hip-Hop, Ambient…"
                maxLength={64}
                className="px-3 py-2 rounded-lg text-[13px] font-body text-white/80 bg-[oklch(0.14_0.013_280)] border border-white/[0.1] outline-none placeholder:text-white/60 hover:border-[#A78BFA]/50 focus:border-[#A78BFA]/70 transition-colors"
                onBlur={e => { const v = e.target.value.trim(); if (v !== (profile?.primaryGenre || "")) save({ primaryGenre: v }); }}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
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
              className="p-2 rounded-lg bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/40 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30 transition-all">
              <Twitter size={14} />
            </a>
          )}
          {profile?.instagramHandle && (
            <a href={`https://instagram.com/${profile.instagramHandle}`} target="_blank" rel="noreferrer"
              className="p-2 rounded-lg bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/40 hover:text-[#E1306C] hover:border-[#E1306C]/30 transition-all">
              <Instagram size={14} />
            </a>
          )}
          {profile?.youtubeHandle && (
            <a href={`https://youtube.com/@${profile.youtubeHandle}`} target="_blank" rel="noreferrer"
              className="p-2 rounded-lg bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/40 hover:text-[#FF0000] hover:border-[#FF0000]/30 transition-all">
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

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 border-b border-white/[0.07]">
          {(["tracks","activity","network","stats","payments"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[12px] font-heading tracking-wider capitalize transition-all border-b-2 -mb-px
                ${activeTab === tab
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-white/75 hover:text-white/60"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tracks tab ── */}
        {activeTab === "tracks" && (
          <div className="space-y-3">
            {dbSongs.length === 0 ? (
              <div className="text-center py-12 text-white/65 font-body text-[13px]">
                No tracks yet.{" "}
                <button onClick={() => navigate("/upload")} className="text-[#A78BFA] hover:underline">
                  Upload your first track
                </button>
              </div>
            ) : (
              (dbSongs as any[]).map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06]
                    bg-[oklch(0.14_0.013_280)] hover:border-white/[0.12] transition-all group"
                >
                  <div className="w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden bg-[oklch(0.15_0.05_275)]">
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${(song as any).coverPositionX ?? 50}% ${(song as any).coverPositionY ?? 50}%` }} />
                      : <div className="w-full h-full flex items-center justify-center text-white/60"><Music size={16} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Title + status on first line — genre removed so title never gets pushed off on mobile */}
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-body text-white/85 truncate flex-1 min-w-0">{song.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-body flex-shrink-0 ${
                        song.status === "Published" ? "bg-green-500/10 text-green-400" :
                        song.status === "Draft" ? "bg-amber-500/10 text-amber-400" :
                        "bg-white/[0.05] text-white/70"
                      }`}>{song.status || "Published"}</span>
                    </div>
                    {/* Genre + plays + date on second line */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {song.genre && (
                        <span className="text-[10px] text-white/50 font-body truncate max-w-[160px]">{song.genre}</span>
                      )}
                      <span className="text-[10px] text-white/40 font-body flex-shrink-0">
                        {(song.playCount || 0).toLocaleString()} plays
                      </span>
                      {song.createdAt && (
                        <span className="text-[10px] text-white/35 font-body flex-shrink-0">
                          {new Date(song.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/song/${song.id}`)}
                      className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#A78BFA] hover:bg-white/[0.1] transition-all"
                      title="Open song page"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/song/${song.id}`;
                        navigator.clipboard.writeText(url).then(() => toast.success("Song link copied!"));
                      }}
                      className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#D4AF37] hover:bg-white/[0.1] transition-all"
                      title="Copy song link"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Activity tab ── */}
        {activeTab === "activity" && (
          <div className="space-y-2">
            {myActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity size={28} className="mx-auto mb-3 text-white/15" />
                <p className="text-white/40 font-body text-[13px]">No activity yet</p>
                <p className="text-white/25 font-body text-[11px] mt-1">Upload a track or register a WID to start your provenance record</p>
              </div>
            ) : (
              (myActivity as any[]).map((evt) => {
                const iconMap: Record<string, { icon: any; color: string; label: string }> = {
                  TIP: { icon: DollarSign, color: "#4ade80", label: "Gift received" },
                  COMMENT: { icon: ScrollText, color: "#A78BFA", label: "Comment" },
                  LIKE: { icon: Heart, color: "#f472b6", label: "Like" },
                  WITNESS_REGISTERED: { icon: Fingerprint, color: "#D4AF37", label: "WID Registered" },
                  WITNESS_VERIFIED: { icon: CheckCircle, color: "#D4AF37", label: "WID Verified" },
                  WORK_REFERENCED: { icon: Layers, color: "#fb923c", label: "Work Referenced" },
                  SYSTEM_UPDATE: { icon: Zap, color: "#60a5fa", label: "System Update" },
                  PRESERVATION_MODE: { icon: Star, color: "#D4AF37", label: "Preservation Mode" },
                };
                const meta = iconMap[evt.type] ?? { icon: Activity, color: "#A78BFA", label: evt.type };
                const Icon = meta.icon;
                return (
                  <div key={evt.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                      <Icon size={13} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-body text-white/75">{meta.label}</span>
                        {evt.songTitle && (
                          <span className="text-[11px] font-body text-white/40 truncate">— {evt.songTitle}</span>
                        )}
                      </div>
                      {evt.actorName && (
                        <span className="text-[11px] font-body text-white/35">by {evt.actorName}</span>
                      )}
                      {evt.payload?.amountCents && (
                        <span className="text-[11px] font-body" style={{ color: "#4ade80" }}>
                          {" "}${((evt.payload.amountCents as number) / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {evt.songCoverArtUrl && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden mb-1">
                          <img src={evt.songCoverArtUrl} alt="" className="w-full h-full object-cover object-top" />
                        </div>
                      )}
                      <span className="text-[10px] font-body text-white/25">
                        {new Date(evt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Payments / Stripe Connect tab ── */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="p-5 rounded-2xl border" style={{ background: "oklch(0.12 0.055 280)", borderColor: "oklch(0.25 0.05 280)" }}>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-[#D4AF37]" />
                <span className="font-heading text-[14px] text-white/90 tracking-wide">Stripe Connect</span>
              </div>

              {/* Status badge */}
              {connectData?.status === "enabled" && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: "oklch(0.65 0.18 145 / 0.12)", border: "1px solid oklch(0.65 0.18 145 / 0.3)" }}>
                  <CheckCircle size={14} style={{ color: "oklch(0.65 0.18 145)" }} />
                  <span className="text-[13px] font-body" style={{ color: "oklch(0.65 0.18 145)" }}>Active — Tips &amp; Jukebox payments enabled</span>
                </div>
              )}
              {connectData?.status === "pending" && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: "oklch(0.65 0.18 45 / 0.12)", border: "1px solid oklch(0.65 0.18 45 / 0.3)" }}>
                  <AlertCircle size={14} style={{ color: "oklch(0.65 0.18 45)" }} />
                  <span className="text-[13px] font-body" style={{ color: "oklch(0.65 0.18 45)" }}>Pending — Complete Stripe verification to activate</span>
                </div>
              )}
              {(!connectData?.status || connectData.status === "not_connected" || connectData.status === "error") && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: "oklch(0.5 0.03 280 / 0.15)", border: "1px solid oklch(0.5 0.03 280 / 0.3)" }}>
                  <Zap size={14} className="text-white/70" />
                  <span className="text-[13px] font-body text-white/40">Not Connected</span>
                </div>
              )}

              <p className="text-[12px] font-body text-white/40 mb-4 leading-relaxed">
                Connect your Stripe account to receive jukebox tips and direct fan tips.
                You keep <strong className="text-white/70">90%</strong> of every gift — 10% goes to the platform.
              </p>

              {connectData?.status === "enabled" ? (
                <button
                  onClick={() => connectMutation.mutate({ returnUrl: `${window.location.origin}/profile` })}
                  disabled={connectMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-body
                    text-white/60 hover:text-white border border-white/[0.1] hover:border-white/[0.2] transition-all disabled:opacity-50"
                >
                  {connectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                  Manage Stripe Account
                </button>
              ) : (
                <button
                  onClick={() => connectMutation.mutate({ returnUrl: `${window.location.origin}/profile` })}
                  disabled={connectMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-body
                    font-medium text-black transition-all hover:-translate-y-0.5 disabled:opacity-50
                    hover:shadow-[0_4px_20px_rgba(232,197,71,0.25)]"
                  style={{ background: "linear-gradient(135deg, #D4AF37, #D4AF37)" }}
                >
                  {connectMutation.isPending
                    ? <><Loader2 size={13} className="animate-spin" /> Connecting…</>
                    : connectData?.status === "pending"
                      ? <><AlertCircle size={13} /> Continue Stripe Setup</>
                      : <><Zap size={13} /> Connect Stripe</>}
                </button>
              )}
            </div>

            {/* Fee breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Your Cut", value: "90%", sub: "of every gift", color: "#D4AF37" },
                { label: "Platform Fee", value: "10%", sub: "keeps the lights on", color: "#A78BFA" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                  <div className="text-[22px] font-heading mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[12px] font-body text-white/70">{s.label}</div>
                  <div className="text-[11px] font-body text-white/65 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Witness Network tab ── */}
        {activeTab === "network" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                <div className="text-[22px] font-heading mb-1" style={{ color: "#D4AF37" }}>{witnessNetwork?.witnessing?.length ?? 0}</div>
                <div className="text-[12px] font-body text-white/70">Witnessing</div>
                <div className="text-[11px] font-body text-white/40 mt-0.5">creators you witness</div>
              </div>
              <div className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                <div className="text-[22px] font-heading mb-1" style={{ color: "#A78BFA" }}>{witnessNetwork?.witnessedBy?.length ?? 0}</div>
                <div className="text-[12px] font-body text-white/70">Witnesses</div>
                <div className="text-[11px] font-body text-white/40 mt-0.5">creators witnessing you</div>
              </div>
            </div>
            <div>
              <div className="text-[12px] font-heading tracking-wider text-white/40 mb-3 flex items-center gap-2">
                <Eye size={12} /> WITNESSING
              </div>
              {!witnessNetwork?.witnessing?.length ? (
                <div className="text-center py-8">
                  <Users size={28} className="mx-auto mb-3 text-white/15" />
                  <p className="text-white/40 font-body text-[13px]">You haven't witnessed any creators yet</p>
                  <p className="text-white/25 font-body text-[11px] mt-1">Visit a creator's profile and click Witness to add them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(witnessNetwork?.witnessing ?? []).map((creator: any) => (
                    <div key={creator.id} className="flex items-center gap-3 p-3 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, oklch(0.2 0.04 280), oklch(0.25 0.06 300))" }}>
                        {creator.profilePhotoUrl ? <img src={creator.profilePhotoUrl} alt={creator.name} className="w-full h-full object-cover object-top" /> : (creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-heading truncate" style={{ color: "oklch(0.9 0.02 85)" }}>{creator.artistHandle || creator.name}</p>
                        <p className="text-[11px] font-body text-white/40">{creator.songCount ?? 0} tracks</p>
                      </div>
                      <a href={`/creator/${creator.id}`} className="text-[11px] font-body px-2 py-1 rounded-lg hover:bg-white/[0.06] transition-colors" style={{ color: "oklch(0.84 0.155 85)" }}>View</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-heading tracking-wider text-white/40 mb-3 flex items-center gap-2">
                <Users size={12} /> MY WITNESSES
              </div>
              {!witnessNetwork?.witnessedBy?.length ? (
                <div className="text-center py-6">
                  <p className="text-white/40 font-body text-[13px]">No witnesses yet</p>
                  <p className="text-white/25 font-body text-[11px] mt-1">Share your profile to grow your witness network</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(witnessNetwork?.witnessedBy ?? []).map((creator: any) => (
                    <div key={creator.id} className="flex items-center gap-3 p-3 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, oklch(0.2 0.04 280), oklch(0.25 0.06 300))" }}>
                        {creator.profilePhotoUrl ? <img src={creator.profilePhotoUrl} alt={creator.name} className="w-full h-full object-cover object-top" /> : (creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-heading truncate" style={{ color: "oklch(0.9 0.02 85)" }}>{creator.artistHandle || creator.name}</p>
                        <p className="text-[11px] font-body text-white/40">{creator.songCount ?? 0} tracks</p>
                      </div>
                      <a href={`/creator/${creator.id}`} className="text-[11px] font-body px-2 py-1 rounded-lg hover:bg-white/[0.06] transition-colors" style={{ color: "oklch(0.84 0.155 85)" }}>View</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Stats tab ── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Plays", value: totalPlays.toLocaleString(), sub: "across all tracks", color: "#D4AF37" },
                { label: "Tracks Published", value: dbSongs.filter((s: any) => s.status === "Published").length, sub: "live on Explore", color: "#A78BFA" },
                { label: "Tracks in Draft", value: dbSongs.filter((s: any) => s.status === "Draft").length, sub: "not yet published", color: "#fb923c" },
                { label: "Total Tracks", value: dbSongs.length, sub: "in your archive", color: "#4ade80" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                  <div className="text-[22px] font-heading mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[12px] font-body text-white/70">{s.label}</div>
                  <div className="text-[11px] font-body text-white/65 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
              <div className="text-[12px] font-heading tracking-wider text-white/40 mb-3">Top Tracks by Plays</div>
              {[...(dbSongs as any[])].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-[12px] font-heading text-white/60 w-4">{i + 1}</span>
                  <span className="flex-1 text-[12px] font-body text-white/60 truncate">{s.title}</span>
                  <span className="text-[12px] font-body text-[#D4AF37]/60">{(s.playCount || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log Out — bottom of profile, subtle utility */}
        <div className="mt-8 pb-8 flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-white/25 hover:text-white/50 hover:bg-white/[0.04] text-[13px] font-body"
          >
            <LogOut size={13} />
            Log Out
          </button>
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
          bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/70
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
            bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
            focus:border-[#A78BFA]/50 placeholder:text-white/60"
        />
      ))}
      <div className="col-span-2 flex gap-2">
        <button
          onClick={() => { onSave(t, i, y); setEditing(false); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]"
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
