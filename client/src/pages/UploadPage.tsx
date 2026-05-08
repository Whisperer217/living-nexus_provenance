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
import { StoryboardBuilder } from "@/components/reader/StoryboardBuilder";
import {
  UPLOAD_GENRES as GENRES,
  MOODS,
  MANUSCRIPT_CATEGORIES,
  COMIC_CATEGORIES,
  MANUSCRIPT_THEMES,
} from "@shared/contentTypes";

const AI_CONSENT_OPTIONS = [
  { value: "prohibited" as const, label: "AI Training PROHIBITED", color: "var(--ln-ember)", activeColor: "rgba(239,68,68,0.12)", activeBorder: "rgba(239,68,68,0.4)", desc: "No AI system may train on this work" },
  { value: "permitted_attribution" as const, label: "Permitted with Attribution", color: "var(--ln-gold)", activeColor: "rgba(196,154,40,0.08)", activeBorder: "rgba(196,154,40,0.4)", desc: "AI training allowed only with full credit" },
  { value: "permitted" as const, label: "Freely Permitted", color: "var(--ln-gold)", activeColor: "rgba(196,154,40,0.06)", activeBorder: "rgba(196,154,40,0.3)", desc: "Open for AI training and derivative use" },
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

function widPrefixForMode(mode: string): string {
  switch (mode) {
    case "lyrics":     return "WID-LYR";
    case "manuscript": return "WID-MAN";
    case "comic":      return "WID-COM";
    default:           return "WID-MUS";
  }
}
function formatWID(hashHex: string, mode = "audio"): string {
  const prefix = widPrefixForMode(mode);
  return `${prefix}-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
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
      style={{ background: "var(--ln-coal)" }} />
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
  const [ownershipStatus, setOwnershipStatus] = useState<"full" | "partial">("full");
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
  // Enriched editorial fields
  const [headlineCaption, setHeadlineCaption] = useState("");
  const [description, setDescription] = useState("");
  const [galleryImages, setGalleryImages] = useState<{ url: string; key: string; caption: string }[]>([]);
  const [playerAssetType, setPlayerAssetType] = useState<"cover" | "video">("cover");
  // AI Tool Disclosure toggles
  const [aiToolSuno, setAiToolSuno] = useState(false);
  const [aiToolUdio, setAiToolUdio] = useState(false);
  const [aiToolSonato, setAiToolSonato] = useState(false);
  const [aiToolOther, setAiToolOther] = useState(false);
  const [aiToolOtherName, setAiToolOtherName] = useState("");
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [uploadMode, setUploadMode] = useState<"audio" | "lyrics" | "manuscript" | "comic">("audio");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [storyboardPagesJson, setStoryboardPagesJson] = useState<string | null>(null);
  const [narrativeFormat, setNarrativeFormat] = useState<"comic" | "childrens" | "manuscript" | null>(null);
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
    generateCaptionMutation.mutate({ title, genre: genre || undefined, workType: uploadMode === "manuscript" ? "manuscript" : uploadMode === "comic" ? "comic" : uploadMode === "lyrics" ? "lyrics" : "audio" });
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
        toast.success(`WID Registered: ${data.witnessId}`, { duration: 6000 });
      }
      // Navigate to the song page so user sees their WID immediately
      if (data?.songId) {
        navigate(`/song/${data.songId}`);
      } else {
        navigate("/dashboard");
      }
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
      // For comic mode: hash documentFile if present, otherwise hash storyboardPagesJson
      const hasContent = documentFile || (uploadMode === "comic" && storyboardPagesJson);
      if (!hasContent) { toast.error(uploadMode === "comic" ? "Add storyboard pages or upload a file first" : "Please select a file first"); return; }
      setGeneratingWid(true);
      try {
        let buffer: ArrayBuffer;
        let sourceName: string;
        if (documentFile) {
          buffer = await documentFile.arrayBuffer();
          sourceName = documentFile.name;
        } else {
          // Hash the storyboard pages JSON as the content fingerprint
          const encoder = new TextEncoder();
          buffer = encoder.encode(storyboardPagesJson!).buffer;
          sourceName = title || "storyboard";
        }
        const fileHash = await sha256Hex(buffer);
        const prefix = widPrefixForMode(uploadMode);
        const wid = `${prefix}-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
        const frequencies = deriveHarmonicFrequencies(fileHash);
        const keypair = await generateECDSAKeypair();
        const payload = `${wid}|${title || sourceName}|${user?.name || ""}|${Date.now()}`;
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
        const wid = formatWID(fileHash, "lyrics");
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
      const wid = formatWID(fileHash, uploadMode);
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
    const consentColor = aiConsent === "prohibited" ? "#ef4444" : aiConsent === "permitted_attribution" ? "var(--ln-gold)" : "#22c55e";
    const consentLabel = aiConsent === "prohibited" ? "AI TRAINING PROHIBITED" : aiConsent === "permitted_attribution" ? "PERMITTED WITH ATTRIBUTION" : "FREELY PERMITTED";
    const freqChips = witnessData.frequencies.map(f => `<span style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:4px 12px;font-size:11px;color:#A78BFA">${f} Hz</span>`).join(" ");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Witness Certificate — ${witnessData.wid}</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
<style>body{background:#0a0a0a;color:#e0e0e0;font-family:'Share Tech Mono',monospace;padding:40px}.cert{max-width:780px;margin:0 auto;border:1px solid rgba(212,175,55,0.4);border-radius:12px;overflow:hidden}.header{background:linear-gradient(135deg,#0f0f0f,#1a1a1a);padding:32px 40px;border-bottom:1px solid rgba(212,175,55,0.2)}.org{font-family:'Orbitron',sans-serif;font-size:10px;color:#C49A28;letter-spacing:0.15em;margin-bottom:4px}.title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:#fff}.body{padding:32px 40px}.wid-box{background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.25);border-radius:8px;padding:20px;margin-bottom:28px;text-align:center}.wid-label{font-size:10px;letter-spacing:0.15em;color:#C49A28;margin-bottom:8px}.wid-value{font-family:'Orbitron',sans-serif;font-size:26px;font-weight:900;color:#C49A28}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.field{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:12px}.field-label{font-size:9px;letter-spacing:0.14em;color:rgba(255,255,255,0.35);margin-bottom:4px}.field-value{font-size:13px}.consent-box{background:rgba(0,0,0,0.3);border:2px solid ${consentColor};border-radius:8px;padding:16px;margin-bottom:24px;text-align:center}.consent-label{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;color:${consentColor}}.section-title{font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:0.14em;color:rgba(255,255,255,0.3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06)}.mono-block{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:12px;font-size:10px;color:rgba(255,255,255,0.5);word-break:break-all;margin-bottom:20px;line-height:1.6}.footer{background:#0d0d0d;border-top:1px solid rgba(212,175,55,0.15);padding:20px 40px;display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.25)}</style></head>
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
      // For comic mode: documentFile is optional when storyboard pages are provided
      const requiresDocFile = uploadMode === "manuscript" || (uploadMode === "comic" && !storyboardPagesJson);
      if (!title || (requiresDocFile && !documentFile)) { toast.error(uploadMode === "comic" ? "Title is required — add storyboard pages or upload a file" : "Title and file are required"); return; }
      try {
        let fileUrl: string | undefined;
        let fileKey: string | undefined;
        let coverArtUrl: string | undefined;
        // Upload the document file if provided
        if (documentFile) {
          const { url: docUrl, key: docKey } = await uploadFileToS3(documentFile, "audio");
          fileUrl = docUrl;
          fileKey = docKey;
        }
        if (coverFile) {
          const compressed = await compressCoverArt(coverFile);
          const { url } = await uploadFileToS3(compressed, "cover");
          coverArtUrl = url;
        }
        // For manuscript/comic: merge bmiNumber as a Publisher credit entry
        const baseCredits = credits.filter(c => c.role && c.name);
        const publisherCredit = (uploadMode === "manuscript" || uploadMode === "comic") && bmiNumber.trim()
          ? [{ role: "Publisher", name: bmiNumber.trim() }]
          : [];
        const mergedCredits = [...publisherCredit, ...baseCredits.filter(c => c.role.toLowerCase() !== "publisher")];
        uploadMutation.mutate({
          fileUrl, fileKey, coverArtUrl, title, genre: genre || undefined,
          albumName: albumName || undefined, releaseDate: releaseDate || undefined,
          isrc: isrc || undefined, aiConsent, ownershipStatus, moodTags: selectedMoods, coWriters: [],
          creditsJson: mergedCredits.length > 0 ? JSON.stringify(mergedCredits) : undefined,
          caption: caption || undefined,
          headlineCaption: headlineCaption || undefined,
          description: description || undefined,
          galleryImagesJson: galleryImages.length > 0 ? JSON.stringify(galleryImages) : undefined,
          playerAssetType,
          aiToolSuno, aiToolUdio, aiToolSonato, aiToolOther,
          aiToolOtherName: aiToolOtherName || undefined,
          contentType: uploadMode,
          fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
          harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
          ecdsaSignature: witnessData?.signature,
          aiDisclosure,
          ...(aiDisclosure === "human_authored_ai_instrument" ? haaiDeclaration : {}),
          pagesJson: storyboardPagesJson || undefined,
          narrativeFormat: narrativeFormat ?? (uploadMode === "manuscript" ? "manuscript" : "comic"),
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
          isrc: isrc || undefined, aiConsent, ownershipStatus, moodTags: selectedMoods, coWriters: [],
          creditsJson: credits.filter(c => c.role && c.name).length > 0 ? JSON.stringify(credits.filter(c => c.role && c.name)) : undefined,
          lyricsText: lyrics,
          lyricsHash: witnessData?.fileHash,
          isLyricsOnly: true,
          contentType: "lyrics",
          fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
          harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
          ecdsaSignature: witnessData?.signature,
          caption: caption || undefined,
          headlineCaption: headlineCaption || undefined,
          description: description || undefined,
          galleryImagesJson: galleryImages.length > 0 ? JSON.stringify(galleryImages) : undefined,
          playerAssetType,
          aiToolSuno, aiToolUdio, aiToolSonato, aiToolOther,
          aiToolOtherName: aiToolOtherName || undefined,
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
        isrc: isrc || undefined, aiConsent, ownershipStatus, moodTags: selectedMoods, coWriters: [],
        creditsJson: credits.filter(c => c.role && c.name).length > 0 ? JSON.stringify(credits.filter(c => c.role && c.name)) : undefined,
        lyricsText: lyrics || undefined,
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
        ecdsaSignature: witnessData?.signature,
        caption: caption || undefined,
        headlineCaption: headlineCaption || undefined,
        description: description || undefined,
        galleryImagesJson: galleryImages.length > 0 ? JSON.stringify(galleryImages) : undefined,
        playerAssetType,
        aiToolSuno, aiToolUdio, aiToolSonato, aiToolOther,
        aiToolOtherName: aiToolOtherName || undefined,
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
    <div className="min-h-screen" style={{ background: "#111009" }}>
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: "200px" }}>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/DfMDtKnrmowldQhs.png"
          alt="Upload hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "saturate(1.2) contrast(1.08)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,10,30,0.82) 0%, rgba(30,16,40,0.45) 45%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(53,62,67,0.85) 0%, rgba(53,62,67,0.15) 40%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 p-6">
          <p className="text-xs mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)", letterSpacing: "0.18em" }}>LIVING NEXUS</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>Register Your Work</h1>
          <p className="text-sm mt-1" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-parchment)" }}>Seal your creation with a cryptographic Witness ID</p>
        </div>
      </div>
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 200px)" }}>
      <div className="text-center max-w-sm mx-auto px-6">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "var(--ln-gold)" }} />
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Sign In Required</h2>
        <p className="text-sm mb-6" style={{ color: "#E2E8F0" }}>Sign in to upload tracks to Living Nexus.</p>
        <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>Sign In</Button>
      </div>
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
    <div className="min-h-screen" style={{ background: "#111009" }}>
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: "200px" }}>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/DfMDtKnrmowldQhs.png"
          alt="Upload hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "saturate(1.2) contrast(1.08)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,10,30,0.82) 0%, rgba(30,16,40,0.45) 45%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(53,62,67,0.85) 0%, rgba(53,62,67,0.15) 40%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 p-6">
          <p className="text-xs mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)", letterSpacing: "0.18em" }}>LIVING NEXUS</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>Register Your Work</h1>
          <p className="text-sm mt-1" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-parchment)" }}>Seal your creation with a cryptographic Witness ID</p>
        </div>
      </div>
      <div className="container py-10 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                {uploadMode === "audio" ? "Upload Track" : uploadMode === "lyrics" ? "Upload Lyrics" : uploadMode === "manuscript" ? "Upload Manuscript" : "Upload Comic / Novel"}
              </h1>
              <p className="text-sm" style={{ color: "#E2E8F0" }}>
                {uploadMode === "audio" ? "Publish your music with cryptographic provenance — BDDT Publishing / Command Domains LLC" : uploadMode === "lyrics" ? "Register your lyrics with a cryptographic Witness ID — authorship sealed at creation" : uploadMode === "manuscript" ? "Seal your manuscript with provenance — every word, dated and verified" : "Register your comic or novel — art and story, sealed with a Witness ID"}
              </p>
            </div>
            <button
              onClick={() => navigate("/batch-upload")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body flex-shrink-0 transition-all"
              style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-gold)" }}
            >
              <Upload size={12} /> Batch Upload
            </button>
          </div>
        </div>

        {/* New This Week nudge — show when no tracks dropped this week */}
        {newThisWeekData !== undefined && newThisWeekData.length === 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm"
            style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.25)" }}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
            <span style={{ color: "var(--ln-parchment)" }}>
              Nothing dropped this week — <strong style={{ color: "var(--ln-parchment)" }}>be the first.</strong>
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
                    style={{ background: isDone ? "var(--ln-seal-bright)" : isActive ? "var(--ln-gold)" : "var(--ln-coal)", color: isDone || isActive ? "var(--ln-parchment)" : "var(--ln-smoke)" }}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: isActive ? "var(--ln-gold)" : isDone ? "var(--ln-seal-bright)" : "var(--ln-smoke)" }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px flex-shrink-0" style={{ background: step > s.n ? "rgba(58,138,86,0.4)" : "rgba(196,154,40,0.12)" }} />}
              </div>
            );
          })}
        </div>

        <div className="p-6 md:p-8" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Select Files</h2>

              {/* Medium Selector — Cosmic Edition */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] mb-2 font-heading" style={{ color: "#B8A88A" }}>Choose Your Medium</p>
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

              {/* ── What You'll Need — medium-aware pre-upload checklist ── */}
              {(() => {
                const checklists: Record<string, { icon: string; color: string; title: string; items: { label: string; note?: string; required: boolean }[] }> = {
                  audio: {
                    icon: "🎵",
                    color: "var(--ln-gold)",
                    title: "Before You Upload Music",
                    items: [
                      { label: "Audio file (MP3, WAV, FLAC, M4A, OGG)", note: "Up to 375 MB", required: true },
                      { label: "Cover art image (JPG, PNG, WebP)", note: "Square preferred — 1:1 or 4:5", required: true },
                      { label: "Track title", required: true },
                      { label: "ISRC code", note: "If you have one — leave blank if not", required: false },
                      { label: "BPM, key, and genre", note: "Helps with discovery", required: false },
                      { label: "Co-writer / producer credits", note: "Optional but recommended", required: false },
                    ],
                  },
                  lyrics: {
                    icon: "📝",
                    color: "#A78BFA",
                    title: "Before You Upload Lyrics",
                    items: [
                      { label: "Lyrics text or .txt / .pdf file", required: true },
                      { label: "Song title", required: true },
                      { label: "Cover art image", note: "Optional but recommended for display", required: false },
                      { label: "Genre / mood tags", required: false },
                      { label: "Co-writer credits", note: "If applicable", required: false },
                    ],
                  },
                  manuscript: {
                    icon: "📖",
                    color: "var(--ln-seal-bright)",
                    title: "Before You Upload a Manuscript",
                    items: [
                      { label: "Document file (PDF, DOCX, TXT, EPUB)", note: "PDF strongly recommended for best display", required: true },
                      { label: "Cover art / book cover image", note: "Portrait 3:4 ratio recommended", required: true },
                      { label: "Title and author name", required: true },
                      { label: "ISBN", note: "Enter in the ISRC field — leave blank if unpublished", required: false },
                      { label: "Genre / category", note: "e.g. Fiction, Non-Fiction, Children's, Academic", required: false },
                      { label: "Series name", note: "If part of a series — enter in Album/Collection field", required: false },
                      { label: "Publisher name", note: "Self-published is fine", required: false },
                    ],
                  },
                  comic: {
                    icon: "🎨",
                    color: "var(--ln-ember)",
                    title: "Before You Upload a Comic / Novel",
                    items: [
                      { label: "Document file (PDF preferred)", note: "All pages in a single PDF for best inline preview", required: true },
                      { label: "Cover art image", note: "Portrait 3:4 ratio — the cover page of your comic", required: true },
                      { label: "Title and creator name", required: true },
                      { label: "ISBN", note: "Enter in the ISRC field — leave blank if self-published", required: false },
                      { label: "Issue / volume number", note: "Enter in the Album/Series field", required: false },
                      { label: "Genre / themes", note: "e.g. Superhero, Horror, Fantasy, Slice of Life", required: false },
                    ],
                  },
                };
                const cl = checklists[uploadMode];
                if (!cl) return null;
                return (
                  <div className="rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.28)", border: `1px solid ${cl.color}30` }}>
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${cl.color}20`, background: `${cl.color}0a` }}>
                      <span className="text-base">{cl.icon}</span>
                      <span className="text-[11px] font-heading font-bold tracking-widest uppercase" style={{ color: cl.color }}>{cl.title}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {cl.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: item.required ? `${cl.color}22` : "rgba(255,255,255,0.05)", border: `1px solid ${item.required ? cl.color + "55" : "rgba(255,255,255,0.10)"}`, color: item.required ? cl.color : "#6B7280" }}>
                            {item.required ? "!" : "○"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium" style={{ color: item.required ? "var(--ln-parchment)" : "#8B9BA3" }}>{item.label}</span>
                            {item.note && <span className="text-[10px] ml-1.5" style={{ color: "#5A6A72" }}>{item.note}</span>}
                          </div>
                        </div>
                      ))}
                      <p className="text-[9px] pt-1" style={{ color: "var(--ln-iron)" }}>
                        <span style={{ color: cl.color + "99" }}>!</span> = required &nbsp;·&nbsp; ○ = optional but recommended
                      </p>
                    </div>
                  </div>
                );
              })()}

              {uploadMode === "audio" && (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setAudioDragging(true); }}
                  onDragLeave={() => setAudioDragging(false)}
                  onDrop={handleAudioDrop}
                  className="rounded-xl p-8 text-center cursor-pointer transition-all"
                  style={{ border: `2px dashed ${audioFile ? "var(--ln-seal-bright)" : audioDragging ? "var(--ln-gold)" : "rgba(196,154,40,0.2)"}`, background: audioFile ? "rgba(74,222,128,0.05)" : audioDragging ? "rgba(196,154,40,0.04)" : "var(--ln-coal)" }}>
                  <input ref={audioInputRef} type="file" accept="audio/*,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/aac,audio/ogg,audio/x-m4a,audio/mp4,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.aif" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 375 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Maximum size is 375 MB. Consider converting WAV to MP3 first.`); e.target.value = ""; return; } setAudioFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "")); } }} />
                  {audioFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(74,222,128,0.18)" }}>
                        <Check className="w-5 h-5" style={{ color: "var(--ln-seal-bright)" }} />
                      </div>
                      <p className="font-medium text-sm" style={{ color: "var(--ln-seal-bright)" }}>{audioFile.name}</p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="text-xs hover:underline" style={{ color: "#E2E8F0" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <Music className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                      <p className="font-medium text-sm mb-1" style={{ color: "var(--ln-parchment)" }}>{audioDragging ? "Drop it!" : "Drop audio file here or click to browse"}</p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>MP3, WAV, FLAC, M4A, OGG supported</p>
                      <p className="text-xs mt-1" style={{ color: "var(--ln-iron)" }}>On iPhone, use Safari for best file access</p>
                    </>
                  )}
                </div>
              )}

              {uploadMode === "lyrics" && (
                <div className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.25)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--ln-gold)", letterSpacing: "0.1em" }}>LYRICS-ONLY PROTECTION</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>Your lyrics will be hashed with SHA-256 and registered with a Witness ID. No audio file required — protect your words before the music is made.</p>
                  <Textarea
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder="Paste or type your lyrics here to protect them with a Witness ID..."
                    rows={10}
                    className="font-mono text-sm resize-none"
                    style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}
                  />
                  {lyrics.trim() && (
                    <p className="text-xs mt-2" style={{ color: "#E2E8F0" }}>{lyrics.trim().split(/\s+/).length} words · {lyrics.length} characters</p>
                  )}
                </div>
              )}

              {/* ── Narrative Format Selector (comic/novel only) ── */}
              {uploadMode === "comic" && (
                <div className="rounded-xl p-4" style={{ background: "#1A2530", border: "1px solid rgba(196,154,40,0.15)" }}>
                  <p className="text-xs font-heading font-bold tracking-widest mb-3" style={{ color: "var(--ln-gold)" }}>NARRATIVE FORMAT</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "comic", label: "🎭 Comic / Graphic Novel", desc: "Panel-sequenced art, guided reading" },
                      { value: "childrens", label: "📖 Children's Book", desc: "Full spreads, warm atmosphere, narration" },
                      { value: "manuscript", label: "📄 Illustrated Novel", desc: "Text-first with visual chapters" },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNarrativeFormat(opt.value)}
                        className="rounded-xl p-3 text-left transition-all"
                        style={{
                          background: (narrativeFormat ?? "comic") === opt.value ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${(narrativeFormat ?? "comic") === opt.value ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--ln-parchment)" }}>{opt.label}</p>
                        <p className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* ── Storyboard Builder (comic/novel only) ── */}
              {uploadMode === "comic" && (
                <div className="p-4" style={{ background: "#1A2530", border: "1px solid rgba(196,154,40,0.15)" }}>
                  <StoryboardBuilder
                    onChange={json => setStoryboardPagesJson(json)}
                    disabled={uploadMutation.isPending}
                  />
                </div>
              )}

              {(uploadMode === "manuscript" || uploadMode === "comic") && (
                <div
                  onClick={() => documentInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => {
                    e.preventDefault(); e.stopPropagation();
                    const f = Array.from(e.dataTransfer.files)[0];
                    if (!f) return;
                    if (f.size > 200 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Maximum 200 MB.`); return; }
                    setDocumentFile(f);
                    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
                  }}
                  className="rounded-xl p-8 text-center cursor-pointer transition-all"
                  style={{ border: `2px dashed ${documentFile ? (uploadMode === "manuscript" ? "var(--ln-seal-bright)" : "var(--ln-ember)") : "rgba(196,154,40,0.2)"}`, background: documentFile ? "rgba(74,222,128,0.05)" : "var(--ln-coal)" }}>
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept={uploadMode === "manuscript" ? ".pdf,.doc,.docx,.txt,.rtf,.epub" : ".pdf,.cbz,.cbr,.zip,.jpg,.jpeg,.png,.webp"}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 200 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Maximum 200 MB.`); e.target.value = ""; return; } setDocumentFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "")); } }}
                  />
                  {documentFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: uploadMode === "manuscript" ? "rgba(74,222,128,0.18)" : "rgba(239,68,68,0.2)" }}>
                        <Check className="w-5 h-5" style={{ color: uploadMode === "manuscript" ? "var(--ln-seal-bright)" : "var(--ln-ember)" }} />
                      </div>
                      <p className="font-medium text-sm" style={{ color: uploadMode === "manuscript" ? "var(--ln-seal-bright)" : "var(--ln-ember)" }}>{documentFile.name}</p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>{(documentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setDocumentFile(null); }} className="text-xs hover:underline" style={{ color: "#E2E8F0" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl block mb-3">{uploadMode === "manuscript" ? "📖" : "🎨"}</span>
                      <p className="font-medium text-sm mb-1" style={{ color: "var(--ln-parchment)" }}>
                        {uploadMode === "manuscript" ? "Drop your manuscript here or click to browse" : storyboardPagesJson ? "Add a full file too (optional)" : "Drop your comic/novel file here or click to browse"}
                      </p>
                      <p className="text-xs" style={{ color: "#E2E8F0" }}>
                        {uploadMode === "manuscript" ? "PDF, DOCX, TXT, EPUB — max 200 MB" : storyboardPagesJson ? "PDF, CBZ, CBR, ZIP — optional alongside your storyboard pages" : "PDF, CBZ, CBR, ZIP, or image files — max 200 MB"}
                      </p>
                      <p className="text-xs mt-2 px-4" style={{ color: "#B8A88A" }}>
                        Your file will be SHA-256 hashed and registered with a Witness ID. The original file is stored privately.
                      </p>
                    </>
                  )}
                </div>
              )}

              <div onClick={() => coverInputRef.current?.click()} className="rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-white/5"
                style={{ border: `2px dashed ${coverFile ? "var(--ln-gold)" : "rgba(196,154,40,0.15)"}`, background: coverFile ? "rgba(196,154,40,0.04)" : "var(--ln-coal)" }}>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }} />
                {coverFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                    <span className="text-sm" style={{ color: "var(--ln-gold)" }}>{coverFile.name}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setCoverFile(null); }} className="text-xs hover:underline ml-2" style={{ color: "#E2E8F0" }}>Remove</button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 mx-auto mb-1" style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: "#E2E8F0" }}>Cover art {uploadMode === "audio" ? <span style={{ color: "var(--ln-ember)" }}>*required</span> : <span style={{ color: "#B8A88A" }}>(optional)</span>} — JPG, PNG, WebP</p>
                    {uploadMode === "audio" && <p className="text-xs mt-1" style={{ color: "#B8A88A" }}>Required to generate your work's visual — every audio work must be visually alive</p>}
                  </>
                )}
              </div>
              {/* Video Upload (audio mode only) */}
              {uploadMode === "audio" && (
                <div onClick={() => videoInputRef.current?.click()} className="rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-white/5"
                  style={{ border: `2px dashed ${videoFile ? "var(--ln-seal-bright)" : "rgba(196,154,40,0.15)"}`, background: videoFile ? "rgba(74,222,128,0.05)" : "var(--ln-coal)" }}>
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
                      <Check className="w-4 h-4" style={{ color: "var(--ln-seal-bright)" }} />
                      <span className="text-sm" style={{ color: "var(--ln-seal-bright)" }}>{videoFile.name}</span>
                      <span className="text-xs" style={{ color: "#E2E8F0" }}>({(videoFile.size/1024/1024).toFixed(1)} MB)</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); }} className="text-xs hover:underline ml-2" style={{ color: "#E2E8F0" }}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <Video className="w-6 h-6 mx-auto mb-1" style={{ color: "var(--ln-seal-bright)", opacity: 0.4 }} />
                      <p className="text-sm" style={{ color: "#E2E8F0" }}>Music Video <span style={{ color: "#B8A88A" }}>(optional)</span> — MP4, MOV, max 500 MB</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ln-iron)" }}>Video gets its own Witness ID alongside your audio</p>
                    </>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                disabled={
                  uploadMode === "audio" ? !audioFile :
                  uploadMode === "lyrics" ? !lyrics.trim() :
                  uploadMode === "comic" ? (!documentFile && !storyboardPagesJson) :
                  !documentFile
                }
                onClick={() => setStep(2)}
                style={{ background: "linear-gradient(135deg, #B8860B, #C49A28)", color: "#1E1020", fontFamily: "'Cinzel', serif", fontWeight: "700", letterSpacing: "0.06em", boxShadow: "0 4px 16px rgba(196,154,40,0.25)" }}>
                Next: Metadata <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                {uploadMode === "manuscript" ? "Manuscript Metadata" : uploadMode === "comic" ? "Comic / Novel Metadata" : "Track Metadata"}
              </h2>

              {/* ── Title ── */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                  {uploadMode === "manuscript" || uploadMode === "comic" ? "Work Title *" : "Title *"}
                </label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={uploadMode === "manuscript" ? "Enter manuscript title" : uploadMode === "comic" ? "Enter comic / novel title" : "Enter track title"}
                  style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
              </div>

              {/* ── Headline Caption ── */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>Headline Caption <span style={{ color: "var(--ln-iron)" }}>(optional — short punchy subtitle)</span></label>
                <Input value={headlineCaption} onChange={e => setHeadlineCaption(e.target.value)}
                  placeholder="e.g. A midnight confession in three chords"
                  maxLength={120}
                  style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.30)", color: "var(--ln-parchment)" }} />
                {headlineCaption && <p className="text-[10px] mt-1" style={{ color: "var(--ln-iron)" }}>{headlineCaption.length}/120</p>}
              </div>

              {/* ── Description with AI Generator ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: "#B8A88A" }}>Description <span style={{ color: "var(--ln-iron)" }}>(optional — the story behind the work)</span></label>
                  <button
                    type="button"
                    disabled={descriptionGenerating || !title}
                    onClick={async () => {
                      if (!title) { toast.error("Add a title first"); return; }
                      setDescriptionGenerating(true);
                      try {
                        const res = await fetch("/api/trpc/songs.generateCaption", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ json: { title, genre: genre || undefined, workType: uploadMode === "manuscript" ? "manuscript" : uploadMode === "comic" ? "comic" : uploadMode === "lyrics" ? "lyrics" : "audio", generateDescription: true, imageUrls: galleryImages.slice(0, 6).map(img => img.url) } }),
                        });
                        const data = await res.json();
                        const text = data?.result?.data?.json?.caption || data?.result?.data?.json?.description || "";
                        if (text) { setDescription(text); toast.success("Description drafted — edit as needed"); }
                        else toast.error("Could not generate description");
                      } catch { toast.error("Generation failed"); }
                      finally { setDescriptionGenerating(false); }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: descriptionGenerating ? "rgba(196,154,40,0.06)" : "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)", color: descriptionGenerating ? "#B8A88A" : "var(--ln-gold)", opacity: !title ? 0.5 : 1 }}
                  >
                    {descriptionGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {descriptionGenerating ? "Drafting..." : "AI Draft"}
                  </button>
                </div>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tell the story behind this work — the process, the intent, the moment it came from..."
                  rows={4}
                  className="text-sm resize-none"
                  style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
                />
              </div>

              {/* ── Gallery Images ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: "#B8A88A" }}>Gallery Images <span style={{ color: "var(--ln-iron)" }}>(optional — process photos, artwork, liner notes)</span></label>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                    style={{ color: "var(--ln-seal-bright)", border: "1px solid rgba(74,222,128,0.28)", background: "rgba(74,222,128,0.06)" }}
                  >
                    <Plus size={10} /> Add Images
                  </button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      toast.info(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);
                      try {
                        const uploaded: { url: string; key: string; caption: string }[] = [];
                        for (const f of files) {
                          const fd = new FormData();
                          fd.append("file", f);
                          const r = await fetch("/api/upload-gallery-image", { method: "POST", body: fd });
                          if (!r.ok) throw new Error("Upload failed");
                          const d = await r.json();
                          uploaded.push({ url: d.url, key: d.key, caption: "" });
                        }
                        setGalleryImages(prev => [...prev, ...uploaded]);
                        toast.success(`${files.length} image${files.length > 1 ? "s" : ""} added`);
                      } catch (err: any) { toast.error(err.message || "Image upload failed"); }
                      e.target.value = "";
                    }}
                  />
                </div>
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.2)" }}>
                        <img src={img.url} alt={`Gallery ${idx + 1}`} className="w-full h-28 object-cover" />
                        <div className="p-2" style={{ background: "var(--ln-coal)" }}>
                          <input
                            type="text"
                            placeholder="Caption for this image..."
                            value={img.caption}
                            onChange={e => setGalleryImages(prev => prev.map((x, i) => i === idx ? { ...x, caption: e.target.value } : x))}
                            className="w-full text-xs px-2 py-1 rounded"
                            style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.7)", color: "var(--ln-ember)" }}
                        >
                          <XIcon size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {galleryImages.length === 0 && (
                  <p className="text-[11px]" style={{ color: "var(--ln-iron)" }}>No gallery images yet. Add process photos, artwork variations, or visual context for your work.</p>
                )}
              </div>

              {/* ── Genre (music) OR Category (manuscript/comic) ── */}
              {(uploadMode === "audio" || uploadMode === "lyrics") ? (
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-2 font-medium" style={{ color: "#B8A88A" }}>
                    Genre
                    {creatorProfile?.primaryGenre && (
                      <span className="text-[10px] font-normal" style={{ color: "#E2E8F0" }}>
                        — default from profile: <span style={{ color: "var(--ln-gold)" }}>{creatorProfile.primaryGenre}</span>
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {creatorProfile?.primaryGenre && !GENRES.includes(creatorProfile.primaryGenre) && (
                      <button type="button" key="profile-genre" onClick={() => setGenre(genre === creatorProfile.primaryGenre ? "" : (creatorProfile.primaryGenre ?? ""))} className="px-3 py-1 rounded-full text-xs transition-all"
                        style={{ background: genre === creatorProfile.primaryGenre ? "rgba(196,154,40,0.2)" : "var(--ln-coal)", color: genre === creatorProfile.primaryGenre ? "var(--ln-gold)" : "var(--ln-iron)", border: `1px solid ${genre === creatorProfile.primaryGenre ? "rgba(196,154,40,0.4)" : "rgba(196,154,40,0.15)"}` }}>
                        {creatorProfile.primaryGenre}
                      </button>
                    )}
                    {GENRES.map(g => (
                      <button type="button" key={g} onClick={() => setGenre(g === genre ? "" : g)} className="px-3 py-1 rounded-full text-xs transition-all"
                        style={{ background: genre === g ? "rgba(196,154,40,0.2)" : "var(--ln-coal)", color: genre === g ? "var(--ln-gold)" : "var(--ln-iron)", border: `1px solid ${genre === g ? "rgba(196,154,40,0.4)" : "rgba(196,154,40,0.15)"}` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>Category</label>
                  <div className="flex flex-wrap gap-2">
                    {(uploadMode === "manuscript" ? MANUSCRIPT_CATEGORIES : COMIC_CATEGORIES).map(cat => (
                      <button type="button" key={cat} onClick={() => setGenre(cat === genre ? "" : cat)} className="px-3 py-1 rounded-full text-xs transition-all"
                        style={{ background: genre === cat ? "rgba(196,154,40,0.2)" : "var(--ln-coal)", color: genre === cat ? "var(--ln-gold)" : "var(--ln-iron)", border: `1px solid ${genre === cat ? "rgba(196,154,40,0.4)" : "rgba(196,154,40,0.15)"}` }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── BPM + Key (music only) ── */}
              {(uploadMode === "audio" || uploadMode === "lyrics") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>BPM</label>
                    <Input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120"
                      style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>Key</label>
                    <Input value={keySignature} onChange={e => setKeySignature(e.target.value)} placeholder="C major"
                      style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
                  </div>
                </div>
              )}

              {/* ── Album / Series + Date ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                    {uploadMode === "manuscript" || uploadMode === "comic" ? "Series / Collection" : "Album"}
                  </label>
                  <Input value={albumName} onChange={e => setAlbumName(e.target.value)}
                    placeholder={uploadMode === "manuscript" || uploadMode === "comic" ? "Series or collection name" : "Album name"}
                    style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                    {uploadMode === "manuscript" || uploadMode === "comic" ? "Written / Completed" : "Release Date"}
                  </label>
                  <Input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)}
                    style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
                </div>
              </div>

              {/* ── ISRC + BMI (music) OR ISBN + Publisher (manuscript/comic) ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                    {uploadMode === "manuscript" || uploadMode === "comic" ? "ISBN" : "ISRC"}
                  </label>
                  <Input value={isrc} onChange={e => setIsrc(e.target.value)}
                    placeholder={uploadMode === "manuscript" || uploadMode === "comic" ? "978-0-000-00000-0 (optional)" : "US-XXX-YY-NNNNN"}
                    style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                    {uploadMode === "manuscript" || uploadMode === "comic" ? "Publisher / Imprint" : "BMI Member #"}
                  </label>
                  <Input value={bmiNumber} onChange={e => setBmiNumber(e.target.value)}
                    placeholder={uploadMode === "manuscript" || uploadMode === "comic" ? "Publisher or self-published" : "BMI number"}
                    style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)" }} />
                </div>
              </div>

              {/* ── Mood Tags (music) OR Themes (manuscript/comic) ── */}
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                  {uploadMode === "manuscript" || uploadMode === "comic" ? "Themes" : "Mood Tags"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(uploadMode === "manuscript" || uploadMode === "comic" ? MANUSCRIPT_THEMES : MOODS).map(m => (
                    <button type="button" key={m} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                      className="px-3 py-1 rounded-full text-xs transition-all"
                      style={{ background: selectedMoods.includes(m) ? "rgba(196,154,40,0.15)" : "var(--ln-coal)", color: selectedMoods.includes(m) ? "var(--ln-gold)" : "var(--ln-smoke)", border: `1px solid ${selectedMoods.includes(m) ? "rgba(196,154,40,0.3)" : "rgba(196,154,40,0.15)"}` }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Credits editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: "#B8A88A" }}>Credits</label>
                  <button
                    type="button"
                    onClick={() => setCredits(prev => [...prev, { role: "", name: "" }])}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all"
                    style={{ color: "var(--ln-seal-bright)", border: "1px solid rgba(74,222,128,0.28)", background: "rgba(74,222,128,0.06)" }}
                  >
                    <Plus size={10} /> Add credit
                  </button>
                </div>
                {credits.length === 0 && (
                  <p className="text-[11px]" style={{ color: "var(--ln-iron)" }}>No credits added. Click "Add credit" to list co-writers, producers, engineers, etc.</p>
                )}
                <div className="space-y-2">
                  {credits.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Role (e.g. Producer)"
                        value={c.role}
                        onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                        className="flex-1"
                        style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)", fontSize: "12px" }}
                      />
                      <Input
                        placeholder="Name"
                        value={c.name}
                        onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className="flex-1"
                        style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)", color: "var(--ln-parchment)", fontSize: "12px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setCredits(prev => prev.filter((_, j) => j !== i))}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-red-900/20"
                        style={{ color: "var(--ln-ember)" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-2 block font-medium" style={{ color: "#B8A88A" }}>AI Training Consent</label>
                <div className="space-y-2">
                  {AI_CONSENT_OPTIONS.map(opt => (
                    <button type="button" key={opt.value} onClick={() => setAiConsent(opt.value)} className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{ background: aiConsent === opt.value ? opt.activeColor : "var(--ln-coal)", border: `1px solid ${aiConsent === opt.value ? opt.activeBorder : "rgba(196,154,40,0.12)"}` }}>
                      <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 transition-all"
                        style={{ background: aiConsent === opt.value ? opt.color : "transparent", border: `2px solid ${aiConsent === opt.value ? opt.color : "rgba(196,154,40,0.3)"}` }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: aiConsent === opt.value ? opt.color : "var(--ln-parchment)" }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#B8A88A" }}>{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* AI Authorship Disclosure */}
              <div>
                <label className="text-xs mb-2 block font-medium" style={{ color: "#B8A88A" }}>AI AUTHORSHIP DISCLOSURE</label>
                <div className="space-y-2">
                  {([
                    { value: "original" as const, label: "Human Original", color: "var(--ln-gold)", activeColor: "rgba(196,154,40,0.08)", activeBorder: "rgba(196,154,40,0.4)", desc: "Entirely human-made. No AI tools used in creation." },
                    { value: "ai_assisted" as const, label: "AI-Assisted", color: "var(--ln-gold)", activeColor: "rgba(196,154,40,0.09)", activeBorder: "rgba(196,154,40,0.34)", desc: "AI used as a production aid. Human vision, human direction." },
                    { value: "human_authored_ai_instrument" as const, label: "Human-Authored via AI Instrument (HAAI)", color: "var(--ln-gold)", activeColor: "rgba(196,154,40,0.09)", activeBorder: "rgba(196,154,40,0.34)", desc: "You authored the intent and directed the work. AI was the instrument, not the author." },
                    { value: "ai_generated" as const, label: "AI-Assisted Manifestation", color: "var(--ln-ember)", activeColor: "rgba(239,68,68,0.1)", activeBorder: "rgba(239,68,68,0.38)", desc: "AI generated the primary content." },
                  ] as const).map(opt => (
                    <button type="button" key={opt.value} onClick={() => setAiDisclosure(opt.value)} className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{ background: aiDisclosure === opt.value ? opt.activeColor : "var(--ln-coal)", border: `1px solid ${aiDisclosure === opt.value ? opt.activeBorder : "rgba(196,154,40,0.12)"}` }}>
                      <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 transition-all"
                        style={{ background: aiDisclosure === opt.value ? opt.color : "transparent", border: `2px solid ${aiDisclosure === opt.value ? opt.color : "rgba(196,154,40,0.3)"}` }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: aiDisclosure === opt.value ? opt.color : "var(--ln-parchment)" }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#B8A88A" }}>{opt.desc}</p>
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
                      workType={uploadMode === "comic" ? "comic" : uploadMode === "manuscript" ? "manuscript" : uploadMode === "lyrics" ? "lyrics" : "audio"}
                      compact={false}
                    />
                  </div>
                )}
                {/* AI Tool Disclosure — shown when not "original" */}
                {aiDisclosure !== "original" && (
                  <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.14)" }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: "#B8A88A", letterSpacing: "0.08em" }}>WHICH AI TOOLS WERE USED?</p>
                    <div className="space-y-2">
                      {([
                        { key: "suno" as const, label: "Suno 5+", state: aiToolSuno, set: setAiToolSuno },
                        { key: "udio" as const, label: "Udio", state: aiToolUdio, set: setAiToolUdio },
                        { key: "sonato" as const, label: "Sonato", state: aiToolSonato, set: setAiToolSonato },
                        { key: "other" as const, label: "Other", state: aiToolOther, set: setAiToolOther },
                      ]).map(tool => (
                        <div key={tool.key} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => tool.set(!tool.state)}
                            className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
                            style={{ background: tool.state ? "var(--ln-gold)" : "rgba(196,154,40,0.15)" }}
                            aria-pressed={tool.state}
                          >
                            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: tool.state ? "translateX(16px)" : "translateX(2px)" }} />
                          </button>
                          <span className="text-sm" style={{ color: tool.state ? "var(--ln-parchment)" : "#B8A88A" }}>{tool.label}</span>
                        </div>
                      ))}
                      {aiToolOther && (
                        <input
                          type="text"
                          placeholder="Name the tool..."
                          value={aiToolOtherName}
                          onChange={e => setAiToolOtherName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Ownership & Commercial License Disclaimer ─────────── */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: ownershipStatus === "partial" ? "rgba(239,68,68,0.07)" : "rgba(196,154,40,0.05)",
                  border: `1.5px solid ${ownershipStatus === "partial" ? "rgba(239,68,68,0.35)" : "rgba(196,154,40,0.25)"}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: ownershipStatus === "partial" ? "var(--ln-ember)" : "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                      Commercial Ownership Declaration
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#B8A88A" }}>
                      Do you hold full commercial rights to this work?
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setOwnershipStatus(s => s === "full" ? "partial" : "full")}
                    className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
                    style={{ background: ownershipStatus === "full" ? "var(--ln-gold)" : "rgba(239,68,68,0.5)" }}
                    aria-pressed={ownershipStatus === "full"}
                    aria-label="Toggle commercial ownership"
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: ownershipStatus === "full" ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>

                {/* Explanatory text — always visible */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--ln-gold)" }} />
                    <p className="text-xs" style={{ color: "var(--ln-parchment)" }}>
                      <strong style={{ color: "var(--ln-gold)" }}>Full ownership</strong> — you composed the work entirely, or you remixed commercially-licensed music with significant human alteration. You may publish and monetize.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--ln-ember)" }} />
                    <p className="text-xs" style={{ color: "var(--ln-parchment)" }}>
                      <strong style={{ color: "var(--ln-ember)" }}>Partial / unclear</strong> — AI-generated without a commercial license, or remixed content without full clearance. You can still upload and save as a Draft, but <strong>publishing and monetization will be blocked</strong> until you resolve the rights situation.
                    </p>
                  </div>
                </div>

                {/* Inline warning when partial is selected */}
                {ownershipStatus === "partial" && (
                  <div
                    className="flex items-start gap-2 rounded-xl p-3"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--ln-ember)" }}>⚠</span>
                    <p className="text-xs" style={{ color: "var(--ln-ember)" }}>
                      This work will be saved as a <strong>Draft</strong> and cannot be published or monetized. To publish, obtain a commercial license or ensure significant human authorship, then update this declaration.
                    </p>
                  </div>
                )}
              </div>

              {/* Lyrics (music/lyrics mode) OR Synopsis (manuscript/comic) */}
              {(uploadMode === "audio" || uploadMode === "lyrics") ? (
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>LYRICS <span style={{ color: "#E2E8F0" }}>(optional — included in WID registration)</span></label>
                  <Textarea
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder="Paste or type your lyrics here..."
                    rows={8}
                    className="font-mono text-sm resize-none"
                    style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.15)", color: "var(--ln-parchment)" }}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "#B8A88A" }}>
                    SYNOPSIS / DESCRIPTION <span style={{ color: "#E2E8F0" }}>(optional — included in WID registration)</span>
                  </label>
                  <Textarea
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder={uploadMode === "manuscript" ? "Describe your manuscript — plot, themes, intended audience..." : "Describe your comic or novel — story, characters, visual style..."}
                    rows={6}
                    className="text-sm resize-none"
                    style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.15)", color: "var(--ln-parchment)" }}
                  />
                </div>
              )}

              {/* Caption section moved to Step 3 (after WID is confirmed) */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} style={{ borderColor: "rgba(196,154,40,0.2)", color: "#B8A88A" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" disabled={!title || (uploadMode === "audio" && !coverFile)} onClick={() => setStep(3)} style={{ background: "linear-gradient(135deg, #B8860B, #C49A28)", color: "#1E1020", fontFamily: "'Cinzel', serif", fontWeight: "700", letterSpacing: "0.06em", boxShadow: "0 4px 16px rgba(196,154,40,0.25)" }}>
                  Next: Witness ID <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Witness ID — Cryptographic Provenance</h2>
                <p className="text-xs mt-1" style={{ color: "#E2E8F0" }}>
                  {uploadMode === "lyrics"
                    ? "All processing is local — your lyrics are hashed in-browser. ECDSA P-256 signature establishes tamper-evident ownership of your words."
                    : "All processing is local — your audio is hashed in-browser. ECDSA P-256 signature establishes tamper-evident ownership."}
                </p>
              </div>
              {!witnessData ? (
                <div className="text-center py-10 rounded-xl" style={{ background: "var(--ln-coal)", border: "2px dashed rgba(196,154,40,0.2)" }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(196,154,40,0.09)", border: "1px solid rgba(196,154,40,0.25)" }}>
                    <Shield className="w-8 h-8" style={{ color: "var(--ln-gold)", opacity: 0.6 }} />
                  </div>
                  <p className="text-sm mb-1 font-medium" style={{ color: "var(--ln-parchment)" }}>Generate your Witness ID</p>
                  <p className="text-xs mb-5" style={{ color: "#E2E8F0" }}>SHA-256 hash + ECDSA P-256 signature + harmonic frequency derivation</p>
                  <Button onClick={handleGenerateWid} disabled={generatingWid} style={{ background: "linear-gradient(135deg, #B8860B, #C49A28)", color: "#1E1020", fontFamily: "'Cinzel', serif", fontWeight: "700", letterSpacing: "0.06em", boxShadow: "0 4px 16px rgba(196,154,40,0.25)" }}>
                    {generatingWid ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4 mr-2" /> Generate Witness ID</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl text-center" style={{ background: "#1E1B12", border: "1px solid rgba(196,154,40,0.40)" }}>
                    {uploadMode === "lyrics" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-semibold" style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)", letterSpacing: "0.08em" }}>
                        <Shield className="w-3 h-3" /> LYRICS PROTECTED
                      </div>
                    )}
                    {uploadMode === "manuscript" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-semibold" style={{ background: "rgba(58,138,86,0.15)", color: "var(--ln-seal-bright)", border: "1px solid rgba(74,222,128,0.4)", letterSpacing: "0.08em" }}>
                        📖 MANUSCRIPT WITNESSED
                      </div>
                    )}
                    {uploadMode === "comic" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-semibold" style={{ background: "rgba(196,68,10,0.15)", color: "var(--ln-ember)", border: "1px solid rgba(239,68,68,0.4)", letterSpacing: "0.08em" }}>
                        🎨 COMIC / NOVEL WITNESSED
                      </div>
                    )}
                    <p className="text-xs mb-2 font-medium" style={{ color: "#E2E8F0", letterSpacing: "0.12em" }}>WITNESS ID</p>
                    <p className="text-xl font-bold font-mono" style={{ color: "var(--ln-gold)" }}>{witnessData.wid}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button type="button" onClick={() => { navigator.clipboard.writeText(witnessData.wid); toast.success("WID copied!"); }} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <span style={{ color: "var(--ln-iron)" }}>·</span>
                      <button type="button" onClick={() => playIdentityChord(witnessData.frequencies)} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                        <Play className="w-3 h-3" /> Play Identity Chord
                      </button>
                      <span style={{ color: "var(--ln-iron)" }}>·</span>
                      <button type="button" onClick={handleGenerateWid} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                  </div>
                  <HarmonicWaveform frequencies={witnessData.frequencies} active={waveformActive} />
                  <div className="p-3 rounded-lg" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                    <p className="text-xs mb-1" style={{ color: "#E2E8F0", letterSpacing: "0.1em" }}>{uploadMode === "lyrics" ? "SHA-256 LYRICS HASH" : "SHA-256 FILE HASH"}</p>
                    <p className="text-xs font-mono truncate" style={{ color: "#B8A88A" }}>{witnessData.fileHash}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                    <p className="text-xs mb-2" style={{ color: "#E2E8F0", letterSpacing: "0.1em" }}>HARMONIC SIGNATURE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {witnessData.frequencies.map((f, i) => (
                        <Badge key={i} style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", fontSize: "10px" }}>{f} Hz</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                    <p className="text-xs mb-2" style={{ color: "#E2E8F0", letterSpacing: "0.1em" }}>AI CONSENT DECLARATION</p>
                    <Badge style={{ background: aiConsent === "prohibited" ? "rgba(239,68,68,0.2)" : aiConsent === "permitted_attribution" ? "rgba(196,154,40,0.15)" : "rgba(74,222,128,0.18)", color: aiConsent === "prohibited" ? "var(--ln-ember)" : aiConsent === "permitted_attribution" ? "var(--ln-gold)" : "var(--ln-seal-bright)" }}>
                      {aiConsent === "prohibited" ? "AI TRAINING PROHIBITED" : aiConsent === "permitted_attribution" ? "PERMITTED WITH ATTRIBUTION" : "FREELY PERMITTED"}
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full" onClick={downloadCertificate} style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                    <Download className="w-4 h-4 mr-2" /> Download Witness Certificate (HTML)
                  </Button>

                  {/* ── WID Legal Disclaimer ── */}
                  <div
                    className="px-3 py-2.5 flex items-start gap-2"
                    style={{ background: "rgba(44,52,56,0.7)", border: "1px solid rgba(196,154,40,0.08)" }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(232,223,200,0.6)" }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--ln-iron)" }}>
                      Your Witness ID preserves verifiable proof of authorship, creation date, and work integrity — supporting, but not replacing, official copyright registration. For legal protection, visit{" "}
                      <a href="https://www.copyright.gov/registration/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--ln-gold)" }}>copyright.gov/registration</a>.
                    </p>
                  </div>

                  {/* ── Post-WID Caption Consent Prompt ── */}
                  <div className="p-4 mt-2" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                      <span className="text-sm font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
                      {uploadMode === "audio" ? "Your track is now WID Protected" : uploadMode === "lyrics" ? "Your lyrics are now WID Protected" : uploadMode === "manuscript" ? "Your manuscript is now WID Protected" : "Your comic is now WID Protected"} 🔐
                    </span>
                    </div>
                    {captionState === "idle" && !caption && (
                      <>
                        <p className="text-xs mb-1" style={{ color: "var(--ln-parchment)" }}>Would you like AI to suggest a caption?</p>
                        <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "#B8A88A" }}>
                          Note: This sends your <strong style={{ color: "#B8A88A" }}>{uploadMode === "audio" ? "track title and genre" : uploadMode === "lyrics" ? "lyrics title and genre" : uploadMode === "manuscript" ? "manuscript title and category" : "comic title and category"} only</strong> — NOT your {uploadMode === "audio" || uploadMode === "lyrics" ? "lyrics or audio" : "manuscript content"} — to an AI system to generate a description.<br />
                          Your {uploadMode === "audio" || uploadMode === "lyrics" ? "lyrics and audio are" : "content is"} never sent. This is optional and can be skipped.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleGenerateCaption}
                            disabled={!title}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                            style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                          >
                            <Sparkles size={11} /> Generate Caption
                          </button>
                          <button
                            onClick={() => setCaptionState("accepted")}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                            style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.06)", color: "#B8A88A" }}
                          >
                            <XIcon size={11} /> Skip — I'll write my own
                          </button>
                        </div>
                      </>
                    )}
                    {captionState === "loading" && (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 size={13} className="animate-spin" style={{ color: "var(--ln-gold)" }} />
                        <span className="text-xs" style={{ color: "#B8A88A" }}>Generating caption — only {uploadMode === "audio" ? "title and genre" : uploadMode === "lyrics" ? "title and genre" : "title and category"} sent to AI...</span>
                      </div>
                    )}
                    {captionState === "suggested" && captionSuggestion && (
                      <div className="p-3 mb-3" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.17)" }}>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--ln-parchment)" }}>{captionSuggestion}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleAcceptCaption} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(58,138,86,0.15)", border: "1px solid rgba(74,222,128,0.4)", color: "var(--ln-seal-bright)" }}>
                            <CheckCircle2 size={11} /> Accept
                          </button>
                          <button type="button" onClick={() => { const edited = window.prompt("Edit the caption:", captionSuggestion); if (edited !== null) { setCaption(edited); setCaptionState("accepted"); setCaptionSuggestion(null); toast.success("Caption saved"); } }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(196,154,40,0.09)", border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>
                            <RefreshCw size={11} /> Edit
                          </button>
                          <button type="button" onClick={handleIgnoreCaption} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.06)", color: "#B8A88A" }}>
                            <XIcon size={11} /> Ignore
                          </button>
                        </div>
                      </div>
                    )}
                    {(captionState === "accepted" || caption) && (
                      <div className="space-y-2">
                        {captionState === "accepted" && caption && (
                          <div className="p-3" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)" }}>
                            <div className="flex items-start gap-2">
                              <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ln-seal-bright)" }} />
                              <p className="text-xs leading-relaxed" style={{ color: "var(--ln-parchment)" }}>{caption}</p>
                            </div>
                          </div>
                        )}
                        <Textarea
                          value={caption}
                          onChange={e => setCaption(e.target.value)}
                          placeholder="Write your own caption here..."
                          rows={3}
                          className="text-sm resize-none"
                          style={{ background: "var(--ln-coal)", borderColor: "rgba(196,154,40,0.15)", color: "var(--ln-parchment)" }}
                        />
                        <p className="text-[10px]" style={{ color: "var(--ln-iron)", letterSpacing: "0.04em" }}>
                          🔐 Your lyrics are WID protected and never used for AI training.
                        </p>
                        <button type="button" onClick={() => { setCaptionState("idle"); setCaption(""); }} className="text-[10px] hover:underline" style={{ color: "#B8A88A" }}>Reset caption</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} style={{ borderColor: "rgba(196,154,40,0.2)", color: "#B8A88A" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)} style={{ background: "linear-gradient(135deg, #B8860B, #C49A28)", color: "#1E1020", fontFamily: "'Cinzel', serif", fontWeight: "700", letterSpacing: "0.06em", boxShadow: "0 4px 16px rgba(196,154,40,0.25)" }}>
                  {witnessData ? "Next: Publish" : "Skip & Publish"} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Review & Publish</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.12)" }}>
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
                    style={{ background: i % 2 === 0 ? "var(--ln-coal)" : "var(--ln-coal)" }}>
                    <span style={{ color: "#E2E8F0" }}>{label}</span>
                    <span className={wid ? "font-mono text-xs" : ""} style={{ color: highlight ? "var(--ln-parchment)" : wid ? "var(--ln-gold)" : "var(--ln-parchment)" }}>{value}</span>
                  </div>
                ))}
              </div>
              {!witnessData && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.17)" }}>
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                  <p className="text-xs" style={{ color: "#B8A88A" }}>No Witness ID generated. Your track will be published without cryptographic provenance.</p>
                </div>
              )}
              {/* Upload progress bar — shown during audio upload */}
              {(uploadPhase === "uploading" || uploadPhase === "processing") && (
                <div className="p-4 space-y-2" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}>
                  <div className="flex justify-between text-xs mb-1" style={{ color: "#B8A88A" }}>
                    <span>{uploadPhase === "processing" ? "Processing Witness ID…" : "Uploading audio file…"}</span>
                    <span style={{ color: "var(--ln-gold)" }}>
                      {uploadPhase === "processing" ? "100%" : `${uploadProgress}%`}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: "rgba(196,154,40,0.12)" }}>
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: uploadPhase === "processing" ? "100%" : `${uploadProgress}%`,
                        background: "linear-gradient(90deg, #C49A28, #C49A28)",
                      }}
                    />
                  </div>
                  {uploadPhase === "processing" && (
                    <p className="text-xs text-center" style={{ color: "var(--ln-seal-bright)" }}>
                      ✦ Embedding Witness ID into file metadata…
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} disabled={uploadPhase === "uploading" || uploadPhase === "processing"} style={{ borderColor: "rgba(196,154,40,0.2)", color: "#B8A88A" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handlePublish} disabled={uploadMutation.isPending || uploadPhase === "uploading" || uploadPhase === "processing"} style={{ background: "linear-gradient(135deg, #B8860B, #C49A28)", color: "#1E1020", fontFamily: "'Cinzel', serif", fontWeight: "700", letterSpacing: "0.06em", boxShadow: "0 4px 16px rgba(196,154,40,0.25)" }}>
                  {(uploadMutation.isPending || uploadPhase === "processing") ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : <><Upload className="w-4 h-4 mr-2" /> {uploadMode === "manuscript" || uploadMode === "comic" ? "Publish Work" : "Publish Track"}</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--ln-iron)" }}>
          BDDT Publishing · Command Domains LLC · Sovereign Shutter™ Framework
        </p>
      </div>
    </div>
  );
}
