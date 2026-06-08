/* ═══════════════════════════════════════════════════════════════════
   MUSIC MANIFESTATION ENVIRONMENT
   Atmosphere: violet/gold gradient, waveform animations, resonance language
   Flow: Drop audio → Metadata → Provenance → Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Upload, Music, Image as ImageIcon, Play, Pause, Shield, ShieldCheck,
  ChevronRight, ChevronLeft, Loader2, Sparkles, CheckCircle2, X as XIcon,
  Video, Plus, Trash2, Copy, RefreshCw, Zap, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { HAAIDeclarationForm, EMPTY_HAAI } from "@/components/HAAIDeclarationForm";
import { UPLOAD_GENRES as GENRES, MOODS } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell, ProvenanceIndicator, ReassuranceMessage } from "../StudioShell";

const atmosphere = ATMOSPHERES.music;

const AI_CONSENT_OPTIONS = [
  { value: "prohibited" as const, label: "Training PROHIBITED", color: "var(--ln-ember)", desc: "No system may train on this work" },
  { value: "permitted_attribution" as const, label: "Permitted with Attribution", color: "var(--ln-gold)", desc: "Training allowed only with full attribution" },
  { value: "permitted" as const, label: "Freely Permitted", color: "var(--ln-gold)", desc: "Open for training and derivative use" },
];

// ── Crypto helpers ──
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function generateECDSAKeypair() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}
async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(payload));
  let binary = ""; const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function exportPublicKeyJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });
}
function deriveHarmonicFrequencies(hashHex: string): number[] {
  const BASE_FREQS = [110, 220, 330, 440, 550, 660];
  return BASE_FREQS.map((base, i) => {
    const chunk = parseInt(hashHex.slice(i * 8, i * 8 + 8), 16);
    return Math.round(base * (0.85 + (chunk % 1000) / 1000 * 0.3) * 10) / 10;
  });
}

// ── Waveform Visualization ──
function HarmonicWaveform({ frequencies, active }: { frequencies: number[]; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || frequencies.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "rgba(167,139,250,0)");
      grad.addColorStop(0.3, "rgba(167,139,250,0.9)");
      grad.addColorStop(0.7, "rgba(212,175,55,0.9)");
      grad.addColorStop(1, "rgba(212,175,55,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        let y = H / 2;
        frequencies.forEach((f, i) => {
          const amp = (H / 2 - 8) / frequencies.length;
          y += amp * Math.sin((x / W) * f * 0.04 + tRef.current * (0.5 + i * 0.15));
        });
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      tRef.current += 0.04;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [frequencies, active]);

  return (
    <canvas ref={canvasRef} width={500} height={100} className="w-full rounded-xl"
      style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}` }} />
  );
}

// ── Audio Preview Player ──
function AudioPreview({ file }: { file: File }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string>("");

  useEffect(() => {
    urlRef.current = URL.createObjectURL(file);
    const audio = new Audio(urlRef.current);
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => setPlaying(false));
    return () => { audio.pause(); URL.revokeObjectURL(urlRef.current); };
  }, [file]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(124,58,237,0.06)", border: `1px solid ${atmosphere.colorBorder}` }}>
      <button onClick={toggle} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: atmosphere.colorPrimary }}>
        {playing ? <Pause size={14} color="#000000" /> : <Play size={14} color="#000000" className="ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(167,139,250,0.15)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: atmosphere.colorPrimary }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: "rgba(245,237,216,0.5)" }}>{fmt(currentTime)}</span>
          <span className="text-[10px]" style={{ color: "rgba(245,237,216,0.5)" }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

interface MusicEnvironmentProps {
  onBack: () => void;
}

export function MusicEnvironment({ onBack }: MusicEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<StudioStep>("upload");

  // File state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [audioDragging, setAudioDragging] = useState(false);

  // Metadata state
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [keySignature, setKeySignature] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [isrc, setIsrc] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [credits, setCredits] = useState<{ role: string; name: string }[]>([]);
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");
  const [aiDisclosure, setAiDisclosure] = useState<"original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument">("original");
  const [caption, setCaption] = useState("");
  const [playerAssetType, setPlayerAssetType] = useState<"cover" | "video">("cover");

  // Provenance state
  const [witnessData, setWitnessData] = useState<{ wid: string; fileHash: string; frequencies: number[]; publicKeyJWK: string; signature: string; timestamp: string } | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);


  // Upload state
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done">("idle");

  // Load creator profile defaults
  const { data: creatorProfile } = trpc.profile.me.useQuery(undefined, { enabled: !!user });
  useEffect(() => {
    if (creatorProfile?.primaryGenre && !genre) setGenre(creatorProfile.primaryGenre);
  }, [creatorProfile?.primaryGenre]);

  // Cover preview
  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreview("");
  }, [coverFile]);

  // Progress calculation
  const progress = step === "upload" ? (audioFile ? 25 : 5) : step === "metadata" ? (title ? 55 : 35) : step === "provenance" ? (witnessData ? 85 : 65) : 95;

  // ── File handlers ──
  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setAudioDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      toast.success("Audio file received — resonance detected");
    }
  }, []);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAudioFile(file); toast.success("Audio loaded"); }
  };

  // ── WID Generation ──
  const generateWID = async () => {
    if (!audioFile) return;
    setGeneratingWid(true);
    setWaveformActive(true);
    try {
      const buffer = await audioFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const frequencies = deriveHarmonicFrequencies(fileHash);
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const payload = JSON.stringify({ fileHash, frequencies, timestamp });
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const wid = `WID-MUS-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
      setWitnessData({ wid, fileHash, frequencies, publicKeyJWK, signature, timestamp });
      toast.success("Witness ID generated — your sound is now sealed");
    } catch (err: any) {
      toast.error("WID generation failed: " + (err?.message || "Unknown error"));
    } finally {
      setGeneratingWid(false);
    }
  };

  // Helper: upload file to S3 via multipart POST
  const uploadFileToS3 = async (file: File, type: "audio" | "cover" | "video"): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("filename", file.name);
    const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || `Upload failed (${res.status})`); }
    return res.json();
  };

  // ── Upload / Publish ──
  const uploadMutation = trpc.songs.upload.useMutation({
    onSuccess: (data: any) => {
      setUploadPhase("done");
      if (data?.witnessId && title) {
        addWIDSnapshot({ wid: data.witnessId, title, creator: "", contentType: "music", timestamp: Date.now(), verified: true });
      }
      toast.success("Your music has been witnessed. The frequencies are now permanent.");
      if (data?.songId) navigate(`/song/${data.songId}`);
      else navigate("/dashboard");
    },
    onError: (e: { message: string }) => { toast.error(e.message); setUploadPhase("idle"); },
  });

  const handlePublish = async () => {
    if (!audioFile || !title) { toast.error("Audio and title are required"); return; }
    setUploadPhase("uploading");
    try {
      const { url: fileUrl, key: fileKey } = await uploadFileToS3(audioFile, "audio");
      let coverArtUrl: string | undefined;
      if (coverFile) {
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
      }
      uploadMutation.mutate({
        fileUrl, fileKey, coverArtUrl,
        title, genre: genre || undefined,
        bpm: bpm ? parseInt(bpm) : undefined, keySignature: keySignature || undefined,
        albumName: albumName || undefined, releaseDate: releaseDate || undefined,
        isrc: isrc || undefined, aiConsent, ownershipStatus: "full",
        moodTags: selectedMoods, coWriters: [],
        creditsJson: credits.filter(c => c.role && c.name).length > 0 ? JSON.stringify(credits.filter(c => c.role && c.name)) : undefined,
        caption: caption || undefined,
        playerAssetType,
        contentType: "audio" as any,
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
        ecdsaSignature: witnessData?.signature,
        aiDisclosure,
        lyrics: lyrics || undefined,
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadPhase("idle");
    }
  };

  // ── Left Panel Content ──
  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-6">
            {/* Welcome message */}
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Upload Your Sound
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.welcome}
              </p>
            </div>

            {/* Audio Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setAudioDragging(true); }}
              onDragLeave={() => setAudioDragging(false)}
              onDrop={handleAudioDrop}
              onClick={() => audioInputRef.current?.click()}
              className="relative cursor-pointer rounded-2xl p-8 text-center transition-all duration-300"
              style={{
                background: audioDragging ? "rgba(167,139,250,0.08)" : audioFile ? "rgba(74,222,128,0.04)" : "rgba(17,16,9,0.6)",
                border: `2px dashed ${audioDragging ? atmosphere.colorPrimary : audioFile ? "var(--ln-seal-bright)" : atmosphere.colorBorder}`,
                boxShadow: audioDragging ? `0 0 30px ${atmosphere.colorGlow}` : "none",
              }}
            >
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
              {audioFile ? (
                <div className="space-y-2">
                  <CheckCircle2 size={32} style={{ color: "var(--ln-seal-bright)" }} className="mx-auto" />
                  <p className="text-sm font-medium" style={{ color: "var(--ln-parchment)" }}>{audioFile.name}</p>
                  <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
                    {(audioFile.size / (1024 * 1024)).toFixed(1)} MB • Click to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Music size={36} style={{ color: atmosphere.colorPrimary }} className="mx-auto opacity-60" />
                  <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>
                    Drop your audio file here
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                    MP3, WAV, FLAC, M4A, OGG • Up to 375 MB
                  </p>
                </div>
              )}
            </div>

            {/* Cover Art */}
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: "rgba(245,237,216,0.7)" }}>Cover Art</p>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="cursor-pointer rounded-xl p-4 flex items-center gap-3 transition-all hover:opacity-80"
                style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}
              >
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCoverFile(e.target.files[0]); }} />
                {coverFile ? (
                  <>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--ln-parchment)" }}>{coverFile.name}</p>
                      <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>Click to replace</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon size={20} style={{ color: "rgba(245,237,216,0.4)" }} />
                    <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>Add cover art (square preferred)</p>
                  </>
                )}
              </div>
            </div>

            {/* Video (optional) */}
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: "rgba(245,237,216,0.7)" }}>Music Video <span className="opacity-50">(optional)</span></p>
              <div
                onClick={() => videoInputRef.current?.click()}
                className="cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all hover:opacity-80"
                style={{ background: "rgba(17,16,9,0.4)", border: `1px solid rgba(196,154,40,0.08)` }}
              >
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setVideoFile(e.target.files[0]); }} />
                <Video size={16} style={{ color: "rgba(245,237,216,0.3)" }} />
                <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                  {videoFile ? videoFile.name : "Add music video"}
                </p>
              </div>
            </div>

            {/* Next button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => { if (!audioFile) { toast.error("Drop an audio file first"); return; } setStep("metadata"); }}
                disabled={!audioFile}
                className="gap-2"
                style={{ background: atmosphere.colorPrimary, color: "#000000" }}
              >
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "metadata":
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Name the Frequencies
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.metadataPrompt}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Track Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your creation" className="bg-transparent border-[rgba(167,139,250,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)]" />
            </div>

            {/* Genre */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}`, color: "var(--ln-parchment)" }}>
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* BPM + Key */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>BPM</label>
                <Input value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="120" type="number" className="bg-transparent border-[rgba(167,139,250,0.2)] text-[var(--ln-parchment)]" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Key</label>
                <Input value={keySignature} onChange={(e) => setKeySignature(e.target.value)} placeholder="C minor" className="bg-transparent border-[rgba(167,139,250,0.2)] text-[var(--ln-parchment)]" />
              </div>
            </div>

            {/* Moods */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "rgba(245,237,216,0.7)" }}>Mood Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map(m => (
                  <button key={m} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                    className="px-2.5 py-1 rounded-full text-[10px] transition-all"
                    style={{ background: selectedMoods.includes(m) ? `${atmosphere.colorPrimary}20` : "rgba(17,16,9,0.6)", border: `1px solid ${selectedMoods.includes(m) ? atmosphere.colorPrimary : "rgba(196,154,40,0.12)"}`, color: selectedMoods.includes(m) ? atmosphere.colorPrimary : "rgba(245,237,216,0.5)" }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Consent */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "rgba(245,237,216,0.7)" }}>AI Training Consent</label>
              <div className="space-y-2">
                {AI_CONSENT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setAiConsent(opt.value)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                    style={{ background: aiConsent === opt.value ? `${opt.color}12` : "transparent", border: `1px solid ${aiConsent === opt.value ? opt.color : "rgba(196,154,40,0.08)"}`, color: aiConsent === opt.value ? opt.color : "rgba(245,237,216,0.5)" }}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lyrics */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Lyrics <span className="opacity-50">(optional)</span></label>
              <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste your lyrics here..." rows={4} className="bg-transparent border-[rgba(167,139,250,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-xs" />
            </div>

            {/* Caption */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Caption / Description</label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Tell the story behind this track..." rows={3} className="bg-transparent border-[rgba(167,139,250,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-xs" />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button onClick={() => { if (!title) { toast.error("Title is required"); return; } setStep("provenance"); }} disabled={!title} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "provenance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Seal Your Provenance
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.provenancePrompt}
              </p>
            </div>

            {/* WID Generation */}
            {!witnessData ? (
              <div className="text-center py-8">
                <Shield size={48} style={{ color: atmosphere.colorPrimary }} className="mx-auto mb-4 opacity-60" />
                <p className="text-sm mb-4" style={{ color: "var(--ln-parchment)" }}>
                  Generate your cryptographic Witness ID
                </p>
                <p className="text-[11px] mb-6 max-w-sm mx-auto" style={{ color: "rgba(245,237,216,0.5)" }}>
                  This creates a SHA-256 hash of your audio file and signs it with an ECDSA keypair — proving you possessed this exact file at this moment.
                </p>
                <Button onClick={generateWID} disabled={generatingWid} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
                  {generatingWid ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generatingWid ? "Generating..." : "Generate Witness ID"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* WID Display */}
                <div className="p-4 rounded-xl" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} style={{ color: "var(--ln-seal-bright)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--ln-seal-bright)" }}>Witness ID Sealed</span>
                  </div>
                  <p className="font-mono text-sm mb-1" style={{ color: "var(--ln-parchment)" }}>{witnessData.wid}</p>
                  <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                    Timestamp: {new Date(witnessData.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Harmonic Waveform */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: atmosphere.colorPrimary }}>Harmonic Signature</p>
                  <HarmonicWaveform frequencies={witnessData.frequencies} active={waveformActive} />
                </div>

                {/* Frequencies */}
                <div className="flex flex-wrap gap-1">
                  {witnessData.frequencies.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] font-mono" style={{ borderColor: atmosphere.colorBorder, color: atmosphere.colorPrimary }}>
                      {f.toFixed(1)} Hz
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("metadata")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button onClick={() => setStep("publish")} disabled={!witnessData} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "publish":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Publish Your Manifestation
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.publishPrompt}
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: atmosphere.colorPrimary }}>Track</p>
                <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{title}</p>
                {genre && <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>{genre}</p>}
              </div>
              {witnessData && (
                <div className="p-3 rounded-lg" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)" }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--ln-seal-bright)" }}>Provenance</p>
                  <p className="text-xs font-mono" style={{ color: "var(--ln-seal-bright)" }}>{witnessData.wid}</p>
                </div>
              )}
            </div>

            {/* Publish button */}
            <Button
              onClick={handlePublish}
              disabled={uploadPhase !== "idle"}
              className="w-full gap-2 py-6 text-base font-semibold"
              style={{ background: "var(--ln-gold)", color: "#000000", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}
            >
              {uploadPhase === "uploading" ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {uploadPhase === "uploading" ? "Publishing..." : "Publish to Living Nexus"}
            </Button>

            {/* Navigation */}
            <div className="flex justify-start pt-2">
              <Button variant="outline" onClick={() => setStep("provenance")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Right Panel Content (Live Preview) ──
  const renderRightPanel = () => (
    <div className="space-y-5">
      {/* Preview Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: atmosphere.colorPrimary }}>
          Live Preview
        </p>
        <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
          Your manifestation as it will appear
        </p>
      </div>

      {/* Cover Art Preview */}
      <div className="aspect-square rounded-2xl overflow-hidden" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}` }}>
        {coverPreview ? (
          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={48} style={{ color: "rgba(167,139,250,0.2)" }} />
          </div>
        )}
      </div>

      {/* Title Preview */}
      <div>
        <p className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
          {title || "Untitled Track"}
        </p>
        <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>
          {user?.name || "Creator"} {genre ? `• ${genre}` : ""}
        </p>
      </div>

      {/* Audio Preview */}
      {audioFile && <AudioPreview file={audioFile} />}

      {/* Waveform (when provenance is generated) */}
      {witnessData && (
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: atmosphere.colorPrimary }}>
            Harmonic Identity
          </p>
          <HarmonicWaveform frequencies={witnessData.frequencies} active={waveformActive} />
        </div>
      )}

      {/* Provenance Indicator */}
      <ProvenanceIndicator
        status={witnessData ? "sealed" : generatingWid ? "generating" : "pending"}
        wid={witnessData?.wid}
        atmosphere={atmosphere}
      />

      {/* Reassurance */}
      <ReassuranceMessage
        message={
          step === "upload" ? "Your file never leaves your browser until you explicitly publish."
          : step === "metadata" ? "Metadata helps discovery — but your provenance is what proves ownership."
          : step === "provenance" ? "The Witness ID is generated entirely client-side. No server sees your private key."
          : "Once published, your work is permanently witnessed on the Living Nexus provenance chain."
        }
        atmosphere={atmosphere}
      />

      {/* Integrity Indicators */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(245,237,216,0.4)" }}>Integrity Checks</p>
        <div className="space-y-1.5">
          {[
            { label: "Audio file loaded", done: !!audioFile },
            { label: "Cover art attached", done: !!coverFile },
            { label: "Title assigned", done: !!title },
            { label: "Witness ID sealed", done: !!witnessData },
          ].map((check, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: check.done ? "var(--ln-seal-bright)" : "rgba(196,154,40,0.1)", border: `1px solid ${check.done ? "var(--ln-seal-bright)" : "rgba(196,154,40,0.2)"}` }}>
                {check.done && <CheckCircle2 size={8} color="#000000" />}
              </div>
              <span className="text-[11px]" style={{ color: check.done ? "var(--ln-seal-bright)" : "rgba(245,237,216,0.4)" }}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <StudioShell
      atmosphere={atmosphere}
      currentStep={step}
      onBack={onBack}
      leftPanel={renderLeftPanel()}
      rightPanel={renderRightPanel()}
      progress={progress}
    />
  );
}
