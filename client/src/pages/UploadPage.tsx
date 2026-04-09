/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — UploadPage (Full-Stack tRPC)
   Divine Noir: Upload + Witness ID Generator unified flow
   Steps: 1) Drop audio/art  2) Track metadata  3) Provenance / Witness ID  4) Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Upload, Music, Image as ImageIcon, Check, Shield, ShieldCheck, ChevronRight,
  ChevronLeft, Play, Download, Copy, RefreshCw, Zap, Loader2,
  Sparkles, CheckCircle2, X as XIcon, Video, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { runUploadPipeline, type UploadMetadata } from "@/lib/uploadPipeline";
import { CosmicMediumIcon } from "@/components/CosmicMediumIcon";
import { HAAIDeclarationForm, EMPTY_HAAI } from "@/components/HAAIDeclarationForm";

const GENRES = [
  "Ambient / Lo-fi", "Electronic / House", "Gospel / Worship",
  "Classical / Jazz", "Hip-Hop / Trap", "Rock / Indie",
  "R&B / Soul", "Pop", "Other",
];

const MOODS = ["War", "Healing", "Loss", "Triumph", "Faith", "Love", "Protest", "Documentary", "Joy", "Lament"];

const AI_CONSENT_OPTIONS = [
  { value: "prohibited" as const, label: "AI Training PROHIBITED", color: "oklch(0.65 0.18 25)", desc: "No AI system may train on this work" },
  { value: "permitted_attribution" as const, label: "Permitted with Attribution", color: "oklch(0.84 0.155 85)", desc: "AI training allowed only with full credit" },
  { value: "permitted" as const, label: "Freely Permitted", color: "oklch(0.65 0.18 145)", desc: "Open for AI training and derivative use" },
];

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hashBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

async function generateECDSAKeypair() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}

async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, enc.encode(payload));
  const sigBytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
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
    const ratio = (chunk % 1000) / 1000;
    return Math.round(base * (0.85 + ratio * 0.3) * 10) / 10;
  });
}

function formatWID(hashHex: string): string {
  return `WID-MUS-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
}

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
      grad.addColorStop(0, "rgba(212,175,55,0)");
      grad.addColorStop(0.3, "rgba(212,175,55,0.9)");
      grad.addColorStop(0.7, "rgba(124,58,237,0.9)");
      grad.addColorStop(1, "rgba(124,58,237,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const t = tRef.current;
        let y = H / 2;
        frequencies.forEach((f, i) => {
          const amp = (H / 2 - 8) / frequencies.length;
          y += amp * Math.sin((x / W) * f * 0.04 + t * (0.5 + i * 0.15));
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
    <canvas ref={canvasRef} width={500} height={80} className="w-full rounded-xl"
      style={{ background: "oklch(0.125 0.028 52)" }} />
  );
}

function playIdentityChord(frequencies: number[]) {
  const ctx = new AudioContext();
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.5);
  });
}

type Step = 1 | 2 | 3 | 4;

interface WitnessData {
  wid: string; fileHash: string; frequencies: number[];
  publicKeyJWK: string; signature: string; timestamp: string;
}

export default function UploadPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const { data: newThisWeekData } = trpc.songs.newThisWeek.useQuery({ limit: 1 });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [audioDragging, setAudioDragging] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [keySignature, setKeySignature] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [isrc, setIsrc] = useState("");
  const [bmiNumber, setBmiNumber] = useState("");
  const [lyrics, setLyrics] = useState("");
  // Credits: array of { role, name } entries
  const [credits, setCredits] = useState<{ role: string; name: string }[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");
  const [aiDisclosure, setAiDisclosure] = useState<"original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument">("original");
  const [haaiDeclaration, setHaaiDeclaration] = useState({
    haaiVisualConcept: "",
    haaiStyleLanguage: "",
    haaiInstrumentation: "",
    haaiVocalConveyance: "",
    haaiLyricalInspiration: "",
    haaiEmotionalTone: "",
  });
  const [caption, setCaption] = useState("");
  const [captionSuggestion, setCaptionSuggestion] = useState<string | null>(null);
  const [captionState, setCaptionState] = useState<"idle" | "loading" | "suggested" | "accepted">("idle");

  const [uploadMode, setUploadMode] = useState<"audio" | "lyrics" | "manuscript" | "comic">("audio");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [witnessData, setWitnessData] = useState<WitnessData | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [pipelineMeta, setPipelineMeta] = useState<UploadMetadata | null>(null);

  // Load creator profile defaults (aiDisclosure, primaryGenre)
  const { data: creatorProfile } = trpc.profile.me.useQuery(undefined, { enabled: !!user });

  // Auto-fill genre from profile default (only when genre is still empty)
  useEffect(() => {
    if (creatorProfile?.primaryGenre && !genre) {
      setGenre(creatorProfile.primaryGenre);
    }
  }, [creatorProfile?.primaryGenre]);

  // Pre-fill from Prompt Studio query params (?title=&genre=&mood=&tags=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qTitle = params.get("title");
    const qGenre = params.get("genre");
    const qMood = params.get("mood");
    const qTags = params.get("tags");
    if (qTitle) setTitle(qTitle);
    if (qGenre) setGenre(qGenre);
    if (qMood) {
      // mood maps to selectedMoods array
      const moods = qMood.split(",").map(m => m.trim()).filter(Boolean);
      if (moods.length) setSelectedMoods(moods);
    }
    if (qTags) {
      // style tags go into caption field as a starting point
      setCaption(qTags);
    }
    // Clean the URL so refreshing doesn't re-apply
    if (qTitle || qGenre || qMood || qTags) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const generateCaptionMutation = trpc.songs.generateCaption.useMutation({
    onSuccess: (data) => {
      setCaptionSuggestion(data.caption);
      setCaptionState("suggested");
    },
    onError: (e: { message: string }) => {
      toast.error(e.message || "Caption generation failed");
      setCaptionState("idle");
    },
  });

  const handleGenerateCaption = () => {
    if (!title) { toast.error("Add a track title first"); return; }
    setCaptionState("loading");
    // Only title and genre are sent — lyrics are WID-protected and never sent to AI
    generateCaptionMutation.mutate({ title, genre: genre || undefined });
  };

  const handleAcceptCaption = () => {
    if (captionSuggestion) {
      setCaption(captionSuggestion);
      setCaptionState("accepted");
      setCaptionSuggestion(null);
      toast.success("Caption accepted");
    }
  };

  const handleIgnoreCaption = () => {
    setCaptionSuggestion(null);
    setCaptionState("idle");
  };

  // uploadVideoByUrl: links a video that was already uploaded via the streaming relay
  const uploadVideoByUrlMutation = trpc.songs.uploadVideoByUrl.useMutation();

  const uploadMutation = trpc.songs.upload.useMutation({
    onSuccess: async (data: any) => {
      // If a video file was selected, upload it via streaming relay then link by URL
      if (videoFile && data?.songId) {
        try {
          toast.loading("Uploading music video…", { id: "upload-video" });
          // Upload via streaming relay — avoids base64 encoding and proxy size limit
          const { url: videoUrl, key: videoKey } = await uploadFileToS3(videoFile, "video");
          toast.dismiss("upload-video");
          // Compute SHA-256 witness for the video file
          const videoBuf = await videoFile.arrayBuffer();
          const videoHash = await sha256Hex(videoBuf);
          const videoWitnessId = `WID-VID-${videoHash.slice(0, 8).toUpperCase()}-${videoHash.slice(8, 16).toUpperCase()}`;
          await uploadVideoByUrlMutation.mutateAsync({
            songId: data.songId,
            videoUrl,
            videoKey,
            videoMimeType: videoFile.type || "video/mp4",
            videoWitnessId,
          });
          toast.success("Music video uploaded and witnessed!");
        } catch (err: any) {
          toast.dismiss("upload-video");
          toast.error("Audio published but video upload failed: " + (err?.message || "Unknown error"));
        }
      } else {
        toast.success("Track published to Living Nexus!");
      }
      // Cache WID snapshot locally (offline proof memory, 24h TTL)
      if (data?.witnessId && title) {
        addWIDSnapshot({
          wid: data.witnessId,
          title,
          creator: "", // filled from auth context on read
          contentType: uploadMode,
          timestamp: Date.now(),
          verified: true,
        });
      }
      navigate("/dashboard");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setAudioDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      if (file.size > 375 * 1024 * 1024) {
        toast.error(`File too large (${(file.size/1024/1024).toFixed(0)} MB). Maximum size is 375 MB. Consider converting WAV to MP3 first.`);
        return;
      }
      setAudioFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    } else {
      toast.error("Please drop an audio file");
    }
  }, [title]);

  const handleGenerateWid = async () => {
    if (uploadMode === "manuscript" || uploadMode === "comic") {
      // Hash the document file for manuscript/comic
      if (!documentFile) { toast.error("Please select a file first"); return; }
      setGeneratingWid(true);
      try {
        const buffer = await documentFile.arrayBuffer();
        const fileHash = await sha256Hex(buffer);
        const prefix = uploadMode === "manuscript" ? "WID-MAN" : "WID-CMX";
        const wid = `${prefix}-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
        const frequencies = deriveHarmonicFrequencies(fileHash);
        const keypair = await generateECDSAKeypair();
        const payload = `${wid}|${title || documentFile.name}|${user?.name || ""}|${Date.now()}`;
        const signature = await signPayload(keypair.privateKey, payload);
        const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
        const timestamp = new Date().toISOString();
        setWitnessData({ wid, fileHash, frequencies, publicKeyJWK, signature, timestamp });
        setWaveformActive(true);
        toast.success(`Witness ID generated — ${uploadMode === "manuscript" ? "manuscript" : "comic"} provenance established`);
      } catch {
        toast.error("Failed to generate Witness ID");
      } finally {
        setGeneratingWid(false);
      }
      return;
    }
    if (uploadMode === "lyrics") {
      if (!lyrics.trim()) { toast.error("Please enter lyrics text first"); return; }
      setGeneratingWid(true);
      try {
        const enc = new TextEncoder();
        const buffer = enc.encode(lyrics);
        const fileHash = await sha256Hex(buffer.buffer as ArrayBuffer);
        const wid = formatWID(fileHash);
        const frequencies = deriveHarmonicFrequencies(fileHash);
        const keypair = await generateECDSAKeypair();
        const payload = `${wid}|${title}|${user?.name || ""}|${Date.now()}|LYRICS:${lyrics.slice(0, 500)}`;
        const signature = await signPayload(keypair.privateKey, payload);
        const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
        const timestamp = new Date().toISOString();
        setWitnessData({ wid, fileHash, frequencies, publicKeyJWK, signature, timestamp });
        setWaveformActive(true);
        toast.success("Witness ID generated — lyrics provenance established");
      } catch {
        toast.error("Failed to generate Witness ID");
      } finally {
        setGeneratingWid(false);
      }
      return;
    }
    if (!audioFile) { toast.error("Please select an audio file first"); return; }
    setGeneratingWid(true);
    try {
      // Run the full upload pipeline: SHA-256 + audio metadata extraction
      const meta = await runUploadPipeline(audioFile, "audio");
      setPipelineMeta(meta);
      const fileHash = meta.fileHash;
      const wid = formatWID(fileHash);
      const frequencies = deriveHarmonicFrequencies(fileHash);
      const keypair = await generateECDSAKeypair();
      const payload = `${wid}|${title || audioFile.name}|${user?.name || ""}|${Date.now()}${lyrics ? `|LYRICS:${lyrics.slice(0, 500)}` : ""}`;
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const timestamp = new Date().toISOString();
      setWitnessData({ wid, fileHash, frequencies, publicKeyJWK, signature, timestamp });
      setWaveformActive(true);
      // Auto-fill BPM duration hint if not already set
      if (meta.durationSeconds && !bpm) {
        // Just a hint in the toast — user sets BPM manually
        toast.success(`Witness ID generated — ${Math.floor(meta.durationSeconds / 60)}:${String(Math.floor(meta.durationSeconds % 60)).padStart(2, "0")} · ${(meta.sampleRate ?? 0) / 1000} kHz · cryptographic provenance established`);
      } else {
        toast.success("Witness ID generated — cryptographic provenance established");
      }
    } catch {
      toast.error("Failed to generate Witness ID");
    } finally {
      setGeneratingWid(false);
    }
  };

  const downloadCertificate = () => {
    if (!witnessData) return;
    const consentColor = aiConsent === "prohibited" ? "#ef4444" : aiConsent === "permitted_attribution" ? "#d4af37" : "#22c55e";
    const consentLabel = aiConsent === "prohibited" ? "AI TRAINING PROHIBITED" : aiConsent === "permitted_attribution" ? "PERMITTED WITH ATTRIBUTION" : "FREELY PERMITTED";
    const freqChips = witnessData.frequencies.map(f => `<span style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:4px 12px;font-size:11px;color:#A78BFA">${f} Hz</span>`).join(" ");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Witness Certificate — ${witnessData.wid}</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
<style>body{background:#0a0a0a;color:#e0e0e0;font-family:'Share Tech Mono',monospace;padding:40px}.cert{max-width:780px;margin:0 auto;border:1px solid rgba(212,175,55,0.4);border-radius:12px;overflow:hidden}.header{background:linear-gradient(135deg,#0f0f0f,#1a1a1a);padding:32px 40px;border-bottom:1px solid rgba(212,175,55,0.2)}.org{font-family:'Orbitron',sans-serif;font-size:10px;color:#d4af37;letter-spacing:0.15em;margin-bottom:4px}.title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:#fff}.body{padding:32px 40px}.wid-box{background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.25);border-radius:8px;padding:20px;margin-bottom:28px;text-align:center}.wid-label{font-size:10px;letter-spacing:0.15em;color:#d4af37;margin-bottom:8px}.wid-value{font-family:'Orbitron',sans-serif;font-size:26px;font-weight:900;color:#d4af37}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.field{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:12px}.field-label{font-size:9px;letter-spacing:0.14em;color:rgba(255,255,255,0.35);margin-bottom:4px}.field-value{font-size:13px}.consent-box{background:rgba(0,0,0,0.3);border:2px solid ${consentColor};border-radius:8px;padding:16px;margin-bottom:24px;text-align:center}.consent-label{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;color:${consentColor}}.section-title{font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:0.14em;color:rgba(255,255,255,0.3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06)}.mono-block{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:12px;font-size:10px;color:rgba(255,255,255,0.5);word-break:break-all;margin-bottom:20px;line-height:1.6}.footer{background:#0d0d0d;border-top:1px solid rgba(212,175,55,0.15);padding:20px 40px;display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.25)}</style></head>
<body><div class="cert"><div class="header"><div class="org">COMMAND DOMAINS LLC / BDDT PUBLISHING — SOVEREIGN SHUTTER™ FRAMEWORK</div><div class="title">MUSIC WITNESS CERTIFICATE</div></div>
<div class="body"><div class="wid-box"><div class="wid-label">WITNESS ID</div><div class="wid-value">${witnessData.wid}</div></div>
<div class="grid"><div class="field"><div class="field-label">CREATOR</div><div class="field-value">${user?.name || "—"}</div></div><div class="field"><div class="field-label">SONG TITLE</div><div class="field-value">${title || "—"}</div></div><div class="field"><div class="field-label">ALBUM</div><div class="field-value">${albumName || "—"}</div></div><div class="field"><div class="field-label">GENRE</div><div class="field-value">${genre || "—"}</div></div><div class="field"><div class="field-label">BPM / KEY</div><div class="field-value">${bpm || "—"} / ${keySignature || "—"}</div></div><div class="field"><div class="field-label">RELEASE DATE</div><div class="field-value">${releaseDate || "—"}</div></div><div class="field"><div class="field-label">BMI MEMBER #</div><div class="field-value">${bmiNumber || "—"}</div></div><div class="field"><div class="field-label">ISRC CODE</div><div class="field-value">${isrc || "—"}</div></div></div>
<div class="consent-box"><div class="consent-label">⚡ AI CONSENT: ${consentLabel}</div></div>
<div class="section-title">HARMONIC FREQUENCY SIGNATURE</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">${freqChips}</div>
<div class="section-title">SHA-256 FILE HASH</div><div class="mono-block">${witnessData.fileHash}</div>
<div class="section-title">ECDSA P-256 PUBLIC KEY (JWK)</div><div class="mono-block">${witnessData.publicKeyJWK}</div>
<div class="section-title">ECDSA SIGNATURE</div><div class="mono-block">${witnessData.signature}</div></div>
<div class="footer"><span>LIVING NEXUS — BDDT PUBLISHING / COMMAND DOMAINS LLC</span><span>${witnessData.timestamp}</span></div></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `WID-${witnessData.wid}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  // Helper: compress cover art to WebP (max 400x400) before upload
  // Reduces file size by ~70-90% vs original JPEG/PNG — safe for Safari 16.4+, Brave, Chrome
  const compressCoverArt = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // If already small or not an image, skip compression
      if (file.size < 50_000 || !file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
            resolve(compressed);
          },
          "image/webp",
          0.82 // quality 82% — good balance of size vs fidelity
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  };

  // Helper: upload a single file via multipart POST to /api/upload-file
  // For audio files, uses XHR so we can track upload progress
  const uploadFileToS3 = async (
    file: File,
    type: "audio" | "cover" | "video",
    onProgress?: (pct: number) => void
  ): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("filename", file.name);

    if (onProgress) {
      // Use XHR for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload-file");
        xhr.withCredentials = true;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error("Invalid server response")); }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
    }

    // Fallback: plain fetch for cover art / video (no progress needed)
    const res = await fetch("/api/upload-file", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return res.json();
  };

  const handlePublish = async () => {
    if (uploadMode === "manuscript" || uploadMode === "comic") {
      if (!title || !documentFile) { toast.error("Title and file are required"); return; }
      try {
        let fileUrl: string | undefined;
        let fileKey: string | undefined;
        let coverArtUrl: string | undefined;
        // Upload the document file as a generic file
        const { url: docUrl, key: docKey } = await uploadFileToS3(documentFile, "audio");
        fileUrl = docUrl;
        fileKey = docKey;
        if (coverFile) {
          const compressed = await compressCoverArt(coverFile);
          const { url } = await uploadFileToS3(compressed, "cover");
          coverArtUrl = url;
        }
        uploadMutation.mutate({
          fileUrl, fileKey, coverArtUrl, title, genre: genre || undefined,
          albumName: albumName || undefined, releaseDate: releaseDate || undefined,
          isrc: isrc || undefined, aiConsent, moodTags: selectedMoods, coWriters: [],
          creditsJson: credits.filter(c => c.role && c.name).length > 0 ? JSON.stringify(credits.filter(c => c.role && c.name)) : undefined,
          caption: caption || undefined,
          contentType: uploadMode,
          fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
          harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
          ecdsaSignature: witnessData?.signature,
          aiDisclosure,
          ...(aiDisclosure === "human_authored_ai_instrument" ? haaiDeclaration : {}),
        } as any);
      } catch (err: any) { toast.error(err.message || "Failed to prepare upload"); }
      return;
    }
    if (uploadMode === "lyrics") {
      if (!title || !lyrics.trim()) { toast.error("Title and lyrics are required"); return; }
      try {
        // Lyrics-only: cover art may still be an image, upload via multipart
        let coverArtUrl: string | undefined;
        if (coverFile) {
          const compressed = await compressCoverArt(coverFile);
          const { url } = await uploadFileToS3(compressed, "cover");
          coverArtUrl = url;
        }
        uploadMutation.mutate({
          coverArtUrl, title, genre: genre || undefined,
          bpm: bpm ? parseInt(bpm) : undefined, keySignature: keySignature || undefined,
          albumName: albumName || undefined, releaseDate: releaseDate || undefined,
          isrc: isrc || undefined, aiConsent, moodTags: selectedMoods, coWriters: [],
          creditsJson: credits.filter(c => c.role && c.name).length > 0 ? JSON.stringify(credits.filter(c => c.role && c.name)) : undefined,
          lyricsText: lyrics,
          lyricsHash: witnessData?.fileHash,
          isLyricsOnly: true,
          contentType: "lyrics",
          fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
          harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
          ecdsaSignature: witnessData?.signature,
          caption: caption || undefined,
          aiDisclosure,
          ...(aiDisclosure === "human_authored_ai_instrument" ? haaiDeclaration : {}),
        } as any);
      } catch (err: any) { toast.error(err.message || "Failed to prepare upload"); }
      return;
    }
    if (!audioFile || !title) { toast.error("Audio file and title are required"); return; }
    try {
      // Upload audio with progress tracking
      setUploadProgress(0);
      setUploadPhase("uploading");
      const { url: fileUrl, key: fileKey } = await uploadFileToS3(audioFile, "audio", (pct) => {
        setUploadProgress(pct);
      });
      setUploadPhase("processing");
      let coverArtUrl: string | undefined;
      if (coverFile) {
        const compressed = await compressCoverArt(coverFile);
        const { url } = await uploadFileToS3(compressed, "cover");
        coverArtUrl = url;
      }
      uploadMutation.mutate({
        fileUrl, fileKey, coverArtUrl,
        title, genre: genre || undefined,
        bpm: bpm ? parseInt(bpm) : undefined, keySignature: keySignature || undefined,
        albumName: albumName || undefined, releaseDate: releaseDate || undefined,
        isrc: isrc || undefined, aiConsent, moodTags: selectedMoods, coWriters: [],
        creditsJson: credits.filter(c => c.role && c.name).length > 0 ? JSON.stringify(credits.filter(c => c.role && c.name)) : undefined,
        lyricsText: lyrics || undefined,
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
        ecdsaSignature: witnessData?.signature,
        caption: caption || undefined,
        // Audio metadata from upload pipeline
        durationSeconds: pipelineMeta?.durationSeconds,
        sampleRate: pipelineMeta?.sampleRate,
        bitDepth: pipelineMeta?.bitDepth,
        aiDisclosure,
        ...(aiDisclosure === "human_authored_ai_instrument" ? haaiDeclaration : {}),
      } as any);
    } catch (err: any) {
      setUploadPhase("idle");
      setUploadProgress(0);
      toast.error(err.message || "Failed to prepare upload");
    }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center max-w-sm mx-auto px-6">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "oklch(0.84 0.155 85)" }} />
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Sign In Required</h2>
        <p className="text-sm mb-6" style={{ color: "#E2E8F0" }}>Sign in to upload tracks to Living Nexus.</p>
        <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>Sign In</Button>
      </div>
    </div>
  );

  const steps = [
    { n: 1 as Step, label: "Files", icon: Music },
    { n: 2 as Step, label: "Metadata", icon: ImageIcon },
    { n: 3 as Step, label: "Witness ID", icon: Shield },
    { n: 4 as Step, label: "Publish", icon: Upload },
  ];

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="container py-10 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>Upload Track</h1>
              <p className="text-sm" style={{ color: "#E2E8F0" }}>Publish your music with cryptographic provenance — BDDT Publishing / Command Domains LLC</p>
            </div>
            <button
              onClick={() => navigate("/batch-upload")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body flex-shrink-0 transition-all"
              style={{ background: "oklch(0.148 0.025 52)", border: "1px solid oklch(0.22 0.02 280)", color: "oklch(0.65 0.12 85)" }}
            >
              <Upload size={12} /> Batch Upload
            </button>
          </div>
        </div>

        {/* New This Week nudge — show when no tracks dropped this week */}
        {newThisWeekData !== undefined && newThisWeekData.length === 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm"
            style={{ background: "oklch(0.148 0.025 52)", border: "1px solid oklch(0.80 0.145 82 / 0.3)" }}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "oklch(0.80 0.145 82)" }} />
            <span style={{ color: "oklch(0.75 0.08 85)" }}>
              Nothing dropped this week — <strong style={{ color: "oklch(0.90 0.12 82)" }}>be the first.</strong>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.n;
            const isDone = step > s.n;
            return (
              <div key={s.n} className="flex items-center gap-1 flex-1">
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: isDone ? "oklch(0.65 0.18 145)" : isActive ? "oklch(0.84 0.155 85)" : "oklch(0.158 0.030 50)", color: isDone || isActive ? "oklch(0.08 0.015 280)" : "oklch(0.45 0.03 280)" }}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: isActive ? "oklch(0.84 0.155 85)" : isDone ? "oklch(0.65 0.18 145)" : "oklch(0.45 0.03 280)" }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px flex-shrink-0" style={{ background: step > s.n ? "oklch(0.65 0.18 145 / 0.5)" : "oklch(0.2 0.015 280)" }} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl p-6 md:p-8" style={{ background: "oklch(0.125 0.028 52)", border: "1px solid oklch(0.2 0.015 280)" }}>

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Select Files</h2>

              {/* Medium Selector — Cosmic Edition */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] mb-2 font-heading" style={{ color: "oklch(0.45 0.03 280)" }}>Choose Your Medium</p>
                <div className="grid grid-cols-2 gap-2">
                  <CosmicMediumIcon
                    medium="audio"
                    size={38}
                    active={uploadMode === "audio"}
                    label="Music / Audio"
                    onClick={() => { setUploadMode("audio"); setWitnessData(null); setDocumentFile(null); }}
                  />
                  <CosmicMediumIcon
                    medium="lyrics"
                    size={38}
                    active={uploadMode === "lyrics"}
                    label="Lyrics Only"
                    onClick={() => { setUploadMode("lyrics"); setAudioFile(null); setDocumentFile(null); setWitnessData(null); }}
                  />
                  <CosmicMediumIcon
                    medium="manuscript"
                    size={38}
                    active={uploadMode === "manuscript"}
                    label="Manuscript"
                    onClick={() => { setUploadMode("manuscript"); setAudioFile(null); setDocumentFile(null); setWitnessData(null); }}
                  />
                  <CosmicMediumIcon
                    medium="comic"
                    size={38}
                    active={uploadMode === "comic"}
                    label="Comic / Novel"
                    onClick={() => { setUploadMode("comic"); setAudioFile(null); setDocumentFile(null); setWitnessData(null); }}
                  />
                </div>
              </div>

              {uploadMode === "audio" && (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setAudioDragging(true); }}
                  onDragLeave={() => setAudioDragging(false)}
                  onDrop={handleAudioDrop}
                  className="rounded-xl p-8 text-center cursor-pointer transition-all"
                  style={{ border: `2px dashed ${audioFile ? "oklch(0.65 0.18 145)" : audioDragging ? "oklch(0.84 0.155 85)" : "oklch(0.28 0.02 280)"}`, background: audioFile ? "oklch(0.65 0.18 145 / 0.05)" : audioDragging ? "oklch(0.75 0.18 85 / 0.05)" : "oklch(0.09 0.01 280)" }}>
                  <input ref={audioInputRef} type="file" accept="audio/*,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/aac,audio/ogg,audio/x-m4a,audio/mp4,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.aif" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 375 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Maximum size is 375 MB. Consider converting WAV to MP3 first.`); e.target.value = ""; return; } setAudioFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "")); } }} />
                  {audioFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "oklch(0.65 0.18 145 / 0.2)" }}>
                        <Check className="w-5 h-5" style={{ color: "oklch(0.65 0.18 145)" }} />
                      </div>
                      <p className="font-medium text-sm" style={{ color: "oklch(0.65 0.18 145)" }}>{audioFile.name}</p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="text-xs hover:underline" style={{ color: "#E2E8F0" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <Music className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.84 0.155 85)", opacity: 0.4 }} />
                      <p className="font-medium text-sm mb-1" style={{ color: "oklch(0.7 0.04 280)" }}>{audioDragging ? "Drop it!" : "Drop audio file here or click to browse"}</p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>MP3, WAV, FLAC, M4A, OGG supported</p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.04 280)" }}>On iPhone, use Safari for best file access</p>
                    </>
                  )}
                </div>
              )}

              {uploadMode === "lyrics" && (
                <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
                    <span className="text-xs font-semibold" style={{ color: "oklch(0.84 0.155 85)", letterSpacing: "0.1em" }}>LYRICS-ONLY PROTECTION</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>Your lyrics will be hashed with SHA-256 and registered with a Witness ID. No audio file required — protect your words before the music is made.</p>
                  <Textarea
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder="Paste or type your lyrics here to protect them with a Witness ID..."
                    rows={10}
                    className="font-mono text-sm resize-none"
                    style={{ background: "oklch(0.11 0.015 280)", borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.85 0.02 280)" }}
                  />
                  {lyrics.trim() && (
                    <p className="text-xs mt-2" style={{ color: "#E2E8F0" }}>{lyrics.trim().split(/\s+/).length} words · {lyrics.length} characters</p>
                  )}
                </div>
              )}

              {(uploadMode === "manuscript" || uploadMode === "comic") && (
                <div
                  onClick={() => documentInputRef.current?.click()}
                  className="rounded-xl p-8 text-center cursor-pointer transition-all"
                  style={{ border: `2px dashed ${documentFile ? (uploadMode === "manuscript" ? "oklch(0.65 0.18 145)" : "oklch(0.65 0.18 25)") : "oklch(0.28 0.02 280)"}`, background: documentFile ? "oklch(0.65 0.18 145 / 0.05)" : "oklch(0.09 0.01 280)" }}>
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept={uploadMode === "manuscript" ? ".pdf,.doc,.docx,.txt,.rtf,.epub" : ".pdf,.cbz,.cbr,.zip,.jpg,.jpeg,.png,.webp"}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 200 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Maximum 200 MB.`); e.target.value = ""; return; } setDocumentFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "")); } }}
                  />
                  {documentFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: uploadMode === "manuscript" ? "oklch(0.65 0.18 145 / 0.2)" : "oklch(0.65 0.18 25 / 0.2)" }}>
                        <Check className="w-5 h-5" style={{ color: uploadMode === "manuscript" ? "oklch(0.65 0.18 145)" : "oklch(0.65 0.18 25)" }} />
                      </div>
                      <p className="font-medium text-sm" style={{ color: uploadMode === "manuscript" ? "oklch(0.65 0.18 145)" : "oklch(0.65 0.18 25)" }}>{documentFile.name}</p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>{(documentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setDocumentFile(null); }} className="text-xs hover:underline" style={{ color: "#E2E8F0" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl block mb-3">{uploadMode === "manuscript" ? "📖" : "🎨"}</span>
                      <p className="font-medium text-sm mb-1" style={{ color: "oklch(0.7 0.04 280)" }}>
                        {uploadMode === "manuscript" ? "Drop your manuscript here or click to browse" : "Drop your comic/novel file here or click to browse"}
                      </p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>
                        {uploadMode === "manuscript" ? "PDF, DOCX, TXT, EPUB — max 200 MB" : "PDF, CBZ, CBR, ZIP, or image files — max 200 MB"}
                      </p>
                      <p className="text-xs mt-2 px-4" style={{ color: "oklch(0.45 0.03 280)" }}>
                        Your file will be SHA-256 hashed and registered with a Witness ID. The original file is stored privately.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div onClick={() => coverInputRef.current?.click()} className="rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-white/5"
                style={{ border: `2px dashed ${coverFile ? "oklch(0.65 0.2 300)" : "oklch(0.22 0.015 280)"}`, background: coverFile ? "oklch(0.65 0.2 300 / 0.05)" : "oklch(0.09 0.01 280)" }}>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }} />
                {coverFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "oklch(0.65 0.2 300)" }} />
                    <span className="text-sm" style={{ color: "oklch(0.65 0.2 300)" }}>{coverFile.name}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setCoverFile(null); }} className="text-xs hover:underline ml-2" style={{ color: "#E2E8F0" }}>Remove</button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 mx-auto mb-1" style={{ color: "oklch(0.65 0.2 300)", opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: "#E2E8F0" }}>Cover art {uploadMode === "audio" ? <span style={{ color: "oklch(0.7 0.22 25)" }}>*required</span> : <span style={{ color: "oklch(0.45 0.03 280)" }}>(optional)</span>} — JPG, PNG, WebP</p>
                    {uploadMode === "audio" && <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.03 280)" }}>Required to generate your work's visual — every audio work must be visually alive</p>}
                  </>
                )}
              </div>
              {/* Video Upload (audio mode only) */}
              {uploadMode === "audio" && (
                <div onClick={() => videoInputRef.current?.click()} className="rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-white/5"
                  style={{ border: `2px dashed ${videoFile ? "oklch(0.65 0.18 200)" : "oklch(0.22 0.015 280)"}`, background: videoFile ? "oklch(0.65 0.18 200 / 0.05)" : "oklch(0.09 0.01 280)" }}>
                  <input ref={videoInputRef} type="file" accept="video/*,video/mp4,video/quicktime,video/mov,video/x-m4v,.mp4,.mov,.m4v" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 500 * 1024 * 1024) { toast.error(`Video too large (${(f.size/1024/1024).toFixed(0)} MB). Maximum is 500 MB.`); e.target.value = ""; return; }
                        setVideoFile(f);
                      }
                    }} />
                  {videoFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "oklch(0.65 0.18 200)" }} />
                      <span className="text-sm" style={{ color: "oklch(0.65 0.18 200)" }}>{videoFile.name}</span>
                      <span className="text-xs" style={{ color: "#E2E8F0" }}>({(videoFile.size/1024/1024).toFixed(1)} MB)</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); }} className="text-xs hover:underline ml-2" style={{ color: "#E2E8F0" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <Video className="w-6 h-6 mx-auto mb-1" style={{ color: "oklch(0.65 0.18 200)", opacity: 0.4 }} />
                      <p className="text-sm" style={{ color: "#E2E8F0" }}>Music Video <span style={{ color: "oklch(0.5 0.03 280)" }}>(optional)</span> — MP4, MOV, max 500 MB</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.4 0.02 280)" }}>Video gets its own Witness ID alongside your audio</p>
                    </>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                disabled={
                  uploadMode === "audio" ? !audioFile :
                  uploadMode === "lyrics" ? !lyrics.trim() :
                  !documentFile
                }
                onClick={() => setStep(2)}
                style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                Next: Metadata <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Track Metadata</h2>
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter track title"
                  style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 flex items-center gap-2 font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>
                  Genre
                  {creatorProfile?.primaryGenre && (
                    <span className="text-[10px] font-normal" style={{ color: "#E2E8F0" }}>
                      — default from profile: <span style={{ color: "oklch(0.65 0.2 300)" }}>{creatorProfile.primaryGenre}</span>
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Allow free-text genre from profile if not in preset list */}
                  {creatorProfile?.primaryGenre && !GENRES.includes(creatorProfile.primaryGenre) && (
                    <button type="button" key="profile-genre" onClick={() => setGenre(genre === creatorProfile.primaryGenre ? "" : (creatorProfile.primaryGenre ?? ""))} className="px-3 py-1 rounded-full text-xs transition-all"
                      style={{ background: genre === creatorProfile.primaryGenre ? "oklch(0.65 0.2 300 / 0.25)" : "oklch(0.15 0.015 280)", color: genre === creatorProfile.primaryGenre ? "oklch(0.75 0.2 300)" : "oklch(0.55 0.04 280)", border: `1px solid ${genre === creatorProfile.primaryGenre ? "oklch(0.65 0.2 300 / 0.5)" : "oklch(0.22 0.015 280)"}` }}>
                      {creatorProfile.primaryGenre}
                    </button>
                  )}
                  {GENRES.map(g => (
                    <button type="button" key={g} onClick={() => setGenre(g === genre ? "" : g)} className="px-3 py-1 rounded-full text-xs transition-all"
                      style={{ background: genre === g ? "oklch(0.65 0.2 300 / 0.25)" : "oklch(0.15 0.015 280)", color: genre === g ? "oklch(0.75 0.2 300)" : "oklch(0.55 0.04 280)", border: `1px solid ${genre === g ? "oklch(0.65 0.2 300 / 0.5)" : "oklch(0.22 0.015 280)"}` }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>BPM</label>
                  <Input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120"
                    style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Key</label>
                  <Input value={keySignature} onChange={e => setKeySignature(e.target.value)} placeholder="C major"
                    style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Album</label>
                  <Input value={albumName} onChange={e => setAlbumName(e.target.value)} placeholder="Album name"
                    style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Release Date</label>
                  <Input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)}
                    style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>ISRC</label>
                  <Input value={isrc} onChange={e => setIsrc(e.target.value)} placeholder="US-XXX-YY-NNNNN"
                    style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>BMI Member #</label>
                  <Input value={bmiNumber} onChange={e => setBmiNumber(e.target.value)} placeholder="BMI number"
                    style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Mood Tags</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => (
                    <button type="button" key={m} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                      className="px-3 py-1 rounded-full text-xs transition-all"
                      style={{ background: selectedMoods.includes(m) ? "oklch(0.75 0.18 85 / 0.2)" : "oklch(0.15 0.015 280)", color: selectedMoods.includes(m) ? "oklch(0.84 0.155 85)" : "oklch(0.5 0.03 280)", border: `1px solid ${selectedMoods.includes(m) ? "oklch(0.75 0.18 85 / 0.4)" : "oklch(0.22 0.015 280)"}` }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Credits editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Credits</label>
                  <button
                    type="button"
                    onClick={() => setCredits(prev => [...prev, { role: "", name: "" }])}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all"
                    style={{ color: "oklch(0.75 0.18 145)", border: "1px solid oklch(0.75 0.18 145 / 0.3)", background: "oklch(0.75 0.18 145 / 0.06)" }}
                  >
                    <Plus size={10} /> Add credit
                  </button>
                </div>
                {credits.length === 0 && (
                  <p className="text-[11px]" style={{ color: "oklch(0.4 0.03 280)" }}>No credits added. Click "Add credit" to list co-writers, producers, engineers, etc.</p>
                )}
                <div className="space-y-2">
                  {credits.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Role (e.g. Producer)"
                        value={c.role}
                        onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                        className="flex-1"
                        style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)", fontSize: "12px" }}
                      />
                      <Input
                        placeholder="Name"
                        value={c.name}
                        onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className="flex-1"
                        style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)", fontSize: "12px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setCredits(prev => prev.filter((_, j) => j !== i))}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-red-900/20"
                        style={{ color: "oklch(0.55 0.18 25)" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-2 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>AI Training Consent</label>
                <div className="space-y-2">
                  {AI_CONSENT_OPTIONS.map(opt => (
                    <button type="button" key={opt.value} onClick={() => setAiConsent(opt.value)} className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{ background: aiConsent === opt.value ? `${opt.color.replace(")", " / 0.08)")}` : "oklch(0.13 0.015 280)", border: `1px solid ${aiConsent === opt.value ? opt.color.replace(")", " / 0.35)") : "oklch(0.2 0.015 280)"}` }}>
                      <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 transition-all"
                        style={{ background: aiConsent === opt.value ? opt.color : "transparent", border: `2px solid ${opt.color}` }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: opt.color }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* AI Authorship Disclosure */}
              <div>
                <label className="text-xs mb-2 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>AI AUTHORSHIP DISCLOSURE</label>
                <div className="space-y-2">
                  {([
                    { value: "original" as const, label: "Human Original", color: "oklch(0.65 0.18 145)", desc: "Entirely human-made. No AI tools used in creation." },
                    { value: "ai_assisted" as const, label: "AI-Assisted", color: "oklch(0.84 0.155 85)", desc: "AI used as a production aid. Human vision, human direction." },
                    { value: "human_authored_ai_instrument" as const, label: "Human-Authored via AI Instrument (HAAI)", color: "oklch(0.7 0.18 280)", desc: "You authored the intent and directed the work. AI was the instrument, not the author." },
                    { value: "ai_generated" as const, label: "AI-Generated", color: "oklch(0.65 0.18 25)", desc: "AI generated the primary content." },
                  ] as const).map(opt => (
                    <button type="button" key={opt.value} onClick={() => setAiDisclosure(opt.value)} className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{ background: aiDisclosure === opt.value ? `${opt.color.replace(")", " / 0.08)")}` : "oklch(0.13 0.015 280)", border: `1px solid ${aiDisclosure === opt.value ? opt.color.replace(")", " / 0.35)") : "oklch(0.2 0.015 280)"}` }}>
                      <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 transition-all"
                        style={{ background: aiDisclosure === opt.value ? opt.color : "transparent", border: `2px solid ${opt.color}` }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: opt.color }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {/* HAAI Declaration form — shown only when HAAI is selected */}
                {aiDisclosure === "human_authored_ai_instrument" && (
                  <div className="mt-4">
                    <HAAIDeclarationForm
                      value={haaiDeclaration}
                      onChange={setHaaiDeclaration}
                      compact={false}
                    />
                  </div>
                )}
              </div>

              {/* Lyrics */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>LYRICS <span style={{ color: "#E2E8F0" }}>(optional — included in WID registration)</span></label>
                <Textarea
                  value={lyrics}
                  onChange={e => setLyrics(e.target.value)}
                  placeholder="Paste or type your lyrics here..."
                  rows={8}
                  className="font-mono text-sm resize-none"
                  style={{ background: "oklch(0.09 0.01 280)", borderColor: "oklch(0.22 0.015 280)", color: "oklch(0.85 0.02 280)" }}
                />
              </div>

              {/* Caption section moved to Step 3 (after WID is confirmed) */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" disabled={!title || (uploadMode === "audio" && !coverFile)} onClick={() => setStep(3)} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  Next: Witness ID <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Witness ID — Cryptographic Provenance</h2>
                <p className="text-xs mt-1" style={{ color: "#E2E8F0" }}>
                  {uploadMode === "lyrics"
                    ? "All processing is local — your lyrics are hashed in-browser. ECDSA P-256 signature establishes tamper-evident ownership of your words."
                    : "All processing is local — your audio is hashed in-browser. ECDSA P-256 signature establishes tamper-evident ownership."}
                </p>
              </div>
              {!witnessData ? (
                <div className="text-center py-10 rounded-xl" style={{ background: "oklch(0.09 0.01 280)", border: "2px dashed oklch(0.75 0.18 85 / 0.25)" }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.75 0.18 85 / 0.1)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
                    <Shield className="w-8 h-8" style={{ color: "oklch(0.84 0.155 85)", opacity: 0.6 }} />
                  </div>
                  <p className="text-sm mb-1 font-medium" style={{ color: "oklch(0.7 0.04 280)" }}>Generate your Witness ID</p>
                  <p className="text-xs mb-5" style={{ color: "#E2E8F0" }}>SHA-256 hash + ECDSA P-256 signature + harmonic frequency derivation</p>
                  <Button onClick={handleGenerateWid} disabled={generatingWid} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                    {generatingWid ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4 mr-2" /> Generate Witness ID</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl text-center" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
                    {uploadMode === "lyrics" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-semibold" style={{ background: "oklch(0.75 0.18 85 / 0.15)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.75 0.18 85 / 0.4)", letterSpacing: "0.08em" }}>
                        <Shield className="w-3 h-3" /> LYRICS PROTECTED
                      </div>
                    )}
                    {uploadMode === "manuscript" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-semibold" style={{ background: "oklch(0.65 0.18 145 / 0.15)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.4)", letterSpacing: "0.08em" }}>
                        📖 MANUSCRIPT WITNESSED
                      </div>
                    )}
                    {uploadMode === "comic" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-semibold" style={{ background: "oklch(0.65 0.18 25 / 0.15)", color: "oklch(0.65 0.18 25)", border: "1px solid oklch(0.65 0.18 25 / 0.4)", letterSpacing: "0.08em" }}>
                        🎨 COMIC / NOVEL WITNESSED
                      </div>
                    )}
                    <p className="text-xs mb-2 font-medium" style={{ color: "#E2E8F0", letterSpacing: "0.12em" }}>WITNESS ID</p>
                    <p className="text-xl font-bold font-mono" style={{ color: "oklch(0.84 0.155 85)" }}>{witnessData.wid}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button type="button" onClick={() => { navigator.clipboard.writeText(witnessData.wid); toast.success("WID copied!"); }} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
                      <button type="button" onClick={() => playIdentityChord(witnessData.frequencies)} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                        <Play className="w-3 h-3" /> Play Identity Chord
                      </button>
                      <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
                      <button type="button" onClick={handleGenerateWid} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                  </div>
                  <HarmonicWaveform frequencies={witnessData.frequencies} active={waveformActive} />
                  <div className="p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <p className="text-xs mb-1" style={{ color: "#E2E8F0", letterSpacing: "0.1em" }}>{uploadMode === "lyrics" ? "SHA-256 LYRICS HASH" : "SHA-256 FILE HASH"}</p>
                    <p className="text-xs font-mono truncate" style={{ color: "oklch(0.6 0.04 280)" }}>{witnessData.fileHash}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <p className="text-xs mb-2" style={{ color: "#E2E8F0", letterSpacing: "0.1em" }}>HARMONIC SIGNATURE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {witnessData.frequencies.map((f, i) => (
                        <Badge key={i} style={{ background: "oklch(0.65 0.2 300 / 0.15)", color: "oklch(0.65 0.2 300)", fontSize: "10px" }}>{f} Hz</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <p className="text-xs mb-2" style={{ color: "#E2E8F0", letterSpacing: "0.1em" }}>AI CONSENT DECLARATION</p>
                    <Badge style={{ background: aiConsent === "prohibited" ? "oklch(0.65 0.18 25 / 0.2)" : aiConsent === "permitted_attribution" ? "oklch(0.75 0.18 85 / 0.2)" : "oklch(0.65 0.18 145 / 0.2)", color: aiConsent === "prohibited" ? "oklch(0.65 0.18 25)" : aiConsent === "permitted_attribution" ? "oklch(0.84 0.155 85)" : "oklch(0.65 0.18 145)" }}>
                      {aiConsent === "prohibited" ? "AI TRAINING PROHIBITED" : aiConsent === "permitted_attribution" ? "PERMITTED WITH ATTRIBUTION" : "FREELY PERMITTED"}
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full" onClick={downloadCertificate} style={{ borderColor: "oklch(0.75 0.18 85 / 0.4)", color: "oklch(0.84 0.155 85)" }}>
                    <Download className="w-4 h-4 mr-2" /> Download Witness Certificate (HTML)
                  </Button>

                  {/* ── WID Legal Disclaimer ── */}
                  <div
                    className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                    style={{ background: "oklch(0.09 0.015 68 / 0.7)", border: "1px solid oklch(0.84 0.155 85 / 0.15)" }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.5 0.025 68)" }}>
                      Your Witness ID preserves verifiable proof of authorship, creation date, and work integrity — supporting, but not replacing, official copyright registration. For legal protection, visit{" "}
                      <a href="https://www.copyright.gov/registration/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "oklch(0.65 0.08 85)" }}>copyright.gov/registration</a>.
                    </p>
                  </div>

                  {/* ── Post-WID Caption Consent Prompt ── */}
                  <div className="rounded-xl p-4 mt-2" style={{ background: "oklch(0.11 0.04 280)", border: "1px solid oklch(0.75 0.18 85 / 0.25)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
                      <span className="text-sm font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}>Your track is now WID Protected 🔐</span>
                    </div>
                    {captionState === "idle" && !caption && (
                      <>
                        <p className="text-xs mb-1" style={{ color: "oklch(0.75 0.04 280)" }}>Would you like AI to suggest a caption?</p>
                        <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "oklch(0.5 0.03 280)" }}>
                          Note: This sends your <strong style={{ color: "oklch(0.65 0.04 280)" }}>track title and genre only</strong> — NOT your lyrics — to an AI system to generate a description.<br />
                          Your lyrics and audio are never sent. This is optional and can be skipped.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleGenerateCaption}
                            disabled={!title}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                            style={{ background: "oklch(0.75 0.18 85 / 0.15)", border: "1px solid oklch(0.75 0.18 85 / 0.4)", color: "#D4AF37" }}
                          >
                            <Sparkles size={11} /> Generate Caption
                          </button>
                          <button
                            onClick={() => setCaptionState("accepted")}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                            style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.5 0.03 280)" }}
                          >
                            <XIcon size={11} /> Skip — I'll write my own
                          </button>
                        </div>
                      </>
                    )}
                    {captionState === "loading" && (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 size={13} className="animate-spin" style={{ color: "#D4AF37" }} />
                        <span className="text-xs" style={{ color: "oklch(0.6 0.04 280)" }}>Generating caption — only title and genre sent to AI...</span>
                      </div>
                    )}
                    {captionState === "suggested" && captionSuggestion && (
                      <div className="rounded-lg p-3 mb-3" style={{ background: "oklch(0.09 0.02 280)", border: "1px solid oklch(0.75 0.18 85 / 0.2)" }}>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "oklch(0.85 0.02 280)" }}>{captionSuggestion}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleAcceptCaption} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "oklch(0.65 0.18 145 / 0.15)", border: "1px solid oklch(0.65 0.18 145 / 0.4)", color: "oklch(0.75 0.18 145)" }}>
                            <CheckCircle2 size={11} /> Accept
                          </button>
                          <button type="button" onClick={() => { const edited = window.prompt("Edit the caption:", captionSuggestion); if (edited !== null) { setCaption(edited); setCaptionState("accepted"); setCaptionSuggestion(null); toast.success("Caption saved"); } }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "oklch(0.75 0.18 85 / 0.1)", border: "1px solid oklch(0.75 0.18 85 / 0.3)", color: "#D4AF37" }}>
                            <RefreshCw size={11} /> Edit
                          </button>
                          <button type="button" onClick={handleIgnoreCaption} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.5 0.03 280)" }}>
                            <XIcon size={11} /> Ignore
                          </button>
                        </div>
                      </div>
                    )}
                    {(captionState === "accepted" || caption) && (
                      <div className="space-y-2">
                        {captionState === "accepted" && caption && (
                          <div className="rounded-lg p-3" style={{ background: "oklch(0.65 0.18 145 / 0.06)", border: "1px solid oklch(0.65 0.18 145 / 0.25)" }}>
                            <div className="flex items-start gap-2">
                              <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.75 0.18 145)" }} />
                              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.82 0.02 280)" }}>{caption}</p>
                            </div>
                          </div>
                        )}
                        <Textarea
                          value={caption}
                          onChange={e => setCaption(e.target.value)}
                          placeholder="Write your own caption here..."
                          rows={3}
                          className="text-sm resize-none"
                          style={{ background: "oklch(0.09 0.01 280)", borderColor: "oklch(0.22 0.015 280)", color: "oklch(0.85 0.02 280)" }}
                        />
                        <p className="text-[10px]" style={{ color: "oklch(0.42 0.03 280)", letterSpacing: "0.04em" }}>
                          🔐 Your lyrics are WID protected and never used for AI training.
                        </p>
                        <button type="button" onClick={() => { setCaptionState("idle"); setCaption(""); }} className="text-[10px] hover:underline" style={{ color: "oklch(0.45 0.03 280)" }}>Reset caption</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  {witnessData ? "Next: Publish" : "Skip & Publish"} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Review & Publish</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.2 0.015 280)" }}>
                {[
                  uploadMode === "lyrics"
                    ? { label: "Mode", value: "LYRICS ONLY — Audio Not Attached" }
                    : uploadMode === "manuscript"
                    ? { label: "Manuscript File", value: documentFile?.name }
                    : uploadMode === "comic"
                    ? { label: "Comic / Novel File", value: documentFile?.name }
                    : { label: "Audio File", value: audioFile?.name },
                  uploadMode === "lyrics"
                    ? { label: "Lyrics", value: `${lyrics.trim().split(/\s+/).length} words protected` }
                    : { label: "Cover Art", value: coverFile?.name || "None" },
                  { label: "Title", value: title, highlight: true },
                  { label: "Genre", value: genre || "Not specified" },
                  { label: "BPM / Key", value: [bpm, keySignature].filter(Boolean).join(" / ") || "Not specified" },
                  { label: "Album", value: albumName || "Not specified" },
                  { label: "ISRC", value: isrc || "Not specified" },
                  { label: "Mood Tags", value: selectedMoods.length ? selectedMoods.join(", ") : "None" },
                  { label: "Witness ID", value: witnessData?.wid || "Not generated", wid: !!witnessData },
                  { label: "AI Consent", value: aiConsent.replace(/_/g, " ").toUpperCase() },
                  { label: "Download", value: "Off — Change in Archive after publish" },
                ].map(({ label, value, highlight, wid }, i) => (
                  <div key={label} className="flex justify-between items-center px-4 py-2.5 text-sm"
                    style={{ background: i % 2 === 0 ? "oklch(0.12 0.015 280)" : "oklch(0.105 0.013 280)" }}>
                    <span style={{ color: "#E2E8F0" }}>{label}</span>
                    <span className={wid ? "font-mono text-xs" : ""} style={{ color: highlight ? "oklch(0.9 0.02 85)" : wid ? "oklch(0.84 0.155 85)" : "oklch(0.7 0.04 280)" }}>{value}</span>
                  </div>
                ))}
              </div>
              {!witnessData && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "oklch(0.75 0.18 85 / 0.08)", border: "1px solid oklch(0.75 0.18 85 / 0.2)" }}>
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.84 0.155 85)" }} />
                  <p className="text-xs" style={{ color: "oklch(0.65 0.04 280)" }}>No Witness ID generated. Your track will be published without cryptographic provenance.</p>
                </div>
              )}
              {/* Upload progress bar — shown during audio upload */}
              {(uploadPhase === "uploading" || uploadPhase === "processing") && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.84 0.155 85 / 0.25)" }}>
                  <div className="flex justify-between text-xs mb-1" style={{ color: "oklch(0.65 0.04 280)" }}>
                    <span>{uploadPhase === "processing" ? "Processing Witness ID…" : "Uploading audio file…"}</span>
                    <span style={{ color: "oklch(0.84 0.155 85)" }}>
                      {uploadPhase === "processing" ? "100%" : `${uploadProgress}%`}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: "oklch(0.2 0.015 280)" }}>
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: uploadPhase === "processing" ? "100%" : `${uploadProgress}%`,
                        background: "linear-gradient(90deg, oklch(0.75 0.18 85), oklch(0.84 0.155 85))",
                      }}
                    />
                  </div>
                  {uploadPhase === "processing" && (
                    <p className="text-xs text-center" style={{ color: "oklch(0.65 0.18 180)" }}>
                      ✦ Embedding Witness ID into file metadata…
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} disabled={uploadPhase === "uploading" || uploadPhase === "processing"} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handlePublish} disabled={uploadMutation.isPending || uploadPhase === "uploading" || uploadPhase === "processing"} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  {(uploadMutation.isPending || uploadPhase === "processing") ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : <><Upload className="w-4 h-4 mr-2" /> {uploadMode === "manuscript" || uploadMode === "comic" ? "Publish Work" : "Publish Track"}</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "oklch(0.38 0.02 280)" }}>
          BDDT Publishing · Command Domains LLC · Sovereign Shutter™ Framework
        </p>
      </div>
    </div>
  );
}
