/*
═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Provenance Upload Engine
   Unified upload workspace. One system. Every medium.
   LNLS v1.0 — Every upload carries testimony.
═══════════════════════════════════════════════════════════════════ */

import React, {
  useState, useCallback, useRef, useEffect, useReducer
} from "react";
import { useLocation } from "wouter";
import {
  X, Upload, Music, Image as ImageIcon, Video, FileText, Code,
  Archive, Cpu, Sparkles, CheckCircle, AlertCircle, Play, Pause,
  ChevronDown, ChevronUp, ArrowRight, FolderOpen, Hash,
  Layers, RotateCcw, Eye, Maximize2,
} from "lucide-react";
import {
  extractFileMetadata,
  type UploadMetadataV2,
  type AIMetadata,
} from "@/lib/uploadPipeline";
import { useUploadEngine } from "@/contexts/UploadEngineContext";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkStage = "queued" | "reading" | "hashing" | "extracting" | "assembling" | "ready" | "error";

interface WorkObject {
  id: string;
  file: File;
  stage: WorkStage;
  meta: UploadMetadataV2 | null;
  previewUrl: string | null;
  audioUrl: string | null;
  isPlaying: boolean;
  isExpanded: boolean;
  groupId: string | null; // for album/project grouping
  logs: string[];
  error: string | null;
}

interface Group {
  id: string;
  name: string;
  workIds: string[];
  isExpanded: boolean;
  type: "album" | "project" | "batch";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileId(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCategory(file: File): { label: string; icon: React.ElementType; color: string; type: string } {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","tiff","heic","raw","cr2","nef","arw","psd","svg"].includes(ext))
    return { label: "Image", icon: ImageIcon, color: "#A78BFA", type: "image" };
  if (mime.startsWith("audio/") || ["mp3","flac","wav","ogg","aac","m4a","opus","aiff","wma"].includes(ext))
    return { label: "Music", icon: Music, color: "#34D399", type: "music" };
  if (mime.startsWith("video/") || ["mp4","mov","webm","mkv","avi","mxf"].includes(ext))
    return { label: "Video", icon: Video, color: "#F87171", type: "video" };
  if (["glb","gltf","obj","fbx","stl","blend"].includes(ext))
    return { label: "3D Asset", icon: Cpu, color: "#60A5FA", type: "3d" };
  if (["js","ts","py","rs","go","cpp","c","java","swift","kt","rb","php","sh","json","yaml","toml"].includes(ext))
    return { label: "Code", icon: Code, color: "#FBBF24", type: "code" };
  if (["zip","tar","gz","7z","rar"].includes(ext))
    return { label: "Archive", icon: Archive, color: "#94A3B8", type: "archive" };
  return { label: "Document", icon: FileText, color: "#D4AF37", type: "document" };
}

const AI_LABELS: Record<string, string> = {
  suno: "Suno", udio: "Udio", midjourney: "Midjourney",
  stable_diffusion: "Stable Diffusion", flux: "Flux", chatgpt: "ChatGPT",
  claude: "Claude", gemini: "Gemini", runway: "Runway",
  elevenlabs: "ElevenLabs", firefly: "Adobe Firefly", leonardo: "Leonardo AI",
};

// ─── Waveform static preview (from ArrayBuffer) ───────────────────────────────

function drawStaticWaveform(canvas: HTMLCanvasElement, buffer: ArrayBuffer) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Decode a small slice for the preview waveform
  const data = new Float32Array(buffer.slice(0, Math.min(buffer.byteLength, 200000)));
  const step = Math.ceil(data.length / width);
  const mid = height / 2;
  const amp = height * 0.42;

  ctx.beginPath();
  ctx.strokeStyle = "rgba(52, 211, 153, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(52, 211, 153, 0.4)";
  ctx.shadowBlur = 4;

  for (let x = 0; x < width; x++) {
    let max = 0;
    for (let i = 0; i < step; i++) {
      const idx = x * step + i;
      if (idx < data.length) max = Math.max(max, Math.abs(data[idx]));
    }
    const y = mid - max * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Mirror
  ctx.beginPath();
  ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
  for (let x = 0; x < width; x++) {
    let max = 0;
    for (let i = 0; i < step; i++) {
      const idx = x * step + i;
      if (idx < data.length) max = Math.max(max, Math.abs(data[idx]));
    }
    const y = mid + max * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ─── Work Object Card ─────────────────────────────────────────────────────────

function WorkCard({
  work,
  onToggleExpand,
  onTogglePlay,
  onRemove,
  onRegister,
}: {
  work: WorkObject;
  onToggleExpand: (id: string) => void;
  onTogglePlay: (id: string) => void;
  onRemove: (id: string) => void;
  onRegister: (work: WorkObject) => void;
}) {
  const cat = getCategory(work.file);
  const Icon = cat.icon;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isReady = work.stage === "ready";
  const isProcessing = !["queued", "ready", "error"].includes(work.stage);
  const { meta } = work;

  // Draw static waveform for audio
  useEffect(() => {
    if (cat.type !== "music" || !canvasRef.current || !work.audioUrl) return;
    // We draw a placeholder waveform using the audio duration
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    // Draw a stylized placeholder waveform
    ctx.beginPath();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(52, 211, 153, 0.3)";
    ctx.shadowBlur = 3;
    const mid = height / 2;
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const amp = Math.sin(t * Math.PI * 12) * Math.sin(t * Math.PI) * (height * 0.38);
      if (x === 0) ctx.moveTo(x, mid + amp);
      else ctx.lineTo(x, mid + amp);
    }
    ctx.stroke();
  }, [work.audioUrl, cat.type]);

  // Sync audio play state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !work.audioUrl) return;
    if (work.isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [work.isPlaying, work.audioUrl]);

  const stageLabel: Record<WorkStage, string> = {
    queued: "Queued",
    reading: "Reading…",
    hashing: "Hashing…",
    extracting: "Extracting metadata…",
    assembling: "Assembling provenance…",
    ready: "Ready",
    error: "Error",
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${isReady ? cat.color + "44" : "rgba(255,255,255,0.08)"}`,
        transform: work.isExpanded ? "scale(1.01)" : "scale(1)",
        boxShadow: work.isExpanded ? `0 8px 32px ${cat.color}18` : "none",
      }}
    >
      {/* ── Card Header ── */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Preview / Icon */}
        <div className="relative flex-shrink-0">
          {work.previewUrl ? (
            <img
              src={work.previewUrl}
              alt=""
              className="w-12 h-12 rounded-xl object-cover"
              style={{ border: `1px solid ${cat.color}33` }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: cat.color + "15", border: `1px solid ${cat.color}33` }}
            >
              <Icon size={20} style={{ color: cat.color }} />
            </div>
          )}
          {/* Play button overlay for audio */}
          {cat.type === "music" && work.audioUrl && (
            <button
              onClick={() => onTogglePlay(work.id)}
              className="absolute inset-0 flex items-center justify-center rounded-xl transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)", opacity: 0 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
            >
              {work.isPlaying
                ? <Pause size={16} style={{ color: "#34D399" }} />
                : <Play size={16} style={{ color: "#34D399" }} />
              }
            </button>
          )}
        </div>

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium" style={{ fontSize: 13, color: "#E8DCC8" }}>
            {meta?.music?.title ?? meta?.image?.iptcTitle ?? work.file.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: cat.color + "18", color: cat.color }}>
              {cat.label}
            </span>
            {meta?.music?.artist && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.40)" }}>{meta.music.artist}</span>
            )}
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
              {formatBytes(work.file.size)}
            </span>
            {meta?.ai.detected && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "#F59E0B18", color: "#F59E0B" }}>
                <Sparkles size={8} /> {AI_LABELS[meta.ai.platform ?? ""] ?? meta.ai.platform ?? "AI"}
              </span>
            )}
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-[#D4AF37] border-t-transparent animate-spin" />
              <span style={{ fontSize: 10, color: "#D4AF37", fontFamily: "monospace" }}>{stageLabel[work.stage]}</span>
            </div>
          )}
          {work.stage === "error" && <AlertCircle size={14} style={{ color: "#EF4444" }} />}
          {isReady && <CheckCircle size={14} style={{ color: "#34D399" }} />}
          <button onClick={() => onToggleExpand(work.id)} className="p-1 hover:bg-white/5 rounded transition-colors">
            {work.isExpanded
              ? <ChevronUp size={14} style={{ color: "rgba(255,255,255,0.40)" }} />
              : <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.40)" }} />
            }
          </button>
          <button onClick={() => onRemove(work.id)} className="p-1 hover:bg-white/5 rounded transition-colors">
            <X size={13} style={{ color: "rgba(255,100,100,0.50)" }} />
          </button>
        </div>
      </div>

      {/* ── Waveform strip for audio (always visible when ready) ── */}
      {cat.type === "music" && isReady && (
        <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={40}
            className="w-full"
            style={{ height: 40 }}
          />
          {work.audioUrl && (
            <audio ref={audioRef} src={work.audioUrl} preload="none" onEnded={() => onTogglePlay(work.id)} />
          )}
        </div>
      )}

      {/* ── Video preview strip ── */}
      {cat.type === "video" && isReady && work.audioUrl && (
        <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <video
            src={work.audioUrl}
            className="w-full rounded-lg"
            style={{ maxHeight: 120, objectFit: "cover" }}
            controls={false}
            muted
            autoPlay={false}
          />
        </div>
      )}

      {/* ── Expanded: Provenance Object ── */}
      {work.isExpanded && isReady && meta && (
        <div className="px-4 py-4">
          {/* AI Detection */}
          {meta.ai.detected && (
            <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.20)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} style={{ color: "#D4AF37" }} />
                <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", color: "#D4AF37", letterSpacing: "0.08em" }}>AI PARTICIPATION DETECTED</span>
                <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontFamily: "monospace", background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
                  {meta.ai.platform ? "HIGH" : "MEDIUM"} CONFIDENCE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {meta.ai.platform && (
                  <div><div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace" }}>PLATFORM</div>
                  <div style={{ fontSize: 12, color: "#E8DCC8", fontWeight: 600 }}>{AI_LABELS[meta.ai.platform] ?? meta.ai.platform}</div></div>
                )}
                {meta.ai.model && (
                  <div><div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace" }}>MODEL</div>
                  <div style={{ fontSize: 12, color: "#E8DCC8", fontWeight: 600 }}>{meta.ai.model}</div></div>
                )}
              </div>
              {meta.ai.prompt && (
                <div className="rounded-lg p-2 mb-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,175,55,0.12)" }}>
                  <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 2 }}>PROMPT</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontStyle: "italic", lineHeight: 1.5 }}>"{meta.ai.prompt}"</div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>Confirm participation?</span>
                <button className="px-2 py-0.5 rounded text-[11px] font-mono" style={{ background: "rgba(212,175,55,0.20)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.25)" }}>✓ Confirmed</button>
                <button className="px-2 py-0.5 rounded text-[11px] font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>Edit</button>
              </div>
            </div>
          )}

          {/* Provenance Object summary */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,175,55,0.15)" }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(212,175,55,0.06)", borderBottom: "1px solid rgba(212,175,55,0.10)" }}>
              <Layers size={11} style={{ color: "#D4AF37" }} />
              <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", color: "#D4AF37", letterSpacing: "0.08em" }}>PROVENANCE OBJECT</span>
              <span className="ml-auto" style={{ fontSize: 9, fontFamily: "monospace", color: "#4B5563" }}>PO-{meta.fileHash.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { label: "Title", value: meta.music?.title ?? meta.image?.iptcTitle ?? work.file.name },
                { label: "Artist", value: meta.music?.artist },
                { label: "Genre", value: meta.music?.genre },
                { label: "BPM", value: meta.music?.bpm?.toString() },
                { label: "Key", value: meta.music?.key },
                { label: "ISRC", value: meta.music?.isrc },
                { label: "Camera", value: meta.image?.cameraModel },
                { label: "SHA-256", value: meta.fileHash.slice(0, 16) + "…" },
                { label: "AI", value: meta.ai.detected ? (AI_LABELS[meta.ai.platform ?? ""] ?? meta.ai.platform ?? "Detected") : "None" },
                { label: "Creator", value: meta.provenance.embeddedAttribution.creator },
                { label: "Copyright", value: meta.provenance.embeddedAttribution.copyright },
                { label: "Publisher", value: meta.provenance.embeddedAttribution.publisher },
              ].filter(r => r.value).map((row, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span style={{ fontSize: 9, color: "#4B5563", fontFamily: "monospace", minWidth: 56, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.60)", fontFamily: "monospace", wordBreak: "break-all" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Register this work */}
          <button
            onClick={() => onRegister(work)}
            className="w-full mt-3 py-2 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#000", fontFamily: "'Cinzel', serif", letterSpacing: "0.10em", fontSize: 11 }}
          >
            REGISTER THIS WORK <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Error state */}
      {work.stage === "error" && work.error && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(239,68,68,0.20)" }}>
          <div style={{ fontSize: 11, color: "#EF4444" }}>{work.error}</div>
        </div>
      )}
    </div>
  );
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ group, onToggle }: { group: Group; onToggle: (id: string) => void }) {
  const typeColors: Record<Group["type"], string> = {
    album: "#34D399",
    project: "#60A5FA",
    batch: "#D4AF37",
  };
  const color = typeColors[group.type];
  return (
    <button
      onClick={() => onToggle(group.id)}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors hover:bg-white/[0.02]"
      style={{ border: `1px solid ${color}22`, background: `${color}08` }}
    >
      <FolderOpen size={14} style={{ color }} />
      <span style={{ fontSize: 12, color: "#E8DCC8", fontWeight: 500 }}>{group.name}</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: `${color}18`, color }}>
        {group.workIds.length} works
      </span>
      <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: `${color}12`, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {group.type}
      </span>
      <div className="ml-auto">
        {group.isExpanded
          ? <ChevronUp size={13} style={{ color: "rgba(255,255,255,0.30)" }} />
          : <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.30)" }} />
        }
      </div>
    </button>
  );
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export default function ProvenanceUploadEngine() {
  const { isOpen, closeEngine, pendingFiles, clearPending } = useUploadEngine();
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [works, setWorks] = useState<WorkObject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Consume pending files when engine opens
  useEffect(() => {
    if (isOpen && pendingFiles.length > 0) {
      addFiles(pendingFiles);
      clearPending();
    }
  }, [isOpen, pendingFiles]);

  // Detect album/project groupings from a batch of files
  function detectGroups(files: File[]): { groups: Group[]; fileGroupMap: Record<string, string> } {
    const newGroups: Group[] = [];
    const fileGroupMap: Record<string, string> = {};

    // Group by common prefix (e.g. "Album Name - Track 01.mp3", "Album Name - Track 02.mp3")
    const prefixMap: Record<string, string[]> = {};
    for (const f of files) {
      const name = f.name.replace(/\.[^.]+$/, "");
      // Try to detect "Artist - Album - Track" or "Album Track" patterns
      const dashParts = name.split(/\s*[-–—]\s*/);
      if (dashParts.length >= 2) {
        const prefix = dashParts[0].trim();
        if (!prefixMap[prefix]) prefixMap[prefix] = [];
        prefixMap[prefix].push(fileId(f));
      }
    }

    // Only create groups for 2+ files with the same prefix
    for (const [prefix, ids] of Object.entries(prefixMap)) {
      if (ids.length >= 2) {
        const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        newGroups.push({
          id: groupId,
          name: prefix,
          workIds: ids,
          isExpanded: true,
          type: files.filter(f => ids.includes(fileId(f))).every(f => f.type.startsWith("audio")) ? "album" : "project",
        });
        ids.forEach(id => { fileGroupMap[id] = groupId; });
      }
    }

    return { groups: newGroups, fileGroupMap };
  }

  const processWork = useCallback(async (work: WorkObject) => {
    const update = (patch: Partial<WorkObject>) =>
      setWorks(ws => ws.map(w => w.id === work.id ? { ...w, ...patch } : w));

    try {
      update({ stage: "reading" });
      await new Promise(r => setTimeout(r, 50));

      update({ stage: "hashing" });
      await new Promise(r => setTimeout(r, 40));

      update({ stage: "extracting" });
      const meta = await extractFileMetadata(work.file);

      // Generate preview URLs
      let previewUrl: string | null = meta.previewDataUrl ?? null;
      let audioUrl: string | null = null;
      const cat = getCategory(work.file);
      if (cat.type === "music" || cat.type === "video") {
        audioUrl = URL.createObjectURL(work.file);
      }
      if (cat.type === "image" && !previewUrl) {
        previewUrl = URL.createObjectURL(work.file);
      }

      update({ stage: "assembling" });
      await new Promise(r => setTimeout(r, 40));

      update({ stage: "ready", meta, previewUrl, audioUrl });
    } catch (err) {
      update({ stage: "error", error: err instanceof Error ? err.message : "Extraction failed" });
    }
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setWorks(prev => {
      const existing = new Set(prev.map(w => w.id));
      const newWorks: WorkObject[] = files
        .filter(f => !existing.has(fileId(f)))
        .map(f => ({
          id: fileId(f),
          file: f,
          stage: "queued" as WorkStage,
          meta: null,
          previewUrl: null,
          audioUrl: null,
          isPlaying: false,
          isExpanded: false,
          groupId: null,
          logs: [],
          error: null,
        }));

      // Detect groups from new files
      if (newWorks.length >= 2) {
        const { groups: detectedGroups, fileGroupMap } = detectGroups(files);
        if (detectedGroups.length > 0) {
          setGroups(g => [...g, ...detectedGroups]);
          newWorks.forEach(w => {
            if (fileGroupMap[w.id]) w.groupId = fileGroupMap[w.id];
          });
        }
      }

      // Start processing
      newWorks.forEach(w => setTimeout(() => processWork(w), 0));
      return [...prev, ...newWorks];
    });
  }, [processWork]);

  const removeWork = useCallback((id: string) => {
    setWorks(ws => {
      const w = ws.find(x => x.id === id);
      if (w?.previewUrl) URL.revokeObjectURL(w.previewUrl);
      if (w?.audioUrl) URL.revokeObjectURL(w.audioUrl);
      return ws.filter(x => x.id !== id);
    });
    setGroups(gs => gs.map(g => ({ ...g, workIds: g.workIds.filter(wid => wid !== id) })).filter(g => g.workIds.length > 0));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setWorks(ws => ws.map(w => w.id === id ? { ...w, isExpanded: !w.isExpanded } : w));
  }, []);

  const togglePlay = useCallback((id: string) => {
    setWorks(ws => ws.map(w => w.id === id ? { ...w, isPlaying: !w.isPlaying } : { ...w, isPlaying: false }));
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setGroups(gs => gs.map(g => g.id === id ? { ...g, isExpanded: !g.isExpanded } : g));
  }, []);

  const registerWork = useCallback((work: WorkObject) => {
    if (!work.meta) return;
    const { meta } = work;
    const cat = getCategory(work.file);
    const typeMap: Record<string, string> = {
      music: "music", image: "manuscript", video: "video",
      document: "manuscript", code: "manuscript", "3d": "manuscript", archive: "manuscript",
    };
    const params = new URLSearchParams();
    params.set("type", typeMap[cat.type] ?? "music");
    if (meta.music?.title) params.set("title", meta.music.title);
    if (meta.music?.genre) params.set("genre", meta.music.genre);
    if (meta.music?.lyrics) params.set("lyrics", meta.music.lyrics);
    if (meta.ai.detected) {
      const platform = AI_LABELS[meta.ai.platform ?? ""] ?? meta.ai.platform ?? "AI";
      const model = meta.ai.model ? ` (${meta.ai.model})` : "";
      params.set("aiDisclosure", `${platform}${model}`);
    }
    closeEngine();
    navigate(`/manifest?${params.toString()}`);
  }, [closeEngine, navigate]);

  const registerAll = useCallback(() => {
    const readyWorks = works.filter(w => w.stage === "ready");
    if (readyWorks.length === 1) {
      registerWork(readyWorks[0]);
    } else {
      closeEngine();
      navigate("/manifest");
    }
  }, [works, registerWork, closeEngine, navigate]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files: File[] = [];
    for (const item of Array.from(e.dataTransfer.items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) addFiles(files);
  }, [addFiles]);

  const readyCount = works.filter(w => w.stage === "ready").length;
  const aiCount = works.filter(w => w.meta?.ai.detected).length;
  const totalCount = works.length;

  // Ungrouped works
  const ungroupedWorks = works.filter(w => !w.groupId);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[500]"
        style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }}
        onClick={closeEngine}
      />

      {/* Engine Panel — slides up from bottom */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[501] flex flex-col"
        style={{
          background: "var(--ln-void, #0A0A0A)",
          border: "1px solid rgba(212,175,55,0.20)",
          borderBottom: "none",
          borderRadius: "20px 20px 0 0",
          maxHeight: "85vh",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.30)" }}>
            <Upload size={16} style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: "#D4AF37", letterSpacing: "0.12em" }}>
              PROVENANCE UPLOAD ENGINE
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
              {totalCount === 0
                ? "Drop files to begin. Every upload carries testimony."
                : `${totalCount} work${totalCount !== 1 ? "s" : ""} · ${readyCount} ready${aiCount > 0 ? ` · ${aiCount} AI detected` : ""}`
              }
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {readyCount > 0 && (
              <Button
                onClick={registerAll}
                size="sm"
                style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#000", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em", fontSize: 11, border: "none" }}
              >
                REGISTER {readyCount > 1 ? `ALL ${readyCount}` : "WORK"} <ArrowRight size={12} className="ml-1" />
              </Button>
            )}
            <button
              onClick={closeEngine}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <X size={16} style={{ color: "rgba(255,255,255,0.50)" }} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>

          {/* Drop zone (always visible) */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className="mx-6 mt-4 mb-4 rounded-2xl flex flex-col items-center justify-center py-6 px-4 cursor-pointer transition-all"
            style={{
              border: `2px dashed ${isDragging ? "#D4AF37" : "rgba(212,175,55,0.18)"}`,
              background: isDragging ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.01)",
              minHeight: works.length === 0 ? 180 : 80,
            }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={works.length === 0 ? 28 : 18} style={{ color: isDragging ? "#D4AF37" : "rgba(255,255,255,0.20)", marginBottom: works.length === 0 ? 10 : 6 }} />
            <div style={{ fontSize: works.length === 0 ? 13 : 11, color: isDragging ? "#D4AF37" : "rgba(255,255,255,0.35)", fontWeight: 500, textAlign: "center" }}>
              {isDragging ? "Release to ingest" : works.length === 0 ? "Drop files, folders, or entire projects" : "Drop more files"}
            </div>
            {works.length === 0 && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginTop: 6, textAlign: "center", lineHeight: 1.7 }}>
                Images · Music · Video · Documents · Code · 3D Assets · ZIP Archives
              </div>
            )}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                className="px-3 py-1.5 rounded-lg text-[11px]"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                Browse Files
              </button>
              <button
                onClick={e => { e.stopPropagation(); folderInputRef.current?.click(); }}
                className="px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <FolderOpen size={12} /> Browse Folder
              </button>
            </div>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }} />
            {/* @ts-ignore */}
            <input ref={folderInputRef} type="file" multiple webkitdirectory="" className="hidden" onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }} />
          </div>

          {/* Work objects */}
          {works.length > 0 && (
            <div className="px-6 pb-6 flex flex-col gap-3">
              {/* Groups first */}
              {groups.map(group => (
                <div key={group.id}>
                  <GroupHeader group={group} onToggle={toggleGroup} />
                  {group.isExpanded && (
                    <div className="mt-2 ml-4 flex flex-col gap-2">
                      {group.workIds
                        .map(id => works.find(w => w.id === id))
                        .filter((w): w is WorkObject => !!w)
                        .map(work => (
                          <WorkCard
                            key={work.id}
                            work={work}
                            onToggleExpand={toggleExpand}
                            onTogglePlay={togglePlay}
                            onRemove={removeWork}
                            onRegister={registerWork}
                          />
                        ))
                      }
                    </div>
                  )}
                </div>
              ))}

              {/* Ungrouped works */}
              {ungroupedWorks.map(work => (
                <WorkCard
                  key={work.id}
                  work={work}
                  onToggleExpand={toggleExpand}
                  onTogglePlay={togglePlay}
                  onRemove={removeWork}
                  onRegister={registerWork}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
