/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — UploadPage
   Divine Noir: Upload tracks with drag-drop, artwork, and metadata
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { Upload, Music, Image, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { nanoid } from "nanoid";

const GENRES = ["Electronic", "Lo-fi", "Hip-Hop", "Ambient", "Pop", "Jazz", "Indie", "R&B", "House", "Trap", "Classical", "Other"];

export default function UploadPage() {
  const { addTrack } = usePlayer();
  const [, navigate] = useLocation();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artPreview, setArtPreview] = useState<string | null>(null);
  const [artType, setArtType] = useState<"image" | "video">("image");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [desc, setDesc] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [audioDrag, setAudioDrag] = useState(false);
  const [artDrag, setArtDrag] = useState(false);

  const audioRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);

  const handleAudio = (f: File) => {
    setAudioFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleArt = (f: File) => {
    setArtFile(f);
    const type = f.type.startsWith("video") ? "video" : "image";
    setArtType(type);
    setArtPreview(URL.createObjectURL(f));
  };

  const doUpload = () => {
    if (!title.trim()) { toast.error("Please enter a track title"); return; }
    if (!audioFile) { toast.error("Please upload an audio file"); return; }

    setUploading(true);
    setProgress(0);

    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18;
      setProgress(Math.min(p, 95));
      if (p >= 95) {
        clearInterval(iv);
        setTimeout(() => {
          setProgress(100);
          setTimeout(() => {
            const track: Track = {
              id: nanoid(),
              title: title.trim(),
              artist: artist.trim() || "Alex Rivera",
              genre: genre || "Other",
              desc,
              audioUrl: URL.createObjectURL(audioFile),
              artUrl: artPreview || undefined,
              artType,
              emoji: "🎙️",
              bg: "linear-gradient(135deg,oklch(0.18 0.014 280),oklch(0.14 0.013 280))",
              dur: "—",
              isOwn: true,
            };
            addTrack(track);
            toast.success("🎵 Track published to Living Nexus!");
            setTimeout(() => navigate("/profile"), 600);
          }, 400);
        }, 300);
      }
    }, 80);
  };

  const inputCls = `w-full px-4 py-2.5 rounded-xl text-[13.5px] font-body text-white/80
    bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
    focus:border-[#A78BFA]/50 transition-colors placeholder:text-white/20`;

  return (
    <div className="animate-fade-up px-6 py-6">
      <div className="max-w-[680px]">
        <h1 className="font-heading text-2xl text-white/90 tracking-wider mb-1">Upload a Track</h1>
        <p className="text-[13px] text-white/35 font-body mb-6">
          Share your sound with the cosmos. Supports audio + custom artwork or video.
        </p>

        {/* ── Drop zones ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Audio */}
          <div
            onClick={() => audioRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setAudioDrag(true); }}
            onDragLeave={() => setAudioDrag(false)}
            onDrop={e => { e.preventDefault(); setAudioDrag(false); const f = e.dataTransfer.files[0]; if (f) handleAudio(f); }}
            className={`rounded-2xl p-8 text-center cursor-pointer transition-all border-2 border-dashed
              ${audioDrag ? "border-[#A78BFA] bg-[#A78BFA]/5" : "border-white/[0.1] bg-[oklch(0.14_0.013_280)] hover:border-[#A78BFA]/40"}`}
          >
            <input ref={audioRef} type="file" accept="audio/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleAudio(e.target.files[0])} />
            {audioFile ? (
              <div>
                <div className="w-12 h-12 rounded-full bg-[#A78BFA]/20 flex items-center justify-center mx-auto mb-3">
                  <Check size={20} className="text-[#A78BFA]" />
                </div>
                <div className="text-[13px] font-body text-[#A78BFA] truncate">{audioFile.name}</div>
              </div>
            ) : (
              <>
                <Music size={32} className="text-white/20 mx-auto mb-3" />
                <div className="text-[14px] font-body text-white/50 mb-1">Drop Audio File</div>
                <div className="text-[12px] text-white/25">MP3, WAV, FLAC, OGG</div>
              </>
            )}
          </div>

          {/* Artwork */}
          <div
            onClick={() => artRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setArtDrag(true); }}
            onDragLeave={() => setArtDrag(false)}
            onDrop={e => { e.preventDefault(); setArtDrag(false); const f = e.dataTransfer.files[0]; if (f) handleArt(f); }}
            className={`rounded-2xl p-8 text-center cursor-pointer transition-all border-2 border-dashed relative overflow-hidden
              ${artDrag ? "border-[#E8C547] bg-[#E8C547]/5" : "border-white/[0.1] bg-[oklch(0.14_0.013_280)] hover:border-[#E8C547]/40"}`}
          >
            <input ref={artRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleArt(e.target.files[0])} />
            {artPreview ? (
              <>
                {artType === "video"
                  ? <video src={artPreview} className="absolute inset-0 w-full h-full object-cover opacity-40" muted loop autoPlay />
                  : <img src={artPreview} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
                }
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-[#E8C547]/20 flex items-center justify-center mx-auto mb-3">
                    <Check size={20} className="text-[#E8C547]" />
                  </div>
                  <div className="text-[13px] font-body text-[#E8C547] truncate">{artFile?.name}</div>
                </div>
              </>
            ) : (
              <>
                <Image size={32} className="text-white/20 mx-auto mb-3" />
                <div className="text-[14px] font-body text-white/50 mb-1">Drop Artwork / Video</div>
                <div className="text-[12px] text-white/25">JPG, PNG, MP4, MOV, GIF</div>
              </>
            )}
          </div>
        </div>

        {/* ── Form ── */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">
                Track Title *
              </label>
              <input className={inputCls} placeholder="Name your track…" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">
                Artist Name
              </label>
              <input className={inputCls} placeholder="Your name or alias" value={artist} onChange={e => setArtist(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Genre</label>
              <select
                className={`${inputCls} cursor-pointer`}
                value={genre}
                onChange={e => setGenre(e.target.value)}
                style={{ background: "oklch(0.14 0.013 280)" }}
              >
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">
                BPM (optional)
              </label>
              <input className={inputCls} type="number" placeholder="120" value={bpm} onChange={e => setBpm(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Description</label>
            <textarea
              className={`${inputCls} resize-y min-h-[80px]`}
              placeholder="Tell the cosmos about this track…"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div>
              <div className="text-[11px] font-heading tracking-wider text-white/40 mb-2 uppercase">
                {progress < 100 ? "Ascending to the Nexus…" : "Published ✓"}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #7C3AED, #E8C547)",
                  }}
                />
              </div>
            </div>
          )}

          <button
            onClick={doUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-[13px] tracking-wider
              text-black font-bold transition-all hover:-translate-y-0.5
              hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
          >
            <Upload size={14} />
            Publish to Living Nexus
          </button>
        </div>
      </div>
    </div>
  );
}
