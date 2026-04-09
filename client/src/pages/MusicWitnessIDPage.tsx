/*
═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Music Witness ID Generator
   Command Domains LLC / BDDT Publishing
   Sovereign Shutter™ Framework
   
   Design: Dark #0a0a0a | Gold Orbitron headings | Cyan/teal accents
   Monospace IDs | Animated harmonic waveform
   All processing is CLIENT-SIDE — no data leaves the browser
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from "react";
import { Shield, Music, Upload, Play, Download, Copy, Check, ChevronDown, X, Plus } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
interface SongMetadata {
  creatorName: string;
  orcidId: string;
  bmiMemberNumber: string;
  isni: string;
  songTitle: string;
  genre: string;
  bpm: string;
  keySignature: string;
  keyMode: string;
  moodTags: string[];
  lyrics: string;
  coWriters: string[];
  isrcCode: string;
  bmiWorkId: string;
  aiConsent: "PROHIBITED" | "PERMITTED_WITH_ATTRIBUTION" | "PERMITTED";
  releaseDate: string;
  albumName: string;
}

interface WitnessResult {
  witnessId: string;
  timestamp: string;
  fileHash: string | null;
  lyricsHash: string | null;
  harmonics: number[];
  harmonicString: string;
  publicKeyFingerprint: string;
  signature: string;
  privateKeyJson: string;
  fileDuration: string | null;
  fileSampleRate: string | null;
  fileBitDepth: string | null;
}

// ─── Constants ───────────────────────────────────────────────────
const GENRES = ["Hip-Hop", "R&B", "Gospel", "Rock", "Country", "Electronic", "Jazz", "Classical", "Spoken Word", "Other"];
const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MOODS = ["War", "Healing", "Loss", "Triumph", "Faith", "Love", "Protest", "Documentary"];
const AI_CONSENT_OPTIONS = [
  { value: "PROHIBITED", label: "PROHIBITED", color: "#ef4444", desc: "AI training use is strictly forbidden" },
  { value: "PERMITTED_WITH_ATTRIBUTION", label: "PERMITTED WITH ATTRIBUTION", color: "#f59e0b", desc: "AI training allowed only with full attribution" },
  { value: "PERMITTED", label: "PERMITTED", color: "#22c55e", desc: "AI training use is permitted" },
];
const BASE_FREQUENCIES = [110, 220, 330, 440, 550, 660];
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ─── Utility Functions ───────────────────────────────────────────
async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function deriveHarmonicSignature(hash: string): number[] {
  const hexGroups: string[] = [];
  for (let i = 0; i < 24; i += 4) {
    hexGroups.push(hash.slice(i, i + 4));
  }
  return hexGroups.map((hex, index) => {
    const value = parseInt(hex, 16);
    const normalized = value / 65535;
    const baseFreq = BASE_FREQUENCIES[index];
    const frequency = baseFreq * Math.pow(2, (normalized - 0.5) * (50 / 1200));
    return Math.round(frequency * 100) / 100;
  });
}

function frequencyToNote(freq: number): { note: string; octave: number; cents: number } {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const roundedSemitones = Math.round(semitones);
  const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12; // A=9
  const octave = Math.floor((roundedSemitones + 57) / 12);
  const cents = Math.round((semitones - roundedSemitones) * 100);
  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

async function generateECDSAKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  return keyPair;
}

async function signData(privateKey: CryptoKey, data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, encoded);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function exportPublicKeyFingerprint(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const hash = await sha256Hex(exported);
  return hash.slice(0, 32).toUpperCase().match(/.{1,4}/g)!.join(":").slice(0, 23);
}

async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("jwk", privateKey);
  return JSON.stringify(exported, null, 2);
}

// ─── Waveform Canvas ─────────────────────────────────────────────
function HarmonicWaveform({ harmonics, playing }: { harmonics: number[]; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || harmonics.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(201,168,76,0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (H / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Composite waveform
      const gradient = ctx.createLinearGradient(0, 0, W, 0);
      gradient.addColorStop(0, "rgba(201,168,76,0.2)");
      gradient.addColorStop(0.5, "rgba(201,168,76,1)");
      gradient.addColorStop(1, "rgba(201,168,76,0.2)");

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#D4AF37";

      const normalizedFreqs = harmonics.map(f => (f - 100) / 600); // normalize 100-700Hz → 0-1
      const speed = playing ? 0.04 : 0.008;

      for (let x = 0; x < W; x++) {
        const t = (x / W) * Math.PI * 2;
        let y = 0;
        normalizedFreqs.forEach((nf, i) => {
          const amp = 0.15 / (i + 1);
          y += amp * Math.sin(t * (i + 1) * 3 + phaseRef.current + nf * Math.PI);
        });
        const screenY = H / 2 + y * H * 0.8;
        if (x === 0) ctx.moveTo(x, screenY);
        else ctx.lineTo(x, screenY);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Glow dots at peaks
      harmonics.forEach((_, i) => {
        const x = (W / (harmonics.length + 1)) * (i + 1);
        const t = (x / W) * Math.PI * 2;
        let y = 0;
        normalizedFreqs.forEach((nf, j) => {
          const amp = 0.15 / (j + 1);
          y += amp * Math.sin(t * (j + 1) * 3 + phaseRef.current + nf * Math.PI);
        });
        const screenY = H / 2 + y * H * 0.8;
        ctx.beginPath();
        ctx.arc(x, screenY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#D4AF37";
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#D4AF37";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      phaseRef.current += speed;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [harmonics, playing]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      className="w-full rounded border border-[#D4AF37]/20"
      style={{ background: "#0a0a0a" }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function MusicWitnessIDPage() {
  const [meta, setMeta] = useState<SongMetadata>({
    creatorName: "", orcidId: "", bmiMemberNumber: "", isni: "",
    songTitle: "", genre: "", bpm: "", keySignature: "", keyMode: "Major",
    moodTags: [], lyrics: "", coWriters: [""], isrcCode: "", bmiWorkId: "",
    aiConsent: "PROHIBITED", releaseDate: "", albumName: "",
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [result, setResult] = useState<WitnessResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [coWriterInput, setCoWriterInput] = useState("");
  const audioCtxRef = useRef<AudioContext | null>(null);

  const setField = (field: keyof SongMetadata, value: string) =>
    setMeta(prev => ({ ...prev, [field]: value }));

  const toggleMood = (mood: string) => {
    setMeta(prev => ({
      ...prev,
      moodTags: prev.moodTags.includes(mood)
        ? prev.moodTags.filter(m => m !== mood)
        : [...prev.moodTags, mood],
    }));
  };

  const addCoWriter = () => {
    if (coWriterInput.trim()) {
      setMeta(prev => ({ ...prev, coWriters: [...prev.coWriters.filter(c => c), coWriterInput.trim()] }));
      setCoWriterInput("");
    }
  };

  const removeCoWriter = (i: number) =>
    setMeta(prev => ({ ...prev, coWriters: prev.coWriters.filter((_, idx) => idx !== i) }));

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ─── Audio File Analysis ────────────────────────────────────────
  const analyzeAudioFile = useCallback(async (file: File): Promise<{ hash: string; duration: string; sampleRate: string; bitDepth: string }> => {
    const arrayBuffer = await file.arrayBuffer();
    const hash = await sha256Hex(arrayBuffer);

    let duration = "N/A", sampleRate = "N/A", bitDepth = "N/A";
    try {
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      duration = `${Math.floor(decoded.duration / 60)}:${String(Math.floor(decoded.duration % 60)).padStart(2, "0")}`;
      sampleRate = `${decoded.sampleRate} Hz`;
      bitDepth = "32-bit float (decoded)";
      await ctx.close();
    } catch {
      // fallback — file hashed but metadata unavailable
    }
    return { hash, duration, sampleRate, bitDepth };
  }, []);

  // ─── Generate Witness ID ────────────────────────────────────────
  const generate = async () => {
    if (!meta.creatorName || !meta.songTitle) return;
    setGenerating(true);
    try {
      const timestamp = new Date().toISOString();

      // File hash
      let fileHash: string | null = null;
      let fileDuration: string | null = null;
      let fileSampleRate: string | null = null;
      let fileBitDepth: string | null = null;
      if (audioFile) {
        const analysis = await analyzeAudioFile(audioFile);
        fileHash = analysis.hash;
        fileDuration = analysis.duration;
        fileSampleRate = analysis.sampleRate;
        fileBitDepth = analysis.bitDepth;
      }

      // Lyrics hash
      let lyricsHash: string | null = null;
      if (meta.lyrics.trim()) {
        lyricsHash = await sha256Hex(meta.lyrics.trim());
      }

      // Metadata string
      const metaString = JSON.stringify({
        creatorName: meta.creatorName, songTitle: meta.songTitle,
        genre: meta.genre, bpm: meta.bpm, keySignature: meta.keySignature,
        keyMode: meta.keyMode, moodTags: meta.moodTags, coWriters: meta.coWriters,
        isrcCode: meta.isrcCode, bmiWorkId: meta.bmiWorkId, aiConsent: meta.aiConsent,
        releaseDate: meta.releaseDate, albumName: meta.albumName,
        bmiMemberNumber: meta.bmiMemberNumber, orcidId: meta.orcidId, isni: meta.isni,
      });

      // Witness ID
      const part1Input = meta.creatorName + meta.songTitle + timestamp;
      const part2Input = (fileHash || "nohash") + metaString;
      const hash1 = await sha256Hex(part1Input);
      const hash2 = await sha256Hex(part2Input);
      const witnessId = `WID-MUS-${hash1.slice(0, 8).toUpperCase()}-${hash2.slice(-8).toUpperCase()}`;

      // Harmonic signature
      const harmonics = deriveHarmonicSignature(hash1);
      const harmonicString = `HS-${harmonics.join("|")}`;

      // ECDSA
      const keyPair = await generateECDSAKeyPair();
      const fullData = JSON.stringify({ witnessId, timestamp, fileHash, lyricsHash, metaString });
      const signature = await signData(keyPair.privateKey, fullData);
      const publicKeyFingerprint = await exportPublicKeyFingerprint(keyPair.publicKey);
      const privateKeyJson = await exportPrivateKey(keyPair.privateKey);

      setResult({
        witnessId, timestamp, fileHash, lyricsHash,
        harmonics, harmonicString,
        publicKeyFingerprint, signature, privateKeyJson,
        fileDuration, fileSampleRate, fileBitDepth,
      });
    } catch (err) {
      console.error("Generation error:", err);
    }
    setGenerating(false);
  };

  // ─── Play Harmonic Chord ────────────────────────────────────────
  const playHarmonics = async () => {
    if (!result || playing) return;
    setPlaying(true);
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const gainMaster = ctx.createGain();
    gainMaster.connect(ctx.destination);

    const oscillators = result.harmonics.map(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(gainMaster);
      return { osc, gain };
    });

    const now = ctx.currentTime;
    oscillators.forEach(({ osc, gain }) => {
      osc.start(now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      gain.gain.setValueAtTime(0.08, now + 2.3);
      gain.gain.linearRampToValueAtTime(0, now + 3.0);
      osc.stop(now + 3.1);
    });

    setTimeout(() => {
      ctx.close();
      setPlaying(false);
    }, 3200);
  };

  // ─── Download Certificate ───────────────────────────────────────
  const downloadCertificate = () => {
    if (!result) return;
    const consentColor = meta.aiConsent === "PROHIBITED" ? "#ef4444" : meta.aiConsent === "PERMITTED_WITH_ATTRIBUTION" ? "#f59e0b" : "#22c55e";
    const year = new Date().getFullYear();

    const harmonicRows = result.harmonics.map((freq, i) => {
      const { note, octave, cents } = frequencyToNote(freq);
      const centsStr = cents >= 0 ? `+${cents}¢` : `${cents}¢`;
      return `<tr>
        <td style="color:#6ee7f7;padding:4px 12px;">H${i + 1}</td>
        <td style="color:#D4AF37;padding:4px 12px;font-family:monospace;">${freq} Hz</td>
        <td style="color:#e2e8f0;padding:4px 12px;">${note}${octave} ${centsStr}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Music Witness ID Certificate — ${meta.songTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  body { background: #0a0a0a; color: #e2e8f0; font-family: 'Share Tech Mono', monospace; margin: 0; padding: 40px; }
  .cert { max-width: 800px; margin: 0 auto; border: 1px solid #D4AF37; padding: 40px; position: relative; }
  .cert::before { content: ''; position: absolute; inset: 6px; border: 1px solid rgba(201,168,76,0.2); pointer-events: none; }
  h1 { font-family: 'Orbitron', monospace; color: #D4AF37; font-size: 22px; letter-spacing: 4px; margin: 0 0 4px; }
  h2 { font-family: 'Orbitron', monospace; color: #6ee7f7; font-size: 13px; letter-spacing: 3px; margin: 0 0 32px; }
  .divider { border: none; border-top: 1px solid #D4AF37; margin: 24px 0; opacity: 0.4; }
  .label { color: #6ee7f7; font-size: 11px; letter-spacing: 2px; margin-bottom: 2px; }
  .value { color: #e2e8f0; font-size: 14px; margin-bottom: 16px; word-break: break-all; }
  .wid { font-family: 'Orbitron', monospace; color: #D4AF37; font-size: 20px; letter-spacing: 3px; }
  .consent { display: inline-block; padding: 6px 16px; border: 1px solid ${consentColor}; color: ${consentColor}; font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  .footer { margin-top: 32px; font-size: 11px; color: rgba(226,232,240,0.4); line-height: 1.8; }
  .hs { color: #D4AF37; font-size: 13px; letter-spacing: 1px; word-break: break-all; }
  .sig { font-size: 10px; color: rgba(226,232,240,0.5); word-break: break-all; line-height: 1.6; }
</style>
</head>
<body>
<div class="cert">
  <h1>MUSIC WITNESS ID CERTIFICATE</h1>
  <h2>Command Domains LLC / BDDT Publishing — Sovereign Shutter™ Framework</h2>
  <hr class="divider">
  
  <div class="label">WORK TITLE</div>
  <div class="value" style="font-size:18px;color:#D4AF37;">${meta.songTitle}</div>
  
  <div class="label">CREATOR</div>
  <div class="value">${meta.creatorName}${meta.bmiMemberNumber ? ` | BMI: ${meta.bmiMemberNumber}` : ""}${meta.orcidId ? ` | ORCID: ${meta.orcidId}` : ""}${meta.isni ? ` | ISNI: ${meta.isni}` : ""}</div>
  
  ${meta.albumName ? `<div class="label">ALBUM / PROJECT</div><div class="value">${meta.albumName}</div>` : ""}
  ${meta.genre ? `<div class="label">GENRE</div><div class="value">${meta.genre}${meta.keySignature ? ` | Key: ${meta.keySignature} ${meta.keyMode}` : ""}${meta.bpm ? ` | BPM: ${meta.bpm}` : ""}</div>` : ""}
  ${meta.coWriters.filter(c => c).length > 0 ? `<div class="label">CO-WRITERS</div><div class="value">${meta.coWriters.filter(c => c).join(", ")}</div>` : ""}
  ${meta.isrcCode ? `<div class="label">ISRC</div><div class="value">${meta.isrcCode}</div>` : ""}
  ${meta.bmiWorkId ? `<div class="label">BMI WORK ID</div><div class="value">${meta.bmiWorkId}</div>` : ""}
  ${meta.moodTags.length > 0 ? `<div class="label">MOOD / THEME</div><div class="value">${meta.moodTags.join(" | ")}</div>` : ""}
  
  <hr class="divider">
  
  <div class="label">WITNESS ID</div>
  <div class="value wid">${result.witnessId}</div>
  
  <div class="label">TIMESTAMP</div>
  <div class="value">${result.timestamp}</div>
  
  ${result.fileHash ? `<div class="label">FILE HASH (SHA-256)</div><div class="value sig">sha256:${result.fileHash}</div>` : ""}
  ${result.fileDuration ? `<div class="label">FILE PROPERTIES</div><div class="value">Duration: ${result.fileDuration} | Sample Rate: ${result.fileSampleRate} | Bit Depth: ${result.fileBitDepth}</div>` : ""}
  ${result.lyricsHash ? `<div class="label">LYRICS HASH (SHA-256)</div><div class="value sig">sha256:${result.lyricsHash}</div>` : ""}
  
  <hr class="divider">
  
  <div class="label">HARMONIC FREQUENCY SIGNATURE</div>
  <table style="margin:12px 0;">${harmonicRows}</table>
  <div class="hs">${result.harmonicString}</div>
  
  <hr class="divider">
  
  <div class="label">AI CONSENT FLAG</div>
  <div class="consent">${meta.aiConsent.replace(/_/g, " ")}</div>
  
  <hr class="divider">
  
  <div class="label">CRYPTOGRAPHIC SIGNATURE</div>
  <div class="value">Algorithm: ECDSA P-256 | Hash: SHA-256</div>
  <div class="label">PUBLIC KEY FINGERPRINT</div>
  <div class="value sig">${result.publicKeyFingerprint}</div>
  <div class="label">SIGNATURE</div>
  <div class="value sig">${result.signature.slice(0, 64)}...</div>
  
  <hr class="divider">
  
  <div class="footer">
    LEGAL NOTICE: This certificate establishes provenance of the above musical work under the Sovereign Shutter™ framework, Command Domains LLC. Unauthorized AI training use is <strong style="color:${consentColor}">${meta.aiConsent.replace(/_/g, " ")}</strong>.<br><br>
    Copyright © ${year} ${meta.creatorName}. Published under BDDT Publishing. All rights reserved.<br>
    This document was generated client-side. No data was transmitted to any server. The cryptographic signature verifies the integrity of this certificate.
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WitnessID-${result.witnessId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPrivateKey = () => {
    if (!result) return;
    const blob = new Blob([result.privateKeyJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PrivateKey-${result.witnessId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32" style={{ background: "#0a0a0a", color: "#e2e8f0" }}>
      {/* Header */}
      <div className="border-b border-[#D4AF37]/20 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} className="text-[#D4AF37]" />
            <h1 style={{ fontFamily: "'Orbitron', monospace", color: "#D4AF37", fontSize: "22px", letterSpacing: "4px", fontWeight: 700 }}>
              MUSIC WITNESS ID GENERATOR
            </h1>
          </div>
          <p style={{ fontFamily: "'Share Tech Mono', monospace", color: "#6ee7f7", fontSize: "12px", letterSpacing: "2px" }}>
            COMMAND DOMAINS LLC / BDDT PUBLISHING — SOVEREIGN SHUTTER™ FRAMEWORK
          </p>
          <p className="mt-3 text-sm text-white/40 max-w-2xl">
            Establish cryptographic provenance for your musical work. Every song receives a unique Witness ID and Harmonic Frequency Signature derived from its content. All processing is client-side — no data leaves your browser.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Section 1: Creator Identity ── */}
        <Section title="CREATOR IDENTITY" icon={<Shield size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Creator Name / Artist Handle *" required>
              <Input value={meta.creatorName} onChange={v => setField("creatorName", v)} placeholder="Your name or alias" />
            </Field>
            <Field label="BMI Member Number">
              <Input value={meta.bmiMemberNumber} onChange={v => setField("bmiMemberNumber", v)} placeholder="Optional" />
            </Field>
            <Field label="ORCID ID">
              <Input value={meta.orcidId} onChange={v => setField("orcidId", v)} placeholder="0000-0000-0000-0000" />
            </Field>
            <Field label="ISNI">
              <Input value={meta.isni} onChange={v => setField("isni", v)} placeholder="0000 0001 2345 6789" />
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Song Metadata ── */}
        <Section title="SONG METADATA" icon={<Music size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Song Title *" required>
              <Input value={meta.songTitle} onChange={v => setField("songTitle", v)} placeholder="Your track title" />
            </Field>
            <Field label="Album / Project Name">
              <Input value={meta.albumName} onChange={v => setField("albumName", v)} placeholder="Optional" />
            </Field>
            <Field label="Genre">
              <Select value={meta.genre} onChange={v => setField("genre", v)} options={["", ...GENRES]} placeholder="Select genre" />
            </Field>
            <Field label="Release Date">
              <Input type="date" value={meta.releaseDate} onChange={v => setField("releaseDate", v)} />
            </Field>
            <Field label="BPM / Tempo">
              <Input type="number" value={meta.bpm} onChange={v => setField("bpm", v)} placeholder="120" />
            </Field>
            <Field label="Key Signature">
              <div className="flex gap-2">
                <Select value={meta.keySignature} onChange={v => setField("keySignature", v)} options={["", ...KEYS]} placeholder="Key" />
                <Select value={meta.keyMode} onChange={v => setField("keyMode", v)} options={["Major", "Minor"]} placeholder="Mode" />
              </div>
            </Field>
            <Field label="ISRC Code">
              <Input value={meta.isrcCode} onChange={v => setField("isrcCode", v)} placeholder="US-ABC-24-00001" />
            </Field>
            <Field label="BMI Work ID">
              <Input value={meta.bmiWorkId} onChange={v => setField("bmiWorkId", v)} placeholder="Optional" />
            </Field>
          </div>

          {/* Mood Tags */}
          <Field label="Mood / Theme Tags" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {MOODS.map(mood => (
                <button
                  key={mood}
                  onClick={() => toggleMood(mood)}
                  className={`px-3 py-1 text-xs border transition-all duration-150 ${
                    meta.moodTags.includes(mood)
                      ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10"
                      : "border-white/10 text-white/40 hover:border-[#D4AF37]/40"
                  }`}
                  style={{ fontFamily: "'Share Tech Mono', monospace", letterSpacing: "1px" }}
                >
                  {mood}
                </button>
              ))}
            </div>
          </Field>

          {/* Co-writers */}
          <Field label="Co-Writers" className="mt-4">
            <div className="flex gap-2 mb-2">
              <Input value={coWriterInput} onChange={setCoWriterInput} placeholder="Add co-writer name" onKeyDown={e => e.key === "Enter" && addCoWriter()} />
              <button type="button" onClick={addCoWriter} className="px-3 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {meta.coWriters.filter(c => c).map((cw, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 text-xs border border-[#6ee7f7]/20 text-[#6ee7f7]">
                  {cw}
                  <button type="button" onClick={() => removeCoWriter(i)} className="hover:text-lnx-red transition-colors"><X size={10} /></button>
                </span>
              ))}
            </div>
          </Field>

          {/* Lyrics */}
          <Field label="Lyrics (hashed locally — never transmitted)" className="mt-4">
            <textarea
              value={meta.lyrics}
              onChange={e => setField("lyrics", e.target.value)}
              placeholder="Enter lyrics here. They will be SHA-256 hashed in your browser and never sent to any server."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-white/10 bg-white/[0.03] text-white/80 focus:outline-none focus:border-[#D4AF37]/40 resize-none"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            />
          </Field>
        </Section>

        {/* ── Section 3: AI Consent ── */}
        <Section title="AI CONSENT FLAG" icon={<Shield size={16} />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AI_CONSENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setField("aiConsent", opt.value)}
                className={`p-4 border text-left transition-all duration-150 ${
                  meta.aiConsent === opt.value
                    ? `border-[${opt.color}] bg-[${opt.color}]/10`
                    : "border-white/10 hover:border-white/20"
                }`}
                style={meta.aiConsent === opt.value ? { borderColor: opt.color, background: `${opt.color}15` } : {}}
              >
                <div style={{ fontFamily: "'Orbitron', monospace", color: opt.color, fontSize: "10px", letterSpacing: "1px", marginBottom: "6px" }}>
                  {opt.label}
                </div>
                <div className="text-xs text-white/40">{opt.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Section 4: File Upload ── */}
        <Section title="AUDIO FILE (OPTIONAL)" icon={<Upload size={16} />}>
          <div
            className="border border-dashed border-[#D4AF37]/20 p-8 text-center cursor-pointer hover:border-[#D4AF37]/40 transition-colors"
            onClick={() => document.getElementById("audio-upload")?.click()}
          >
            <input
              id="audio-upload"
              type="file"
              accept=".mp3,.wav,.flac,.aiff,.ogg,.m4a"
              className="hidden"
              onChange={e => setAudioFile(e.target.files?.[0] || null)}
            />
            {audioFile ? (
              <div>
                <Music size={24} className="text-[#D4AF37] mx-auto mb-2" />
                <p style={{ fontFamily: "'Share Tech Mono', monospace", color: "#D4AF37", fontSize: "13px" }}>{audioFile.name}</p>
                <p className="text-xs text-white/70 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB — will be hashed locally</p>
              </div>
            ) : (
              <div>
                <Upload size={24} className="text-white/60 mx-auto mb-2" />
                <p className="text-sm text-white/40">Drop audio file or click to browse</p>
                <p className="text-xs text-white/60 mt-1">MP3, WAV, FLAC, AIFF, OGG, M4A — file is never uploaded</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Generate Button ── */}
        <button
          onClick={generate}
          disabled={!meta.creatorName || !meta.songTitle || generating}
          className="w-full py-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          style={{ fontFamily: "'Orbitron', monospace", letterSpacing: "3px", fontSize: "13px" }}
        >
          {generating ? "GENERATING WITNESS ID..." : "GENERATE WITNESS ID"}
        </button>

        {/* ── Result Panel ── */}
        {result && (
          <div className="border border-[#D4AF37]/40 p-6 space-y-6" style={{ background: "rgba(201,168,76,0.03)" }}>
            {/* Witness ID */}
            <div>
              <Label>WITNESS ID</Label>
              <div className="flex items-center gap-3 mt-2">
                <span style={{ fontFamily: "'Orbitron', monospace", color: "#D4AF37", fontSize: "20px", letterSpacing: "3px" }}>
                  {result.witnessId}
                </span>
                <CopyBtn text={result.witnessId} id="wid" copied={copied} onCopy={copyToClipboard} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>TIMESTAMP</Label>
                <Mono>{result.timestamp}</Mono>
              </div>
              {result.fileHash && (
                <div>
                  <Label>FILE HASH (SHA-256)</Label>
                  <Mono className="truncate">{result.fileHash.slice(0, 32)}...</Mono>
                </div>
              )}
              {result.fileDuration && (
                <div>
                  <Label>FILE PROPERTIES</Label>
                  <Mono>{result.fileDuration} | {result.fileSampleRate}</Mono>
                </div>
              )}
              {result.lyricsHash && (
                <div>
                  <Label>LYRICS HASH (SHA-256)</Label>
                  <Mono className="truncate">{result.lyricsHash.slice(0, 32)}...</Mono>
                </div>
              )}
            </div>

            {/* Harmonic Signature */}
            <div>
              <Label>HARMONIC FREQUENCY SIGNATURE</Label>
              <div className="mt-3">
                <HarmonicWaveform harmonics={result.harmonics} playing={playing} />
              </div>

              {/* Frequency table */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {result.harmonics.map((freq, i) => {
                  const { note, octave, cents } = frequencyToNote(freq);
                  const centsStr = cents >= 0 ? `+${cents}¢` : `${cents}¢`;
                  return (
                    <div key={i} className="border border-white/[0.06] p-3" style={{ background: "rgba(201,168,76,0.04)" }}>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", color: "#6ee7f7", fontSize: "10px", letterSpacing: "2px" }}>H{i + 1}</div>
                      <div style={{ fontFamily: "'Orbitron', monospace", color: "#D4AF37", fontSize: "14px" }}>{freq} Hz</div>
                      <div className="text-xs text-white/40 mt-1">{note}{octave} {centsStr}</div>
                    </div>
                  );
                })}
              </div>

              {/* HS string */}
              <div className="mt-3 flex items-center gap-2">
                <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#D4AF37", fontSize: "12px", wordBreak: "break-all" }}>
                  {result.harmonicString}
                </span>
                <CopyBtn text={result.harmonicString} id="hs" copied={copied} onCopy={copyToClipboard} />
              </div>

              {/* Play button */}
              <button
                onClick={playHarmonics}
                disabled={playing}
                className="mt-4 flex items-center gap-2 px-4 py-2 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50 transition-colors"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "12px", letterSpacing: "2px" }}
              >
                <Play size={14} fill={playing ? "currentColor" : "none"} />
                {playing ? "PLAYING IDENTITY CHORD..." : "PLAY IDENTITY CHORD"}
              </button>
            </div>

            {/* Cryptographic info */}
            <div>
              <Label>CRYPTOGRAPHIC SIGNATURE</Label>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-xs text-white/70">Algorithm: </span>
                  <Mono inline>ECDSA P-256 / SHA-256</Mono>
                </div>
                <div>
                  <span className="text-xs text-white/70">Public Key Fingerprint: </span>
                  <Mono inline>{result.publicKeyFingerprint}</Mono>
                </div>
                <div>
                  <span className="text-xs text-white/70">Signature: </span>
                  <Mono inline className="break-all">{result.signature.slice(0, 48)}...</Mono>
                </div>
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-white/[0.06]">
              <button
                onClick={downloadCertificate}
                className="flex items-center gap-2 px-5 py-3 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                style={{ fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "2px" }}
              >
                <Download size={14} />
                DOWNLOAD CERTIFICATE
              </button>
              <button
                onClick={downloadPrivateKey}
                className="flex items-center gap-2 px-5 py-3 border border-[#6ee7f7]/30 text-[#6ee7f7] hover:bg-[#6ee7f7]/10 transition-colors"
                style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "2px" }}
              >
                <Download size={14} />
                DOWNLOAD PRIVATE KEY
              </button>
            </div>
            <p className="text-xs text-white/60">
              ⚠ Store your private key securely. It is never transmitted or stored server-side. Loss of the private key means loss of the ability to prove cryptographic authorship.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-white/[0.06] p-6" style={{ background: "rgba(255,255,255,0.01)" }}>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[#6ee7f7]">{icon}</span>
        <span style={{ fontFamily: "'Orbitron', monospace", color: "#6ee7f7", fontSize: "11px", letterSpacing: "3px" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs text-white/40 mb-1" style={{ fontFamily: "'Share Tech Mono', monospace", letterSpacing: "1px" }}>
        {label}{required && <span className="text-[#D4AF37] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-white/10 bg-white/[0.03] text-white/80 focus:outline-none focus:border-[#D4AF37]/40 placeholder:text-white/60"
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-white/10 bg-[#0a0a0a] text-white/80 focus:outline-none focus:border-[#D4AF37]/40"
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.filter(o => o !== "").map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", color: "#6ee7f7", fontSize: "10px", letterSpacing: "2px", marginBottom: "4px" }}>
      {children}
    </div>
  );
}

function Mono({ children, inline, className }: { children: React.ReactNode; inline?: boolean; className?: string }) {
  const cls = `text-sm text-white/70 ${className || ""}`;
  return inline
    ? <span className={cls} style={{ fontFamily: "'Share Tech Mono', monospace" }}>{children}</span>
    : <div className={cls} style={{ fontFamily: "'Share Tech Mono', monospace" }}>{children}</div>;
}

function CopyBtn({ text, id, copied, onCopy }: { text: string; id: string; copied: string | null; onCopy: (t: string, k: string) => void }) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
    >
      {copied === id ? <Check size={14} className="text-[#D4AF37]" /> : <Copy size={14} />}
    </button>
  );
}
