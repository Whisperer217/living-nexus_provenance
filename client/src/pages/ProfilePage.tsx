/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ProfilePage
   Divine Noir: Artist profile with banner, stats, tracks, tips
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import TrackCard from "@/components/TrackCard";
import TipModal from "@/components/TipModal";
import { Camera, Edit2, DollarSign, Music, Heart, Activity } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "tracks", label: "Tracks", icon: Music },
  { id: "liked", label: "Liked", icon: Heart },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function ProfilePage() {
  const { state, allTracks, setProfileName, setProfileAvatar, setProfileBanner } = usePlayer();
  const [activeTab, setActiveTab] = useState("tracks");
  const [tipOpen, setTipOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(state.profileName);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const tracks = allTracks();
  const myTracks = state.tracks;
  const likedTracks = tracks.filter(t => state.liked.has(t.id));

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

  const saveName = () => {
    setProfileName(nameVal.trim() || "Alex Rivera");
    setEditingName(false);
    toast.success("Profile updated");
  };

  const selfTipTrack = {
    id: "self",
    title: "Support Your Channel",
    artist: state.profileName,
    genre: "—",
    emoji: "🎙️",
  };

  return (
    <div className="animate-fade-up">
      {/* ── Banner ── */}
      <div
        className="relative h-[200px] cursor-pointer group overflow-hidden"
        onClick={() => bannerRef.current?.click()}
        style={{ background: "linear-gradient(135deg,#1a0a2e,#0a1a2e,#0a2e1a)" }}
      >
        {state.profileBanner && (
          <img src={state.profileBanner} alt="banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity
          flex items-center justify-center">
          <div className="flex items-center gap-2 text-white text-[13px] font-body
            bg-black/50 px-4 py-2 rounded-lg">
            <Camera size={14} /> Change Banner
          </div>
        </div>
        <input ref={bannerRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleBanner} />
      </div>

      {/* ── Profile head ── */}
      <div className="px-6 relative">
        <div className="flex items-end gap-4 -mt-12 mb-5">
          {/* Avatar */}
          <div
            className="relative cursor-pointer group flex-shrink-0"
            onClick={() => avatarRef.current?.click()}
          >
            <div className="w-[88px] h-[88px] rounded-full border-4 border-[oklch(0.08_0.01_280)]
              flex items-center justify-center text-3xl font-bold text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)" }}>
              {state.profileAvatar
                ? <img src={state.profileAvatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                : state.profileName.charAt(0)
              }
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-[#A78BFA]
              flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={11} className="text-white" />
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          {/* Identity */}
          <div className="flex-1 pb-2">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveName()}
                  className="font-heading text-xl text-white/90 bg-transparent border-b border-[#E8C547]/50
                    outline-none tracking-wide"
                  autoFocus
                />
                <button onClick={saveName} className="text-[12px] text-[#E8C547] font-body hover:underline">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl text-white/90 tracking-wide">{state.profileName}</h1>
                <button onClick={() => setEditingName(true)} className="text-white/25 hover:text-[#E8C547] transition-colors">
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <div className="text-[12px] text-white/35 font-body mt-0.5">
              @{state.profileName.toLowerCase().replace(/\s+/g, "")}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => setTipOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-body font-medium
                text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(232,197,71,0.3)]"
              style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
            >
              <DollarSign size={13} /> Tip Me
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-5">
          {[
            { n: myTracks.length, l: "Tracks" },
            { n: likedTracks.length, l: "Liked" },
            { n: `$${state.tipsEarned.toFixed(0)}`, l: "Tips" },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="font-heading text-[18px] text-white/90">{s.n}</div>
              <div className="text-[11px] text-white/30 font-body">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.07] mb-5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-body transition-all
                  border-b-2 -mb-px
                  ${activeTab === tab.id
                    ? "text-[#A78BFA] border-[#A78BFA]"
                    : "text-white/35 border-transparent hover:text-white/60"
                  }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "tracks" && (
          myTracks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
              {myTracks.map(track => (
                <TrackCard
                  key={track.id}
                  track={track}
                  index={tracks.indexOf(track)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-4">🎵</div>
              <div className="font-heading text-[16px] text-white/50 mb-2">No tracks yet</div>
              <div className="text-[13px] font-body">Upload your first track to begin your journey</div>
            </div>
          )
        )}

        {activeTab === "liked" && (
          likedTracks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-6">
              {likedTracks.map(track => (
                <TrackCard key={track.id} track={track} index={tracks.indexOf(track)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-4">💜</div>
              <div className="font-heading text-[16px] text-white/50 mb-2">No liked songs yet</div>
              <div className="text-[13px] font-body">Heart a track to save it here</div>
            </div>
          )
        )}

        {activeTab === "activity" && (
          <div className="text-center py-16 text-white/30">
            <div className="text-5xl mb-4">📡</div>
            <div className="font-heading text-[16px] text-white/50 mb-2">No activity yet</div>
            <div className="text-[13px] font-body">Your listening history will appear here</div>
          </div>
        )}
      </div>

      {tipOpen && (
        <TipModal track={selfTipTrack as any} onClose={() => setTipOpen(false)} />
      )}
    </div>
  );
}
