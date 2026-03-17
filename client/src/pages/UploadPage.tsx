/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — UploadPage
   Divine Noir: Upload + Witness ID Generator unified flow
   Steps: 1) Drop audio/art  2) Track metadata  3) Provenance / Witness ID  4) Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import {
  Upload, Music, Image, Check, Shield, ChevronRight,
  ChevronLeft, Play, Download, Copy, RefreshCw, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { nanoid } from "nanoid";

const GENRES = [
  "Ambient / Lo-fi", "Electronic / House", "Gospel / Worship",
  "Classical / Jazz", "Hip-Hop / Trap", "Rock / Indie",
  "R&B / Soul", "Pop", "Other",
];

const MOODS = ["War", "Healing", "Loss", "Triumph", "Faith", "Love", "Protest", "Documentary", "Joy", "Lament"];
const AI_CONSENT_OPTIONS = [
  { value: "prohibited", label: "AI Training PROHIBITED", color: "#ef4444", desc: "No AI system may train on this work" },
  { value: "attributed", label: "Permitted with Attribution", color: "#E8C547", desc: "AI training allowed only with full credit" },
  { value: "permitted", label: "Freely Permitted", color: "#22c55e", desc: "Open for AI training and derivative use" },
];

/* ── Crypto helpers ── */
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hashBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

async function generateECDSAKeypair() {
  return crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
}

async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(payload),
  );
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

/* ── Waveform canvas ── */
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
      grad.addColorStop(0, "rgba(232,197,71,0)");
      grad.addColorStop(0.3, "rgba(232,197,71,0.9)");
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
    <canvas
      ref={canvasRef}
      width={500}
      height={80}
      className="w-full rounded-xl"
      style={{ background: "oklch(0.11 0.012 280)" }}
    />
  );
}

/* ── Play identity chord ── */
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

/* ── Certificate HTML generator ── */
function buildCertificateHTML(data: {
  wid: string; creatorName: string; songTitle: string; genre: string;
  bpm: string; keySignature: string; releaseDate: string; aiConsent: string;
  fileHash: string; publicKeyJWK: string; signature: string;
  frequencies: number[]; timestamp: string; album: string;
  bmiNumber: string; isrc: string;
}): string {
  const consentColor = data.aiConsent === "prohibited" ? "#ef4444" : data.aiConsent === "attributed" ? "#E8C547" : "#22c55e";
  const consentLabel = data.aiConsent === "prohibited" ? "AI TRAINING PROHIBITED"
    : data.aiConsent === "attributed" ? "PERMITTED WITH ATTRIBUTION" : "FREELY PERMITTED";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Music Witness Certificate — ${data.wid}</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#e0e0e0;font-family:'Share Tech Mono',monospace;padding:40px;min-height:100vh}
.cert{max-width:780px;margin:0 auto;border:1px solid rgba(232,197,71,0.4);border-radius:12px;overflow:hidden;
  box-shadow:0 0 60px rgba(232,197,71,0.08),inset 0 0 60px rgba(0,0,0,0.4)}
.header{background:linear-gradient(135deg,#0f0f0f,#1a1a1a);padding:32px 40px;border-bottom:1px solid rgba(232,197,71,0.2);
  display:flex;align-items:center;gap:20px}
.shield{width:56px;height:56px;background:linear-gradient(135deg,rgba(232,197,71,0.2),rgba(124,58,237,0.2));
  border:1px solid rgba(232,197,71,0.4);border-radius:12px;display:flex;align-items:center;justify-content:center;
  font-size:28px;flex-shrink:0}
.org{font-family:'Orbitron',sans-serif;font-size:10px;color:#E8C547;letter-spacing:0.15em;margin-bottom:4px}
.title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:0.05em}
.body{padding:32px 40px}
.wid-box{background:rgba(232,197,71,0.06);border:1px solid rgba(232,197,71,0.25);border-radius:8px;
  padding:20px 24px;margin-bottom:28px;text-align:center}
.wid-label{font-size:10px;letter-spacing:0.15em;color:#E8C547;margin-bottom:8px}
.wid-value{font-family:'Orbitron',sans-serif;font-size:26px;font-weight:900;color:#E8C547;letter-spacing:0.08em}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.field{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:12px 16px}
.field-label{font-size:9px;letter-spacing:0.14em;color:rgba(255,255,255,0.35);margin-bottom:4px}
.field-value{font-size:13px;color:#e0e0e0}
.consent-box{background:rgba(0,0,0,0.3);border:2px solid ${consentColor};border-radius:8px;
  padding:16px 20px;margin-bottom:24px;text-align:center}
.consent-label{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;color:${consentColor};letter-spacing:0.1em}
.section-title{font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:0.14em;color:rgba(255,255,255,0.3);
  margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06)}
.mono-block{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:6px;
  padding:12px 16px;font-size:10px;color:rgba(255,255,255,0.5);word-break:break-all;margin-bottom:20px;line-height:1.6}
.freqs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.freq-chip{background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:20px;
  padding:4px 12px;font-size:11px;color:#A78BFA}
.footer{background:#0d0d0d;border-top:1px solid rgba(232,197,71,0.15);padding:20px 40px;
  display:flex;justify-content:space-between;align-items:center;font-size:10px;color:rgba(255,255,255,0.25)}
.ts{color:rgba(255,255,255,0.4)}
</style></head><body>
<div class="cert">
  <div class="header">
    <div class="shield">🛡</div>
    <div>
      <div class="org">COMMAND DOMAINS LLC / BDDT PUBLISHING — SOVEREIGN SHUTTER™ FRAMEWORK</div>
      <div class="title">MUSIC WITNESS CERTIFICATE</div>
    </div>
  </div>
  <div class="body">
    <div class="wid-box">
      <div class="wid-label">WITNESS ID</div>
      <div class="wid-value">${data.wid}</div>
    </div>
    <div class="grid">
      <div class="field"><div class="field-label">CREATOR / ARTIST</div><div class="field-value">${data.creatorName || "—"}</div></div>
      <div class="field"><div class="field-label">SONG TITLE</div><div class="field-value">${data.songTitle || "—"}</div></div>
      <div class="field"><div class="field-label">ALBUM / PROJECT</div><div class="field-value">${data.album || "—"}</div></div>
      <div class="field"><div class="field-label">GENRE</div><div class="field-value">${data.genre || "—"}</div></div>
      <div class="field"><div class="field-label">BPM / KEY</div><div class="field-value">${data.bpm || "—"} / ${data.keySignature || "—"}</div></div>
      <div class="field"><div class="field-label">RELEASE DATE</div><div class="field-value">${data.releaseDate || "—"}</div></div>
      <div class="field"><div class="field-label">BMI MEMBER #</div><div class="field-value">${data.bmiNumber || "—"}</div></div>
      <div class="field"><div class="field-label">ISRC CODE</div><div class="field-value">${data.isrc || "—"}</div></div>
    </div>
    <div class="consent-box"><div class="consent-label">⚡ AI CONSENT STATUS: ${consentLabel}</div></div>
    <div class="section-title">HARMONIC FREQUENCY SIGNATURE</div>
    <div class="freqs">${data.frequencies.map(f => `<span class="freq-chip">${f} Hz</span>`).join("")}</div>
    <div class="section-title">CRYPTOGRAPHIC PROVENANCE</div>
    <div class="mono-block">
      <div><span style="color:#E8C547">FILE HASH (SHA-256):</span><br/>${data.fileHash}</div>
      <div style="margin-top:10px"><span style="color:#E8C547">ECDSA SIGNATURE:</span><br/>${data.signature}</div>
      <div style="margin-top:10px"><span style="color:#E8C547">PUBLIC KEY (JWK):</span><br/>${data.publicKeyJWK}</div>
    </div>
    <div class="section-title">WITNESS TIMESTAMP</div>
    <div class="mono-block">${data.timestamp}</div>
  </div>
  <div class="footer">
    <span>© Command Domains LLC / BDDT Publishing — Sovereign Shutter™ Framework</span>
    <span class="ts">${data.timestamp}</span>
  </div>
</div>
</body></html>`;
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function UploadPage() {
  const { addTrack } = usePlayer();
  const [, navigate] = useLocation();

  // Step state: 1=files, 2=metadata, 3=provenance, 4=done
  const [step, setStep] = useState(1);

  // Step 1 — files
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artPreview, setArtPreview] = useState<string | null>(null);
  const [artType, setArtType] = useState<"image" | "video">("image");
  const [audioDrag, setAudioDrag] = useState(false);
  const [artDrag, setArtDrag] = useState(false);
  const audioRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);

  // Step 2 — metadata
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [album, setAlbum] = useState("");
  const [bpm, setBpm] = useState("");
  const [keyNote, setKeyNote] = useState("");
  const [keyMode, setKeyMode] = useState("Major");
  const [releaseDate, setReleaseDate] = useState("");
  const [isrc, setIsrc] = useState("");
  const [bmiNumber, setBmiNumber] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  // Step 3 — provenance
  const [aiConsent, setAiConsent] = useState("prohibited");
  const [generating, setGenerating] = useState(false);
  const [witnessID, setWitnessID] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [signature, setSignature] = useState("");
  const [publicKeyJWK, setPublicKeyJWK] = useState("");
  const [frequencies, setFrequencies] = useState<number[]>([]);
  const [waveformActive, setWaveformActive] = useState(false);
  const [witnessTimestamp, setWitnessTimestamp] = useState("");

  // Step 4 — publish
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAudio = (f: File) => {
    setAudioFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleArt = (f: File) => {
    setArtFile(f);
    setArtType(f.type.startsWith("video") ? "video" : "image");
    setArtPreview(URL.createObjectURL(f));
  };

  const toggleMood = (m: string) =>
    setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const generateWitnessID = useCallback(async () => {
    if (!audioFile) { toast.error("Audio file required for Witness ID generation"); return; }
    setGenerating(true);
    try {
      const buf = await audioFile.arrayBuffer();
      const hash = await sha256Hex(buf);
      const keypair = await generateECDSAKeypair();
      const payload = JSON.stringify({ hash, title, artist, timestamp: new Date().toISOString() });
      const sig = await signPayload(keypair.privateKey, payload);
      const pubJWK = await exportPublicKeyJWK(keypair.publicKey);
      const freqs = deriveHarmonicFrequencies(hash);
      const wid = formatWID(hash);
      const ts = new Date().toISOString();

      setFileHash(hash);
      setSignature(sig);
      setPublicKeyJWK(pubJWK);
      setFrequencies(freqs);
      setWitnessID(wid);
      setWitnessTimestamp(ts);
      setWaveformActive(true);
      toast.success("Witness ID generated — provenance established");
    } catch (e) {
      toast.error("Failed to generate Witness ID");
    } finally {
      setGenerating(false);
    }
  }, [audioFile, title, artist]);

  const downloadCertificate = () => {
    const html = buildCertificateHTML({
      wid: witnessID, creatorName: artist, songTitle: title, genre, bpm,
      keySignature: keyNote ? `${keyNote} ${keyMode}` : "",
      releaseDate, aiConsent, fileHash, publicKeyJWK, signature,
      frequencies, timestamp: witnessTimestamp, album, bmiNumber, isrc,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${witnessID || "witness-certificate"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doPublish = () => {
    if (!title.trim()) { toast.error("Track title required"); return; }
    if (!audioFile) { toast.error("Audio file required"); return; }
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
              artist: artist.trim() || "Unknown Artist",
              genre: genre || "Other",
              desc,
              audioUrl: URL.createObjectURL(audioFile),
              artUrl: artPreview || undefined,
              artType,
              emoji: "🎙️",
              bg: "linear-gradient(135deg,oklch(0.18 0.014 280),oklch(0.14 0.013 280))",
              dur: "—",
              isOwn: true,
              witnessId: witnessID || undefined,
            };
            addTrack(track);
            toast.success("Track published to Living Nexus!");
            setTimeout(() => navigate("/profile"), 600);
          }, 400);
        }, 300);
      }
    }, 80);
  };

  /* ── Shared styles ── */
  const inputCls = `w-full px-4 py-2.5 rounded-xl text-[13.5px] font-body text-white/80
    bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
    focus:border-[#A78BFA]/50 transition-colors placeholder:text-white/20`;

  const STEPS = [
    { n: 1, label: "Files" },
    { n: 2, label: "Metadata" },
    { n: 3, label: "Witness ID" },
    { n: 4, label: "Publish" },
  ];

  return (
    <div className="animate-fade-up px-6 py-6 max-w-[720px]">
      {/* ── Page header ── */}
      <h1 className="font-heading text-2xl text-white/90 tracking-wider mb-1">Upload a Track</h1>
      <p className="text-[13px] text-white/35 font-body mb-6">
        Upload your sound, establish cryptographic provenance, then publish to Living Nexus.
      </p>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-heading tracking-wider transition-all
                ${step === s.n
                  ? "bg-[#E8C547]/15 border border-[#E8C547]/40 text-[#E8C547]"
                  : step > s.n
                    ? "bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[#A78BFA]"
                    : "border border-white/[0.08] text-white/25"
                }`}
            >
              {step > s.n ? <Check size={10} /> : <span>{s.n}</span>}
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-1 ${step > s.n ? "bg-[#A78BFA]/40" : "bg-white/[0.08]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════
          STEP 1 — Files
      ════════════════════════════════ */}
      {step === 1 && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Audio drop */}
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
                  <div className="text-[11px] text-white/30 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <>
                  <Music size={32} className="text-white/20 mx-auto mb-3" />
                  <div className="text-[14px] font-body text-white/50 mb-1">Drop Audio File</div>
                  <div className="text-[12px] text-white/25">MP3 · WAV · FLAC · OGG</div>
                </>
              )}
            </div>

            {/* Artwork drop */}
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
                  <div className="text-[14px] font-body text-white/50 mb-1">Artwork / Video</div>
                  <div className="text-[12px] text-white/25">JPG · PNG · MP4 · GIF</div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => { if (!audioFile) { toast.error("Please upload an audio file first"); return; } setStep(2); }}
            className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
              transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)]"
            style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
          >
            Next: Track Metadata <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ════════════════════════════════
          STEP 2 — Metadata
      ════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Track Title *</label>
              <input className={inputCls} placeholder="Name your track…" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Artist Name</label>
              <input className={inputCls} placeholder="Your name or alias" value={artist} onChange={e => setArtist(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Album / Project</label>
              <input className={inputCls} placeholder="Optional" value={album} onChange={e => setAlbum(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Genre</label>
              <select className={`${inputCls} cursor-pointer`} value={genre} onChange={e => setGenre(e.target.value)}
                style={{ background: "oklch(0.14 0.013 280)" }}>
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">BPM</label>
              <input className={inputCls} type="number" placeholder="120" value={bpm} onChange={e => setBpm(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Key</label>
              <select className={`${inputCls} cursor-pointer`} value={keyNote} onChange={e => setKeyNote(e.target.value)}
                style={{ background: "oklch(0.14 0.013 280)" }}>
                <option value="">—</option>
                {["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Mode</label>
              <select className={`${inputCls} cursor-pointer`} value={keyMode} onChange={e => setKeyMode(e.target.value)}
                style={{ background: "oklch(0.14 0.013 280)" }}>
                <option>Major</option><option>Minor</option><option>Dorian</option><option>Mixolydian</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Release Date</label>
              <input className={inputCls} type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">ISRC Code</label>
              <input className={inputCls} placeholder="US-ABC-24-00001" value={isrc} onChange={e => setIsrc(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">BMI Member #</label>
              <input className={inputCls} placeholder="Optional" value={bmiNumber} onChange={e => setBmiNumber(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Mood / Theme Tags</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button key={m} onClick={() => toggleMood(m)}
                  className={`px-3 py-1 rounded-full text-[12px] font-body transition-all border
                    ${selectedMoods.includes(m)
                      ? "bg-[#A78BFA]/20 border-[#A78BFA]/50 text-[#A78BFA]"
                      : "border-white/[0.1] text-white/40 hover:border-white/20"}`}
                >{m}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-2">Description</label>
            <textarea className={`${inputCls} resize-y min-h-[80px]`}
              placeholder="Tell the cosmos about this track…" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-[13px] tracking-wider text-white/50
                border border-white/[0.1] hover:border-white/20 transition-all">
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => { if (!title.trim()) { toast.error("Track title is required"); return; } setStep(3); }}
              className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
                transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)]"
              style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
            >
              Next: Witness ID <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          STEP 3 — Witness ID / Provenance
      ════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E8C547]/20 bg-[#E8C547]/5">
            <Shield size={20} className="text-[#E8C547] flex-shrink-0" />
            <div>
              <div className="text-[11px] font-heading tracking-[0.12em] uppercase text-[#E8C547] mb-0.5">
                Command Domains LLC / BDDT Publishing — Sovereign Shutter™
              </div>
              <div className="text-[12px] text-white/50 font-body">
                Generate a cryptographic Witness ID for this track. All processing is client-side — no data leaves your browser.
              </div>
            </div>
          </div>

          {/* AI Consent */}
          <div>
            <label className="block text-[11px] font-heading tracking-[0.1em] uppercase text-white/30 mb-3">AI Consent Status</label>
            <div className="space-y-2">
              {AI_CONSENT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setAiConsent(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                    ${aiConsent === opt.value ? "border-opacity-60 bg-opacity-10" : "border-white/[0.08] hover:border-white/15"}`}
                  style={aiConsent === opt.value ? {
                    borderColor: opt.color,
                    background: `${opt.color}12`,
                  } : {}}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0 border-2 transition-all"
                    style={{ borderColor: opt.color, background: aiConsent === opt.value ? opt.color : "transparent" }} />
                  <div>
                    <div className="text-[12px] font-heading tracking-wider" style={{ color: opt.color }}>{opt.label}</div>
                    <div className="text-[11px] text-white/35 font-body">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          {!witnessID && (
            <button
              onClick={generateWitnessID}
              disabled={generating}
              className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
                transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
            >
              {generating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              {generating ? "Generating…" : "Generate Witness ID"}
            </button>
          )}

          {/* Result */}
          {witnessID && (
            <div className="space-y-4">
              {/* WID display */}
              <div className="p-5 rounded-xl border border-[#E8C547]/30 bg-[#E8C547]/5 text-center">
                <div className="text-[10px] font-heading tracking-[0.15em] uppercase text-[#E8C547]/60 mb-2">Witness ID</div>
                <div className="font-mono text-[20px] font-bold text-[#E8C547] tracking-widest mb-3">{witnessID}</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(witnessID); toast.success("Witness ID copied"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wider
                    border border-[#E8C547]/30 text-[#E8C547]/70 hover:text-[#E8C547] hover:border-[#E8C547]/60 transition-all mx-auto"
                >
                  <Copy size={11} /> Copy ID
                </button>
              </div>

              {/* Harmonic waveform */}
              <div>
                <div className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/30 mb-2">
                  Harmonic Frequency Signature
                </div>
                <HarmonicWaveform frequencies={frequencies} active={waveformActive} />
                <div className="flex flex-wrap gap-2 mt-2">
                  {frequencies.map((f, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-mono
                      bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[#A78BFA]">{f} Hz</span>
                  ))}
                </div>
                <button
                  onClick={() => playIdentityChord(frequencies)}
                  className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wider
                    border border-[#A78BFA]/30 text-[#A78BFA]/70 hover:text-[#A78BFA] hover:border-[#A78BFA]/60 transition-all"
                >
                  <Play size={11} /> Play Identity Chord
                </button>
              </div>

              {/* Hash preview */}
              <div className="p-3 rounded-xl bg-[oklch(0.11_0.012_280)] border border-white/[0.06]">
                <div className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/25 mb-1.5">SHA-256 File Hash</div>
                <div className="font-mono text-[10px] text-white/40 break-all">{fileHash}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={downloadCertificate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-[12px] tracking-wider
                    border border-[#E8C547]/30 text-[#E8C547]/80 hover:text-[#E8C547] hover:border-[#E8C547]/60 transition-all">
                  <Download size={13} /> Download Certificate
                </button>
                <button onClick={() => { setWitnessID(""); setWaveformActive(false); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-[12px] tracking-wider
                    border border-white/[0.1] text-white/40 hover:border-white/20 hover:text-white/60 transition-all">
                  <RefreshCw size={13} /> Regenerate
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-[13px] tracking-wider text-white/50
                border border-white/[0.1] hover:border-white/20 transition-all">
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
                transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)]"
              style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
            >
              {witnessID ? "Next: Publish" : "Skip & Publish"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          STEP 4 — Publish
      ════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[oklch(0.12_0.012_280)] space-y-3">
            <div className="text-[11px] font-heading tracking-[0.12em] uppercase text-white/30 mb-3">Track Summary</div>
            <div className="flex gap-4 items-start">
              {artPreview && (
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  {artType === "video"
                    ? <video src={artPreview} className="w-full h-full object-cover" muted loop autoPlay />
                    : <img src={artPreview} className="w-full h-full object-cover" alt="" />
                  }
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-heading text-white/90 truncate">{title || "Untitled"}</div>
                <div className="text-[13px] text-white/45 font-body">{artist || "Unknown Artist"}</div>
                {genre && <div className="text-[11px] text-white/30 font-body mt-1">{genre}</div>}
              </div>
            </div>
            {witnessID && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <Shield size={12} className="text-[#E8C547]" />
                <span className="font-mono text-[11px] text-[#E8C547]/70">{witnessID}</span>
              </div>
            )}
          </div>

          {uploading && (
            <div>
              <div className="text-[11px] font-heading tracking-wider text-white/40 mb-2 uppercase">
                {progress < 100 ? "Ascending to the Nexus…" : "Published ✓"}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7C3AED,#E8C547)" }} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-[13px] tracking-wider text-white/50
                border border-white/[0.1] hover:border-white/20 transition-all">
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={doPublish}
              disabled={uploading}
              className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading text-[13px] tracking-wider text-black font-bold
                transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.4)] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#E8C547,#C9A84C)" }}
            >
              <Upload size={14} /> Publish to Living Nexus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
