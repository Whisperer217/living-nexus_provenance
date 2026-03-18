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
  Upload, Music, Image as ImageIcon, Check, Shield, ChevronRight,
  ChevronLeft, Play, Download, Copy, RefreshCw, Zap, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const GENRES = [
  "Ambient / Lo-fi", "Electronic / House", "Gospel / Worship",
  "Classical / Jazz", "Hip-Hop / Trap", "Rock / Indie",
  "R&B / Soul", "Pop", "Other",
];

const MOODS = ["War", "Healing", "Loss", "Triumph", "Faith", "Love", "Protest", "Documentary", "Joy", "Lament"];

const AI_CONSENT_OPTIONS = [
  { value: "prohibited" as const, label: "AI Training PROHIBITED", color: "oklch(0.65 0.18 25)", desc: "No AI system may train on this work" },
  { value: "permitted_attribution" as const, label: "Permitted with Attribution", color: "oklch(0.75 0.18 85)", desc: "AI training allowed only with full credit" },
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
      style={{ background: "oklch(0.10 0.025 265)" }} />
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

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [audioDragging, setAudioDragging] = useState(false);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [keySignature, setKeySignature] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [isrc, setIsrc] = useState("");
  const [bmiNumber, setBmiNumber] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");

  const [witnessData, setWitnessData] = useState<WitnessData | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);
  const [waveformActive, setWaveformActive] = useState(false);

  const uploadMutation = trpc.songs.upload.useMutation({
    onSuccess: () => { toast.success("Track published to Living Nexus!"); navigate("/dashboard"); },
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
      setAudioFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    } else {
      toast.error("Please drop an audio file");
    }
  }, [title]);

  const handleGenerateWid = async () => {
    if (!audioFile) { toast.error("Please select an audio file first"); return; }
    setGeneratingWid(true);
    try {
      const buffer = await audioFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const wid = formatWID(fileHash);
      const frequencies = deriveHarmonicFrequencies(fileHash);
      const keypair = await generateECDSAKeypair();
      const payload = `${wid}|${title || audioFile.name}|${user?.name || ""}|${Date.now()}`;
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const timestamp = new Date().toISOString();
      setWitnessData({ wid, fileHash, frequencies, publicKeyJWK, signature, timestamp });
      setWaveformActive(true);
      toast.success("Witness ID generated — cryptographic provenance established");
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

  const handlePublish = async () => {
    if (!audioFile || !title) { toast.error("Audio file and title are required"); return; }
    try {
      const audioBase64 = await toBase64(audioFile);
      let coverBase64: string | undefined;
      let coverMimeType: string | undefined;
      if (coverFile) { coverBase64 = await toBase64(coverFile); coverMimeType = coverFile.type; }
      uploadMutation.mutate({
        audioBase64, audioMimeType: audioFile.type, audioFileName: audioFile.name,
        coverBase64, coverMimeType, title, genre: genre || undefined,
        bpm: bpm ? parseInt(bpm) : undefined, keySignature: keySignature || undefined,
        albumName: albumName || undefined, releaseDate: releaseDate || undefined,
        isrc: isrc || undefined, aiConsent, moodTags: selectedMoods, coWriters: [],
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        harmonicSignature: witnessData?.frequencies, ecdsaPublicKey: witnessData?.publicKeyJWK,
        ecdsaSignature: witnessData?.signature,
      });
    } catch { toast.error("Failed to prepare upload"); }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center max-w-sm mx-auto px-6">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "oklch(0.75 0.18 85)" }} />
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Sign In Required</h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.55 0.04 280)" }}>Sign in to upload tracks to Living Nexus.</p>
        <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>Sign In</Button>
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
          <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>Upload Track</h1>
          <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>Publish your music with cryptographic provenance — BDDT Publishing / Command Domains LLC</p>
        </div>

        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.n;
            const isDone = step > s.n;
            return (
              <div key={s.n} className="flex items-center gap-1 flex-1">
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: isDone ? "oklch(0.65 0.18 145)" : isActive ? "oklch(0.75 0.18 85)" : "oklch(0.13 0.028 270)", color: isDone || isActive ? "oklch(0.08 0.015 280)" : "oklch(0.45 0.03 280)" }}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: isActive ? "oklch(0.75 0.18 85)" : isDone ? "oklch(0.65 0.18 145)" : "oklch(0.45 0.03 280)" }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px flex-shrink-0" style={{ background: step > s.n ? "oklch(0.65 0.18 145 / 0.5)" : "oklch(0.2 0.015 280)" }} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl p-6 md:p-8" style={{ background: "oklch(0.095 0.028 275)", border: "1px solid oklch(0.2 0.015 280)" }}>

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Select Files</h2>
              <div
                onClick={() => audioInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setAudioDragging(true); }}
                onDragLeave={() => setAudioDragging(false)}
                onDrop={handleAudioDrop}
                className="rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{ border: `2px dashed ${audioFile ? "oklch(0.65 0.18 145)" : audioDragging ? "oklch(0.75 0.18 85)" : "oklch(0.28 0.02 280)"}`, background: audioFile ? "oklch(0.65 0.18 145 / 0.05)" : audioDragging ? "oklch(0.75 0.18 85 / 0.05)" : "oklch(0.09 0.01 280)" }}>
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setAudioFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, "")); } }} />
                {audioFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "oklch(0.65 0.18 145 / 0.2)" }}>
                      <Check className="w-5 h-5" style={{ color: "oklch(0.65 0.18 145)" }} />
                    </div>
                    <p className="font-medium text-sm" style={{ color: "oklch(0.65 0.18 145)" }}>{audioFile.name}</p>
                    <p className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={e => { e.stopPropagation(); setAudioFile(null); }} className="text-xs hover:underline" style={{ color: "oklch(0.55 0.04 280)" }}>Remove</button>
                  </div>
                ) : (
                  <>
                    <Music className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(0.75 0.18 85)", opacity: 0.4 }} />
                    <p className="font-medium text-sm mb-1" style={{ color: "oklch(0.7 0.04 280)" }}>{audioDragging ? "Drop it!" : "Drop audio file here or click to browse"}</p>
                    <p className="text-xs" style={{ color: "oklch(0.45 0.03 280)" }}>MP3, WAV, FLAC, M4A, OGG supported</p>
                  </>
                )}
              </div>
              <div onClick={() => coverInputRef.current?.click()} className="rounded-xl p-5 text-center cursor-pointer transition-all hover:bg-white/5"
                style={{ border: `2px dashed ${coverFile ? "oklch(0.65 0.2 300)" : "oklch(0.22 0.015 280)"}`, background: coverFile ? "oklch(0.65 0.2 300 / 0.05)" : "oklch(0.09 0.01 280)" }}>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }} />
                {coverFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "oklch(0.65 0.2 300)" }} />
                    <span className="text-sm" style={{ color: "oklch(0.65 0.2 300)" }}>{coverFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setCoverFile(null); }} className="text-xs hover:underline ml-2" style={{ color: "oklch(0.5 0.03 280)" }}>Remove</button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 mx-auto mb-1" style={{ color: "oklch(0.65 0.2 300)", opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: "oklch(0.55 0.04 280)" }}>Cover art (optional) — JPG, PNG, WebP</p>
                  </>
                )}
              </div>
              <Button className="w-full" disabled={!audioFile} onClick={() => setStep(2)} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
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
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button key={g} onClick={() => setGenre(g === genre ? "" : g)} className="px-3 py-1 rounded-full text-xs transition-all"
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
                    <button key={m} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                      className="px-3 py-1 rounded-full text-xs transition-all"
                      style={{ background: selectedMoods.includes(m) ? "oklch(0.75 0.18 85 / 0.2)" : "oklch(0.15 0.015 280)", color: selectedMoods.includes(m) ? "oklch(0.75 0.18 85)" : "oklch(0.5 0.03 280)", border: `1px solid ${selectedMoods.includes(m) ? "oklch(0.75 0.18 85 / 0.4)" : "oklch(0.22 0.015 280)"}` }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-2 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>AI Training Consent</label>
                <div className="space-y-2">
                  {AI_CONSENT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setAiConsent(opt.value)} className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{ background: aiConsent === opt.value ? `${opt.color.replace(")", " / 0.08)")}` : "oklch(0.13 0.015 280)", border: `1px solid ${aiConsent === opt.value ? opt.color.replace(")", " / 0.35)") : "oklch(0.2 0.015 280)"}` }}>
                      <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 transition-all"
                        style={{ background: aiConsent === opt.value ? opt.color : "transparent", border: `2px solid ${opt.color}` }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: opt.color }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.5 0.03 280)" }}>{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" disabled={!title} onClick={() => setStep(3)} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  Next: Witness ID <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-lg" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Witness ID — Cryptographic Provenance</h2>
                <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.03 280)" }}>All processing is local — your audio is hashed in-browser. ECDSA P-256 signature establishes tamper-evident ownership.</p>
              </div>
              {!witnessData ? (
                <div className="text-center py-10 rounded-xl" style={{ background: "oklch(0.09 0.01 280)", border: "2px dashed oklch(0.75 0.18 85 / 0.25)" }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.75 0.18 85 / 0.1)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
                    <Shield className="w-8 h-8" style={{ color: "oklch(0.75 0.18 85)", opacity: 0.6 }} />
                  </div>
                  <p className="text-sm mb-1 font-medium" style={{ color: "oklch(0.7 0.04 280)" }}>Generate your Witness ID</p>
                  <p className="text-xs mb-5" style={{ color: "oklch(0.45 0.03 280)" }}>SHA-256 hash + ECDSA P-256 signature + harmonic frequency derivation</p>
                  <Button onClick={handleGenerateWid} disabled={generatingWid} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                    {generatingWid ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Zap className="w-4 h-4 mr-2" /> Generate Witness ID</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl text-center" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
                    <p className="text-xs mb-2 font-medium" style={{ color: "oklch(0.55 0.04 280)", letterSpacing: "0.12em" }}>WITNESS ID</p>
                    <p className="text-xl font-bold font-mono" style={{ color: "oklch(0.75 0.18 85)" }}>{witnessData.wid}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button onClick={() => { navigator.clipboard.writeText(witnessData.wid); toast.success("WID copied!"); }} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.55 0.04 280)" }}>
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
                      <button onClick={() => playIdentityChord(witnessData.frequencies)} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.55 0.04 280)" }}>
                        <Play className="w-3 h-3" /> Play Identity Chord
                      </button>
                      <span style={{ color: "oklch(0.3 0.02 280)" }}>·</span>
                      <button onClick={handleGenerateWid} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "oklch(0.55 0.04 280)" }}>
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                  </div>
                  <HarmonicWaveform frequencies={witnessData.frequencies} active={waveformActive} />
                  <div className="p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <p className="text-xs mb-1" style={{ color: "oklch(0.5 0.03 280)", letterSpacing: "0.1em" }}>SHA-256 FILE HASH</p>
                    <p className="text-xs font-mono truncate" style={{ color: "oklch(0.6 0.04 280)" }}>{witnessData.fileHash}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <p className="text-xs mb-2" style={{ color: "oklch(0.5 0.03 280)", letterSpacing: "0.1em" }}>HARMONIC SIGNATURE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {witnessData.frequencies.map((f, i) => (
                        <Badge key={i} style={{ background: "oklch(0.65 0.2 300 / 0.15)", color: "oklch(0.65 0.2 300)", fontSize: "10px" }}>{f} Hz</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <p className="text-xs mb-2" style={{ color: "oklch(0.5 0.03 280)", letterSpacing: "0.1em" }}>AI CONSENT DECLARATION</p>
                    <Badge style={{ background: aiConsent === "prohibited" ? "oklch(0.65 0.18 25 / 0.2)" : aiConsent === "permitted_attribution" ? "oklch(0.75 0.18 85 / 0.2)" : "oklch(0.65 0.18 145 / 0.2)", color: aiConsent === "prohibited" ? "oklch(0.65 0.18 25)" : aiConsent === "permitted_attribution" ? "oklch(0.75 0.18 85)" : "oklch(0.65 0.18 145)" }}>
                      {aiConsent === "prohibited" ? "AI TRAINING PROHIBITED" : aiConsent === "permitted_attribution" ? "PERMITTED WITH ATTRIBUTION" : "FREELY PERMITTED"}
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full" onClick={downloadCertificate} style={{ borderColor: "oklch(0.75 0.18 85 / 0.4)", color: "oklch(0.75 0.18 85)" }}>
                    <Download className="w-4 h-4 mr-2" /> Download Witness Certificate (HTML)
                  </Button>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
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
                  { label: "Audio File", value: audioFile?.name },
                  { label: "Cover Art", value: coverFile?.name || "None" },
                  { label: "Title", value: title, highlight: true },
                  { label: "Genre", value: genre || "Not specified" },
                  { label: "BPM / Key", value: [bpm, keySignature].filter(Boolean).join(" / ") || "Not specified" },
                  { label: "Album", value: albumName || "Not specified" },
                  { label: "ISRC", value: isrc || "Not specified" },
                  { label: "Mood Tags", value: selectedMoods.length ? selectedMoods.join(", ") : "None" },
                  { label: "Witness ID", value: witnessData?.wid || "Not generated", wid: !!witnessData },
                  { label: "AI Consent", value: aiConsent.replace(/_/g, " ").toUpperCase() },
                ].map(({ label, value, highlight, wid }, i) => (
                  <div key={label} className="flex justify-between items-center px-4 py-2.5 text-sm"
                    style={{ background: i % 2 === 0 ? "oklch(0.12 0.015 280)" : "oklch(0.105 0.013 280)" }}>
                    <span style={{ color: "oklch(0.5 0.03 280)" }}>{label}</span>
                    <span className={wid ? "font-mono text-xs" : ""} style={{ color: highlight ? "oklch(0.9 0.02 85)" : wid ? "oklch(0.75 0.18 85)" : "oklch(0.7 0.04 280)" }}>{value}</span>
                  </div>
                ))}
              </div>
              {!witnessData && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "oklch(0.75 0.18 85 / 0.08)", border: "1px solid oklch(0.75 0.18 85 / 0.2)" }}>
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.75 0.18 85)" }} />
                  <p className="text-xs" style={{ color: "oklch(0.65 0.04 280)" }}>No Witness ID generated. Your track will be published without cryptographic provenance.</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handlePublish} disabled={uploadMutation.isPending} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  {uploadMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : <><Upload className="w-4 h-4 mr-2" /> Publish Track</>}
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
