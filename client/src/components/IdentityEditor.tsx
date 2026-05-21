/* ══════════════════════════════════════════════════════════════════
   LIVING NEXUS — IdentityEditor
   Dual-layer identity editing: Witness Identity + Distribution Identity
   Used in ProfilePage's Identity tab
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { Fingerprint, Globe, Eye, Upload, X, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const MAX_SIGIL_SIZE = 4 * 1024 * 1024; // 4MB

export function IdentityEditor({ profile }: { profile: any }) {
  const utils = trpc.useUtils();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => { utils.profile.me.invalidate(); toast.success("Identity updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const uploadSigilMutation = trpc.profile.uploadSigil.useMutation({
    onSuccess: (data) => {
      setSigilPreview(data.url);
      utils.profile.me.invalidate();
      toast.success("Sigil uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [witnessPhilosophy, setWitnessPhilosophy] = useState(profile?.creativePhilosophy || profile?.witnessPhilosophy || "");
  const [witnessOriginStory, setWitnessOriginStory] = useState(profile?.originStatement || profile?.witnessOriginStory || "");
  const [witnessDoctrine, setWitnessDoctrine] = useState(profile?.creativeDoctrine || profile?.witnessDoctrine || "");
  const [witnessEpitaph, setWitnessEpitaph] = useState(profile?.witnessEpitaph || "");
  const [sigilPreview, setSigilPreview] = useState<string | null>(profile?.sigilUrl || null);
  const [distributionArtistName, setDistributionArtistName] = useState(profile?.officialArtistName || "");
  const [distributionLabel, setDistributionLabel] = useState(profile?.labelName || "");
  const [distributionIsni, setDistributionIsni] = useState(profile?.distributionIsni || "");
  const [distributionIpi, setDistributionIpi] = useState(profile?.distributionIpi || "");
  const [distributionSpotifyUrl, setDistributionSpotifyUrl] = useState(profile?.dspSpotifyUrl || "");
  const [distributionAppleMusicUrl, setDistributionAppleMusicUrl] = useState(profile?.dspAppleMusicUrl || "");
  const [distributionYoutubeMusicUrl, setDistributionYoutubeMusicUrl] = useState(profile?.dspTikTokHandle || "");
  const [distributionDspOther, setDistributionDspOther] = useState(profile?.producerCredits || "");

  const sigilInputRef = useRef<HTMLInputElement>(null);

  const handleSigilUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIGIL_SIZE) {
      toast.error("Sigil image must be under 4MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      uploadSigilMutation.mutate({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    // Reset input so re-selecting same file triggers change
    e.target.value = "";
  };

  const removeSigil = () => {
    setSigilPreview(null);
    updateProfile.mutate({ sigilUrl: "" });
  };

  const saveWitness = () => {
    updateProfile.mutate({
      creativePhilosophy: witnessPhilosophy,
      originStatement: witnessOriginStory,
      creativeDoctrine: witnessDoctrine,
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

  const fieldClass = "w-full rounded-xl px-3 py-2.5 text-[13px] font-body text-white/80 bg-[#111009] border border-white/[0.08] focus:border-[#C49A28]/60 outline-none placeholder:text-white/30 transition-colors";
  const labelClass = "text-[10px] font-heading tracking-widest text-white/40 block mb-1.5";
  const sectionTitle = "text-[14px] font-heading tracking-wide mb-4";

  return (
    <div className="space-y-8">
      {/* ── Witness Identity Layer ── */}
      <div className="p-5 rounded-2xl" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}>
        <div className="flex items-center gap-2 mb-5">
          <Fingerprint size={16} style={{ color: "var(--ln-gold)" }} />
          <h3 className={sectionTitle} style={{ color: "var(--ln-gold)", margin: "0" }}>Witness Identity</h3>
        </div>
        <p className="text-[11px] font-body text-white/40 mb-5 -mt-2">Your creative philosophy, origin story, and doctrine. This is who you are beyond your works.</p>

        <div className="grid gap-4">
          <div>
            <label className={labelClass}>CREATIVE PHILOSOPHY</label>
            <textarea value={witnessPhilosophy} onChange={e => setWitnessPhilosophy(e.target.value)}
              placeholder="What drives your creative existence? What truth do you serve?" rows={3}
              className={fieldClass + " resize-none"} />
          </div>
          <div>
            <label className={labelClass}>ORIGIN STORY</label>
            <textarea value={witnessOriginStory} onChange={e => setWitnessOriginStory(e.target.value)}
              placeholder="How did you arrive here? What transformation brought you to creation?" rows={4}
              className={fieldClass + " resize-none"} />
          </div>
          <div>
            <label className={labelClass}>DOCTRINE</label>
            <textarea value={witnessDoctrine} onChange={e => setWitnessDoctrine(e.target.value)}
              placeholder="Your creative principles. The rules you create by. Your non-negotiables." rows={3}
              className={fieldClass + " resize-none"} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>EPITAPH</label>
              <input value={witnessEpitaph} onChange={e => setWitnessEpitaph(e.target.value)}
                placeholder="One line. Your legacy statement." className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>SIGIL / CREATOR MARK</label>
              <input type="file" ref={sigilInputRef} accept="image/*" onChange={handleSigilUpload} className="hidden" />
              {sigilPreview ? (
                <div className="relative group w-full h-[100px] rounded-xl overflow-hidden border border-white/[0.08]"
                  style={{ background: "#111009" }}>
                  <img src={sigilPreview} alt="Sigil" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => sigilInputRef.current?.click()}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Replace sigil"
                    >
                      <Upload size={14} className="text-white" />
                    </button>
                    <button
                      onClick={removeSigil}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors"
                      title="Remove sigil"
                    >
                      <X size={14} className="text-red-300" />
                    </button>
                  </div>
                  {uploadSigilMutation.isPending && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#C49A28] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => sigilInputRef.current?.click()}
                  disabled={uploadSigilMutation.isPending}
                  className="w-full h-[100px] rounded-xl border border-dashed border-white/[0.15] hover:border-[#C49A28]/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ background: "#111009" }}
                >
                  {uploadSigilMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-[#C49A28] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImageIcon size={18} className="text-white/30" />
                      <span className="text-[10px] font-body text-white/30">Upload sigil image (max 4MB)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={saveWitness} disabled={updateProfile.isPending}
          className="mt-5 px-5 py-2.5 rounded-xl text-[12px] font-heading tracking-wider transition-all disabled:opacity-50"
          style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>
          {updateProfile.isPending ? "Saving\u2026" : "Save Witness Identity"}
        </button>
      </div>

      {/* ── Distribution Identity Layer ── */}
      <div className="p-5 rounded-2xl" style={{ background: "var(--ln-coal)", border: "1px solid rgba(96,165,250,0.2)" }}>
        <div className="flex items-center gap-2 mb-5">
          <Globe size={16} className="text-blue-400" />
          <h3 className={sectionTitle} style={{ color: "#60a5fa", margin: "0" }}>Distribution Identity</h3>
        </div>
        <p className="text-[11px] font-body text-white/40 mb-5 -mt-2">Industry-facing metadata for DSP delivery, credits, and royalty collection. This is how the world finds your work.</p>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>OFFICIAL ARTIST NAME</label>
              <input value={distributionArtistName} onChange={e => setDistributionArtistName(e.target.value)}
                placeholder="As it appears on streaming platforms" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>LABEL / IMPRINT</label>
              <input value={distributionLabel} onChange={e => setDistributionLabel(e.target.value)}
                placeholder="e.g. BDDT Publishing" className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>ISNI (International Standard Name Identifier)</label>
              <input value={distributionIsni} onChange={e => setDistributionIsni(e.target.value)}
                placeholder="0000 0000 0000 0000" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>IPI (Interested Parties Information)</label>
              <input value={distributionIpi} onChange={e => setDistributionIpi(e.target.value)}
                placeholder="000000000" className={fieldClass} />
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 mt-2">
            <label className={labelClass}>DSP PROFILE LINKS</label>
            <div className="grid gap-3 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">Spotify</span>
                <input value={distributionSpotifyUrl} onChange={e => setDistributionSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/artist/..." className={fieldClass} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">Apple Music</span>
                <input value={distributionAppleMusicUrl} onChange={e => setDistributionAppleMusicUrl(e.target.value)}
                  placeholder="https://music.apple.com/artist/..." className={fieldClass} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">YouTube Music</span>
                <input value={distributionYoutubeMusicUrl} onChange={e => setDistributionYoutubeMusicUrl(e.target.value)}
                  placeholder="https://music.youtube.com/channel/..." className={fieldClass} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-body text-white/50 w-28 flex-shrink-0">Other DSPs</span>
                <input value={distributionDspOther} onChange={e => setDistributionDspOther(e.target.value)}
                  placeholder="Comma-separated URLs (Amazon Music, Tidal, etc.)" className={fieldClass} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={saveDistribution} disabled={updateProfile.isPending}
          className="mt-5 px-5 py-2.5 rounded-xl text-[12px] font-heading tracking-wider transition-all disabled:opacity-50"
          style={{ background: "#60a5fa", color: "#0a0a0a" }}>
          {updateProfile.isPending ? "Saving\u2026" : "Save Distribution Identity"}
        </button>
      </div>

      {/* ── View Public Identity Page link ── */}
      <div className="text-center">
        <a href={`/identity/${profile?.id}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-heading tracking-wider transition-all hover:opacity-80"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
          <Eye size={14} /> View Public Identity Page
        </a>
      </div>
    </div>
  );
}
