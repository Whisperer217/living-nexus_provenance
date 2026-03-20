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
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

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
              placeholder:text-white/20"
            autoFocus
          />
        ) : (
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-xl text-[13px] font-body text-white/80
              bg-[oklch(0.14_0.013_280)] border border-[#A78BFA]/50 outline-none
              placeholder:text-white/20"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
        )}
        <button onClick={save} className="p-2 text-[#E8C547] hover:text-[#E8C547]/80 flex-shrink-0">
          <Check size={14} />
        </button>
        <button onClick={cancel} className="p-2 text-white/30 hover:text-white/60 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setEditing(true)}>
      <span className={`text-[13px] font-body ${value ? "text-white/60" : "text-white/20 italic"}`}>
        {value || placeholder}
      </span>
      <Edit2 size={11} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

/* ── Main ProfilePage ──────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Load full profile from DB
  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: !!user,
  });

  // Load user's songs from DB
  const { data: dbSongs = [] } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
  });

  const [activeTab, setActiveTab] = useState<"tracks" | "stats">("tracks");

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
    onSuccess: () => {
      utils.profile.me.invalidate();
      toast.success("Banner updated");
    },
    onError: () => toast.error("Failed to upload banner"),
  });

  // ── File refs ────────────────────────────────────────────────────
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

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
    const base64 = await toBase64(f);
    uploadBanner.mutate({ base64, mimeType: f.type });
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
        <a href={getLoginUrl()} className="px-5 py-2.5 rounded-xl bg-[#E8C547]/10 border border-[#E8C547]/30 text-[#E8C547] font-heading text-[13px] tracking-wider hover:bg-[#E8C547]/20 transition-all">
          Sign In
        </a>
      </div>
    );
  }

  const artistName = profile?.artistHandle || profile?.name || user.name || "Artist";
  const totalPlays = dbSongs.reduce((sum: number, s: any) => sum + (s.playCount || 0), 0);

  return (
    <div className="animate-fade-up pb-4">
      {/* ── Banner ── */}
      <div className="relative h-[200px] overflow-hidden group">
        {profile?.bannerUrl ? (
          <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full"
            style={{ background: "linear-gradient(135deg, oklch(0.11 0.05 270), oklch(0.15 0.05 275), oklch(0.14 0.013 295))" }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #E8C547 0%, transparent 60%), radial-gradient(circle at 70% 30%, #7C3AED 0%, transparent 50%)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-transparent to-transparent" />
        <button
          onClick={() => bannerRef.current?.click()}
          disabled={uploadBanner.isPending}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-black/50 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white
            text-[11px] font-body opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
        >
          {uploadBanner.isPending ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          {uploadBanner.isPending ? "Uploading…" : "Change Banner"}
        </button>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
      </div>

      <div className="px-6">
        {/* ── Avatar + Name row ── */}
        <div className="flex items-end gap-4 -mt-12 mb-5">
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-[#E8C547]/30 overflow-hidden
              bg-[oklch(0.14_0.013_280)] flex items-center justify-center">
              {profile?.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <img src={LOGO_URL} alt="LN" className="w-14 h-14 object-contain opacity-60" />
              )}
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
            >
              {uploadAvatar.isPending
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Camera size={18} className="text-white" />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1">
              <EditableField
                label="Artist Name"
                value={profile?.name || ""}
                onSave={v => save({ name: v })}
                placeholder="Your artist name"
              />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8C547]/10 border border-[#E8C547]/20 text-[#E8C547] font-heading tracking-wider flex-shrink-0">
                ARTIST
              </span>
            </div>
            <div className="flex items-center gap-3">
              {profile?.location && (
                <div className="flex items-center gap-1 text-[11px] text-white/30">
                  <MapPin size={10} />
                  <span>{profile.location}</span>
                </div>
              )}
              <button
                onClick={copyProfileLink}
                className="flex items-center gap-1 text-[11px] text-[#A78BFA]/60 hover:text-[#A78BFA] transition-colors"
              >
                <Share2 size={10} />
                <span>Share Profile</span>
              </button>
            </div>
          </div>

          <button
            onClick={copyProfileLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-body
              bg-[oklch(0.14_0.013_280)] border border-white/[0.08] text-white/50
              hover:border-[#E8C547]/30 hover:text-[#E8C547] transition-all"
          >
            <Copy size={12} /> Copy Link
          </button>
        </div>

        {/* ── Artist Handle ── */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-[11px] text-white/25 font-body">@</span>
          <EditableField
            label="Artist Handle"
            value={profile?.artistHandle || ""}
            onSave={v => save({ artistHandle: v })}
            placeholder="artist-handle"
          />
        </div>

        {/* ── Bio ── */}
        <div className="mb-4">
          <EditableField
            label="Bio"
            value={profile?.bio || ""}
            onSave={v => save({ bio: v })}
            multiline
            placeholder="Tell the world about your music…"
          />
        </div>

        {/* ── Location + Website ── */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-white/25" />
            <EditableField
              label="Location"
              value={profile?.location || ""}
              onSave={v => save({ location: v })}
              placeholder="Add location"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-white/25" />
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

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Tracks", value: dbSongs.length, icon: Music, color: "#A78BFA" },
            { label: "Plays", value: totalPlays >= 1000 ? `${(totalPlays/1000).toFixed(1)}k` : totalPlays, icon: TrendingUp, color: "#E8C547" },
            { label: "Tips", value: `$0`, icon: DollarSign, color: "#4ade80" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1 p-3 rounded-xl
                bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                <Icon size={14} style={{ color: s.color }} />
                <span className="text-[15px] font-heading text-white/90">{s.value}</span>
                <span className="text-[10px] font-body text-white/30">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 border-b border-white/[0.07]">
          {(["tracks","stats"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[12px] font-heading tracking-wider capitalize transition-all border-b-2 -mb-px
                ${activeTab === tab
                  ? "border-[#E8C547] text-[#E8C547]"
                  : "border-transparent text-white/35 hover:text-white/60"
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
              <div className="text-center py-12 text-white/25 font-body text-[13px]">
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
                      ? <img src={song.coverArtUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white/20"><Music size={16} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-body text-white/85 truncate">{song.title}</span>
                      {song.genre && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/30 font-body flex-shrink-0">
                          {song.genre}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-body flex-shrink-0 ${
                        song.status === "Published" ? "bg-green-500/10 text-green-400" :
                        song.status === "Draft" ? "bg-amber-500/10 text-amber-400" :
                        "bg-white/[0.05] text-white/30"
                      }`}>{song.status || "Published"}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-white/25 font-body">
                        {(song.playCount || 0).toLocaleString()} plays
                      </span>
                      {song.createdAt && (
                        <span className="text-[11px] text-white/20 font-body">
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
                      className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#E8C547] hover:bg-white/[0.1] transition-all"
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

        {/* ── Stats tab ── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Plays", value: totalPlays.toLocaleString(), sub: "across all tracks", color: "#E8C547" },
                { label: "Tracks Published", value: dbSongs.filter((s: any) => s.status === "Published").length, sub: "live on Explore", color: "#A78BFA" },
                { label: "Tracks in Draft", value: dbSongs.filter((s: any) => s.status === "Draft").length, sub: "not yet published", color: "#fb923c" },
                { label: "Total Tracks", value: dbSongs.length, sub: "in your archive", color: "#4ade80" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
                  <div className="text-[22px] font-heading mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[12px] font-body text-white/70">{s.label}</div>
                  <div className="text-[11px] font-body text-white/25 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[oklch(0.14_0.013_280)] border border-white/[0.06]">
              <div className="text-[12px] font-heading tracking-wider text-white/40 mb-3">Top Tracks by Plays</div>
              {[...(dbSongs as any[])].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-[12px] font-heading text-white/20 w-4">{i + 1}</span>
                  <span className="flex-1 text-[12px] font-body text-white/60 truncate">{s.title}</span>
                  <span className="text-[12px] font-body text-[#E8C547]/60">{(s.playCount || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
          bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/30
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
            focus:border-[#A78BFA]/50 placeholder:text-white/20"
        />
      ))}
      <div className="col-span-2 flex gap-2">
        <button
          onClick={() => { onSave(t, i, y); setEditing(false); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-[#E8C547]/10 border border-[#E8C547]/30 text-[#E8C547]"
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
