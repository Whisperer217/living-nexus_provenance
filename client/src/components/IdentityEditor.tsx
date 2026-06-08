/* ══════════════════════════════════════════════════════════════════
   LIVING NEXUS — IdentityEditor  (Phase 194)
   Dual-layer identity editing: Witness Identity + Distribution Identity
   Used in ProfilePage's Identity tab
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Fingerprint, Globe, Eye, Music, BookOpen, PenTool, Scroll, Film, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/* ─── Active Mediums config ─────────────────────────────────────────────────── */
const ALL_MEDIUMS = [
  { id: "music",       label: "Music",       icon: <Music className="w-3.5 h-3.5" /> },
  { id: "books",       label: "Books",       icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: "comics",      label: "Comics",      icon: <PenTool className="w-3.5 h-3.5" /> },
  { id: "manuscripts", label: "Manuscripts", icon: <Scroll className="w-3.5 h-3.5" /> },
  { id: "video",       label: "Video",       icon: <Film className="w-3.5 h-3.5" /> },
  { id: "other",       label: "Other",       icon: <Sparkles className="w-3.5 h-3.5" /> },
];

export function IdentityEditor({ profile }: { profile: any }) {
  const utils = trpc.useUtils();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => { utils.profile.me.invalidate(); toast.success("Identity updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Witness Identity state ── */
  const [originStatement, setOriginStatement]       = useState(profile?.originStatement || profile?.witnessOriginStory || "");
  const [creativeMission, setCreativeMission]       = useState(profile?.creativeMission || "");
  const [witnessPhilosophy, setWitnessPhilosophy]   = useState(profile?.creativePhilosophy || profile?.witnessPhilosophy || "");
  const [witnessDoctrine, setWitnessDoctrine]       = useState(profile?.creativeDoctrine || profile?.witnessDoctrine || "");
  const [archiveContinuity, setArchiveContinuity]   = useState(profile?.archiveContinuity || "");
  const [witnessSigil, setWitnessSigil]             = useState(profile?.sigilUrl || "");
  const [activeMediums, setActiveMediums]           = useState<string[]>(
    (profile?.activeMediums as string[] | null) || []
  );

  /* ── Distribution Identity state ── */
  const [distributionArtistName, setDistributionArtistName]   = useState(profile?.officialArtistName || "");
  const [distributionLabel, setDistributionLabel]             = useState(profile?.labelName || "");
  const [distributionSpotifyUrl, setDistributionSpotifyUrl]   = useState(profile?.dspSpotifyUrl || "");
  const [distributionAppleMusicUrl, setDistributionAppleMusicUrl] = useState(profile?.dspAppleMusicUrl || "");
  const [distributionYoutubeMusicUrl, setDistributionYoutubeMusicUrl] = useState(profile?.dspTikTokHandle || "");
  const [distributionDspOther, setDistributionDspOther]       = useState(profile?.producerCredits || "");

  /* ── Handlers ── */
  const toggleMedium = (id: string) => {
    setActiveMediums(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const saveWitness = () => {
    updateProfile.mutate({
      originStatement,
      creativeMission,
      creativePhilosophy: witnessPhilosophy,
      creativeDoctrine: witnessDoctrine,
      archiveContinuity,
      sigilUrl: witnessSigil || undefined,
      activeMediums,
    });
  };

  const saveDistribution = () => {
    updateProfile.mutate({
      officialArtistName: distributionArtistName,
      labelName: distributionLabel,
      dspSpotifyUrl: distributionSpotifyUrl || undefined,
      dspAppleMusicUrl: distributionAppleMusicUrl || undefined,
      dspTikTokHandle: distributionYoutubeMusicUrl,
      producerCredits: distributionDspOther,
    });
  };

  /* ── Styles ── */
  const fieldClass = "w-full rounded-xl px-3 py-2.5 text-[13px] font-body text-white/80 bg-[#0A0A0A] border border-white/[0.08] focus:border-[#C49A28]/60 outline-none placeholder:text-white/30 transition-colors";
  const labelClass = "text-[10px] font-heading tracking-widest text-white/40 block mb-1.5";
  const sectionTitle = "text-[14px] font-heading tracking-wide mb-4";

  /* ── Character count helper ── */
  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-8">

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── WITNESS IDENTITY LAYER ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-2xl" style={{ background: "#0D0D0D", border: "1px solid rgba(196,154,40,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Fingerprint size={16} style={{ color: "var(--ln-gold)" }} />
          <h3 className={sectionTitle} style={{ color: "var(--ln-gold)", margin: "0" }}>Witness Identity</h3>
        </div>
        <p className="text-[11px] font-body text-white/40 mb-5">
          Your origin, mission, philosophy, and doctrine. This is who you are beyond your works.
          Establish this before uploading anything — it anchors everything that follows.
        </p>

        <div className="grid gap-5">

          {/* ── Origin Statement (anchor field) ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass} style={{ margin: 0 }}>ORIGIN STATEMENT</label>
              <span className="text-[9px] font-mono" style={{ color: wordCount(originStatement) > 300 ? "#ef4444" : "rgba(196,154,40,0.5)" }}>
                {wordCount(originStatement)} / 300 words
              </span>
            </div>
            <p className="text-[10px] font-body text-white/30 mb-2 leading-relaxed">
              What truth, experience, mission, or curiosity gave rise to this creator identity?
              Not biography. Not social media. The anchor.
            </p>
            <textarea
              value={originStatement}
              onChange={e => setOriginStatement(e.target.value)}
              placeholder="The moment, the wound, the calling, the question — what made you a creator?"
              rows={5}
              className={fieldClass + " resize-none"}
            />
          </div>

          {/* ── Creative Mission ── */}
          <div>
            <label className={labelClass}>CREATIVE MISSION</label>
            <p className="text-[10px] font-body text-white/30 mb-2 leading-relaxed">
              What are you actively building toward right now? This is your current direction, not your past.
            </p>
            <textarea
              value={creativeMission}
              onChange={e => setCreativeMission(e.target.value)}
              placeholder="What are you building? What are you trying to prove, preserve, or transmit?"
              rows={3}
              className={fieldClass + " resize-none"}
            />
          </div>

          {/* ── Active Mediums ── */}
          <div>
            <label className={labelClass}>ACTIVE MEDIUMS</label>
            <p className="text-[10px] font-body text-white/30 mb-3 leading-relaxed">
              Which creative forms do you work in? Select all that apply.
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_MEDIUMS.map(m => {
                const active = activeMediums.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMedium(m.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all"
                    style={{
                      background: active ? "rgba(196,154,40,0.15)" : "rgba(255,255,255,0.03)",
                      border: active ? "1px solid rgba(196,154,40,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      color: active ? "var(--ln-gold)" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Creative Philosophy ── */}
          <div>
            <label className={labelClass}>CREATIVE PHILOSOPHY</label>
            <textarea
              value={witnessPhilosophy}
              onChange={e => setWitnessPhilosophy(e.target.value)}
              placeholder="What drives your creative existence? What truth do you serve?"
              rows={3}
              className={fieldClass + " resize-none"}
            />
          </div>

          {/* ── Creative Doctrine ── */}
          <div>
            <label className={labelClass}>DOCTRINE</label>
            <textarea
              value={witnessDoctrine}
              onChange={e => setWitnessDoctrine(e.target.value)}
              placeholder="Your creative principles. The rules you create by. Your non-negotiables."
              rows={3}
              className={fieldClass + " resize-none"}
            />
          </div>

          {/* ── Archive Continuity ── */}
          <div>
            <label className={labelClass}>ARCHIVE CONTINUITY</label>
            <p className="text-[10px] font-body text-white/30 mb-2 leading-relaxed">
              What is the long-term direction of your archive? What should it mean in 10 years?
            </p>
            <textarea
              value={archiveContinuity}
              onChange={e => setArchiveContinuity(e.target.value)}
              placeholder="The legacy direction. What this archive is building toward."
              rows={3}
              className={fieldClass + " resize-none"}
            />
          </div>

          {/* ── Sigil URL ── */}
          <div>
            <label className={labelClass}>SIGIL / SYMBOL URL</label>
            <input
              value={witnessSigil}
              onChange={e => setWitnessSigil(e.target.value)}
              placeholder="https://... (your creator mark or symbol)"
              className={fieldClass}
            />
          </div>

        </div>

        <button
          onClick={saveWitness}
          disabled={updateProfile.isPending}
          className="mt-5 px-5 py-2.5 rounded-xl text-[12px] font-heading tracking-wider transition-all disabled:opacity-50"
          style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
        >
          {updateProfile.isPending ? "Saving…" : "Save Witness Identity"}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── DISTRIBUTION IDENTITY LAYER ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-2xl" style={{ background: "#0D0D0D", border: "1px solid rgba(96,165,250,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Globe size={16} className="text-blue-400" />
          <h3 className={sectionTitle} style={{ color: "#60a5fa", margin: "0" }}>Distribution Identity</h3>
        </div>
        <p className="text-[11px] font-body text-white/40 mb-5">
          Industry-facing metadata for DSP delivery, credits, and royalty collection.
          This is how the world finds your work.
        </p>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>OFFICIAL ARTIST NAME</label>
              <input
                value={distributionArtistName}
                onChange={e => setDistributionArtistName(e.target.value)}
                placeholder="As it appears on streaming platforms"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>LABEL / IMPRINT</label>
              <input
                value={distributionLabel}
                onChange={e => setDistributionLabel(e.target.value)}
                placeholder="e.g. BDDT Publishing"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 mt-2">
            <label className={labelClass}>DSP PROFILE LINKS</label>
            <div className="grid gap-3 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">Spotify</span>
                <input
                  value={distributionSpotifyUrl}
                  onChange={e => setDistributionSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/artist/..."
                  className={fieldClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">Apple Music</span>
                <input
                  value={distributionAppleMusicUrl}
                  onChange={e => setDistributionAppleMusicUrl(e.target.value)}
                  placeholder="https://music.apple.com/artist/..."
                  className={fieldClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">YouTube Music</span>
                <input
                  value={distributionYoutubeMusicUrl}
                  onChange={e => setDistributionYoutubeMusicUrl(e.target.value)}
                  placeholder="https://music.youtube.com/channel/..."
                  className={fieldClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">Other DSPs</span>
                <input
                  value={distributionDspOther}
                  onChange={e => setDistributionDspOther(e.target.value)}
                  placeholder="Comma-separated URLs (Amazon Music, Tidal, etc.)"
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={saveDistribution}
          disabled={updateProfile.isPending}
          className="mt-5 px-5 py-2.5 rounded-xl text-[12px] font-heading tracking-wider transition-all disabled:opacity-50"
          style={{ background: "#60a5fa", color: "#0a0a0a" }}
        >
          {updateProfile.isPending ? "Saving…" : "Save Distribution Identity"}
        </button>
      </div>

      {/* ── View Public Identity Page link ── */}
      <div className="text-center">
        <a
          href={`/identity/${profile?.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-heading tracking-wider transition-all hover:opacity-80"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
        >
          <Eye size={14} /> View Public Identity Page
        </a>
      </div>
    </div>
  );
}
