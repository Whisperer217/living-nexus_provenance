/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ProfilePage
   Divine Noir: Full artist showroom — customizable banner, bio, social links,
   tip jar, track showcase with unique links, stats
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { usePlayer, DEMO_TRACKS } from "@/contexts/PlayerContext";
import { useLocation } from "wouter";
import {
  Camera, Edit2, Check, X, Music, Heart, DollarSign,
  MapPin, Globe, Twitter, Instagram, Youtube, Share2,
  Play, ExternalLink, Copy, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

const TIP_AMOUNTS = [1, 3, 5, 10, 25, 50];

function TipJar({ artistName, onTip }: { artistName: string; onTip: (amt: number) => void }) {
  const [custom, setCustom] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const handleTip = () => {
    const amt = selected ?? parseFloat(custom);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    onTip(amt);
    toast.success(`💛 $${amt} tip sent to ${artistName}!`);
    setSelected(null);
    setCustom("");
  };

  return (
    <div className="rounded-2xl border border-[#E8C547]/20 bg-[oklch(0.11_0.012_280)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-[#E8C547]" />
        <span className="font-heading text-[13px] tracking-wider text-[#E8C547]">Tip Jar</span>
      </div>
      <p className="text-[12px] text-white/40 font-body mb-4">
        Support {artistName}'s divine work directly
      </p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {TIP_AMOUNTS.map(amt => (
          <button
            key={amt}
            onClick={() => { setSelected(amt); setCustom(""); }}
            className={`py-2 rounded-xl text-[13px] font-heading transition-all border
              ${selected === amt
                ? "bg-[#E8C547]/15 border-[#E8C547] text-[#E8C547]"
                : "bg-[oklch(0.14_0.013_280)] border-white/[0.08] text-white/50 hover:border-[#E8C547]/40 hover:text-[#E8C547]"
              }`}
          >
            ${amt}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input
          type="number"
          placeholder="Custom amount"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null); }}
          className="flex-1 px-3 py-2 rounded-xl text-[13px] font-body text-white/80
            bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
            focus:border-[#E8C547]/50 placeholder:text-white/20"
        />
      </div>
      <button
        onClick={handleTip}
        className="w-full py-2.5 rounded-xl font-heading text-[13px] tracking-wider transition-all
          bg-[#E8C547]/10 border border-[#E8C547]/30 text-[#E8C547]
          hover:bg-[#E8C547]/20 hover:border-[#E8C547]/60 active:scale-[0.98]"
      >
        Send Tip ✦
      </button>
    </div>
  );
}

function EditableField({
  label, value, onSave, multiline = false, placeholder = ""
}: {
  label: string; value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const save = () => { onSave(val.trim()); setEditing(false); toast.success(`${label} updated`); };
  const cancel = () => { setVal(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-start gap-2">
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
        <button onClick={save} className="p-2 text-[#E8C547] hover:text-[#E8C547]/80"><Check size={14} /></button>
        <button onClick={cancel} className="p-2 text-white/30 hover:text-white/60"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2 cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <span className={`text-[13px] font-body ${value ? "text-white/60" : "text-white/20 italic"}`}>
        {value || placeholder}
      </span>
      <Edit2 size={11} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function ProfilePage() {
  const {
    state, allTracks, playTrack, addTip, addTrackTip,
    setProfileName, setProfileBio, setProfileLocation, setProfileWebsite, setProfileSocials,
    setProfileAvatar, setProfileBanner,
  } = usePlayer();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"tracks" | "liked" | "stats">("tracks");
  const [editingSocials, setEditingSocials] = useState(false);
  const [socialsVal, setSocialsVal] = useState(state.profileSocials);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const tracks = allTracks();
  const myTracks = [...DEMO_TRACKS.slice(0, 3), ...state.tracks]; // show some demo tracks as "own"
  const likedTracks = tracks.filter(t => state.liked.has(t.id));
  const totalPlays = myTracks.reduce((sum, t) => sum + (t.plays || 0), 0);
  const totalTips = state.tipsEarned;

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileAvatar(URL.createObjectURL(f));
    toast.success("Avatar updated");
  };

  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProfileBanner(URL.createObjectURL(f));
    toast.success("Banner updated");
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/artist/${encodeURIComponent(state.profileName)}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Profile link copied!"));
  };

  const saveSocials = () => {
    setProfileSocials(socialsVal);
    setEditingSocials(false);
    toast.success("Social links updated");
  };

  return (
    <div className="animate-fade-up pb-4">
      {/* ── Banner ── */}
      <div className="relative h-[200px] overflow-hidden group">
        {state.profileBanner ? (
          <img src={state.profileBanner} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full"
            style={{ background: "linear-gradient(135deg, oklch(0.11 0.012 280), oklch(0.18 0.014 280), oklch(0.14 0.013 295))" }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #E8C547 0%, transparent 60%), radial-gradient(circle at 70% 30%, #7C3AED 0%, transparent 50%)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-transparent to-transparent" />
        <button
          onClick={() => bannerRef.current?.click()}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-black/50 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white
            text-[11px] font-body opacity-0 group-hover:opacity-100 transition-all"
        >
          <Camera size={12} /> Change Banner
        </button>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
      </div>

      <div className="px-6">
        {/* ── Avatar + Name row ── */}
        <div className="flex items-end gap-4 -mt-12 mb-5">
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-[#E8C547]/30 overflow-hidden
              bg-[oklch(0.14_0.013_280)] flex items-center justify-center">
              {state.profileAvatar ? (
                <img src={state.profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <img src={LOGO_URL} alt="LN" className="w-14 h-14 object-contain opacity-60" />
              )}
            </div>
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-all"
            >
              <Camera size={18} className="text-white" />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1">
              <EditableField
                label="Name"
                value={state.profileName}
                onSave={setProfileName}
                placeholder="Your artist name"
              />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8C547]/10 border border-[#E8C547]/20 text-[#E8C547] font-heading tracking-wider">
                ARTIST
              </span>
            </div>
            <div className="flex items-center gap-3">
              {state.profileLocation && (
                <div className="flex items-center gap-1 text-[11px] text-white/30">
                  <MapPin size={10} />
                  <span>{state.profileLocation}</span>
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

        {/* ── Bio ── */}
        <div className="mb-4">
          <EditableField
            label="Bio"
            value={state.profileBio}
            onSave={setProfileBio}
            multiline
            placeholder="Tell the world about your music…"
          />
        </div>

        {/* ── Location + Website ── */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-white/25" />
            <EditableField label="Location" value={state.profileLocation} onSave={setProfileLocation} placeholder="Add location" />
          </div>
          <div className="flex items-center gap-1.5">
            <Globe size={12} className="text-white/25" />
            <EditableField label="Website" value={state.profileWebsite} onSave={setProfileWebsite} placeholder="Add website URL" />
          </div>
        </div>

        {/* ── Social Links ── */}
        <div className="flex items-center gap-3 mb-5">
          {editingSocials ? (
            <div className="flex-1 grid grid-cols-2 gap-2">
              {(["twitter","instagram","youtube","soundcloud"] as const).map(key => (
                <input
                  key={key}
                  value={socialsVal[key]}
                  onChange={e => setSocialsVal(v => ({ ...v, [key]: e.target.value }))}
                  placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} handle`}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-body text-white/70
                    bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
                    focus:border-[#A78BFA]/50 placeholder:text-white/20"
                />
              ))}
              <div className="col-span-2 flex gap-2">
                <button onClick={saveSocials} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-[#E8C547]/10 border border-[#E8C547]/30 text-[#E8C547]">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => setEditingSocials(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.04] border border-white/[0.08] text-white/40">
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {state.profileSocials.twitter && (
                <a href={`https://twitter.com/${state.profileSocials.twitter}`} target="_blank" rel="noreferrer"
                  className="p-2 rounded-lg bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/40 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30 transition-all">
                  <Twitter size={14} />
                </a>
              )}
              {state.profileSocials.instagram && (
                <a href={`https://instagram.com/${state.profileSocials.instagram}`} target="_blank" rel="noreferrer"
                  className="p-2 rounded-lg bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/40 hover:text-[#E1306C] hover:border-[#E1306C]/30 transition-all">
                  <Instagram size={14} />
                </a>
              )}
              {state.profileSocials.youtube && (
                <a href={`https://youtube.com/@${state.profileSocials.youtube}`} target="_blank" rel="noreferrer"
                  className="p-2 rounded-lg bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/40 hover:text-[#FF0000] hover:border-[#FF0000]/30 transition-all">
                  <Youtube size={14} />
                </a>
              )}
              <button
                onClick={() => setEditingSocials(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body
                  bg-[oklch(0.14_0.013_280)] border border-white/[0.06] text-white/30
                  hover:border-[#A78BFA]/30 hover:text-[#A78BFA] transition-all"
              >
                <Edit2 size={10} /> Edit Socials
              </button>
            </>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Tracks", value: myTracks.length, icon: Music, color: "#A78BFA" },
            { label: "Liked", value: likedTracks.length, icon: Heart, color: "#f87171" },
            { label: "Plays", value: totalPlays >= 1000 ? `${(totalPlays/1000).toFixed(1)}k` : totalPlays, icon: TrendingUp, color: "#E8C547" },
            { label: "Tips", value: `$${totalTips.toFixed(0)}`, icon: DollarSign, color: "#4ade80" },
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

        {/* ── Tip Jar ── */}
        <div className="mb-6">
          <TipJar artistName={state.profileName} onTip={addTip} />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 border-b border-white/[0.07]">
          {(["tracks","liked","stats"] as const).map(tab => (
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
            {myTracks.length === 0 ? (
              <div className="text-center py-12 text-white/25 font-body text-[13px]">
                No tracks yet. <button onClick={() => navigate("/upload")} className="text-[#A78BFA] hover:underline">Upload your first track</button>
              </div>
            ) : (
              myTracks.map((track, i) => {
                const globalIdx = tracks.indexOf(track);
                const tipAmt = state.trackTips[track.id] || 0;
                const commentCount = (state.trackComments[track.id] || []).length;
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06]
                      bg-[oklch(0.14_0.013_280)] hover:border-white/[0.12] transition-all group"
                  >
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                      style={{ background: track.bg || "oklch(0.18 0.014 280)" }}>
                      {track.artUrl
                        ? <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
                        : track.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-body text-white/85 truncate">{track.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/30 font-body flex-shrink-0">
                          {track.genre}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-white/25 font-body">{track.dur || "—"}</span>
                        <span className="text-[11px] text-white/25 font-body">{(track.plays || 0).toLocaleString()} plays</span>
                        {commentCount > 0 && <span className="text-[11px] text-[#A78BFA]/60 font-body">{commentCount} comments</span>}
                        {tipAmt > 0 && <span className="text-[11px] text-[#4ade80]/60 font-body">${tipAmt} tipped</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => playTrack(globalIdx)}
                        className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                      >
                        <Play size={12} />
                      </button>
                      <button
                        onClick={() => navigate(`/track/${track.id}`)}
                        className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#A78BFA] hover:bg-white/[0.1] transition-all"
                        title="Open track page"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/track/${track.id}`;
                          navigator.clipboard.writeText(url).then(() => toast.success("Track link copied!"));
                        }}
                        className="p-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-[#E8C547] hover:bg-white/[0.1] transition-all"
                        title="Copy track link"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Liked tab ── */}
        {activeTab === "liked" && (
          <div className="space-y-3">
            {likedTracks.length === 0 ? (
              <div className="text-center py-12 text-white/25 font-body text-[13px]">
                No liked tracks yet. Explore and heart the ones you love.
              </div>
            ) : (
              likedTracks.map(track => {
                const idx = tracks.indexOf(track);
                return (
                  <div key={track.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06]
                    bg-[oklch(0.14_0.013_280)] hover:border-white/[0.12] transition-all group cursor-pointer"
                    onClick={() => playTrack(idx)}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: track.bg || "oklch(0.18 0.014 280)" }}>
                      {track.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-body text-white/80 truncate">{track.title}</div>
                      <div className="text-[11px] text-white/30 font-body">{track.artist} · {track.genre}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/track/${track.id}`); }}
                      className="p-2 rounded-lg text-white/20 hover:text-[#A78BFA] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ExternalLink size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Stats tab ── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Plays", value: totalPlays.toLocaleString(), sub: "across all tracks", color: "#E8C547" },
                { label: "Tips Earned", value: `$${totalTips.toFixed(2)}`, sub: "total received", color: "#4ade80" },
                { label: "Tracks Published", value: myTracks.length, sub: "in your showroom", color: "#A78BFA" },
                { label: "Liked by Others", value: likedTracks.length, sub: "tracks you've saved", color: "#f87171" },
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
              {myTracks.sort((a,b) => (b.plays||0)-(a.plays||0)).slice(0,5).map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-[12px] font-heading text-white/20 w-4">{i+1}</span>
                  <span className="flex-1 text-[12px] font-body text-white/60 truncate">{t.title}</span>
                  <span className="text-[12px] font-body text-[#E8C547]/60">{(t.plays||0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
