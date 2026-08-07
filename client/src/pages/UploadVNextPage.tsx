/*
═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Upload vNext (Rebuilt)
   Intelligent Provenance Ingestion Engine · LNLS v1.0
   Architecture diagram + live extraction feed + AI detection
═══════════════════════════════════════════════════════════════════ */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, X, CheckCircle, AlertCircle, Sparkles, ArrowRight,
  Music, Image, Video, FileText, Code, Archive, Cpu,
  Hash, Layers, ChevronDown, ChevronUp,
} from "lucide-react";
import { extractFileMetadata, type UploadMetadataV2, type AIMetadata } from "@/lib/uploadPipeline";
import IngestionArchitectureDiagram, { type PipelineStage } from "@/components/IngestionArchitectureDiagram";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileCategory(file: File): { label: string; icon: React.ElementType; color: string } {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","tiff","heic","raw","cr2","nef","arw"].includes(ext))
    return { label: "Image", icon: Image, color: "#A78BFA" };
  if (mime.startsWith("audio/") || ["mp3","flac","wav","ogg","aac","m4a","opus","aiff","wma"].includes(ext))
    return { label: "Music", icon: Music, color: "#34D399" };
  if (mime.startsWith("video/") || ["mp4","mov","webm","mkv","avi"].includes(ext))
    return { label: "Video", icon: Video, color: "#F87171" };
  if (["glb","gltf","obj","fbx","stl","blend"].includes(ext))
    return { label: "3D Asset", icon: Cpu, color: "#60A5FA" };
  if (["js","ts","py","rs","go","cpp","c","java"].includes(ext))
    return { label: "Code", icon: Code, color: "#FBBF24" };
  if (["zip","tar","gz","7z","rar"].includes(ext))
    return { label: "Archive", icon: Archive, color: "#94A3B8" };
  return { label: "Document", icon: FileText, color: "#D4AF37" };
}

const AI_LABELS: Record<string, string> = {
  suno: "Suno", udio: "Udio", midjourney: "Midjourney",
  stable_diffusion: "Stable Diffusion", flux: "Flux", chatgpt: "ChatGPT",
  claude: "Claude", gemini: "Gemini", runway: "Runway",
  elevenlabs: "ElevenLabs", firefly: "Adobe Firefly", leonardo: "Leonardo AI",
};

// ─── Log entry type ───────────────────────────────────────────────────────────

interface LogEntry {
  ts: number;
  message: string;
  value?: string;
  type: "info" | "success" | "ai" | "warn";
}

// ─── AI Detection Panel ───────────────────────────────────────────────────────

function AIDetectionPanel({ ai }: { ai: AIMetadata }) {
  if (!ai.detected) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={13} style={{ color: "#6B7280" }} />
          <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", color: "#6B7280", letterSpacing: "0.08em" }}>AI PARTICIPATION</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>No AI participation detected.</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.20)", marginTop: 4 }}>Creation chain: Human only.</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={13} style={{ color: "#D4AF37" }} />
        <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", color: "#D4AF37", letterSpacing: "0.08em" }}>AI PARTICIPATION DETECTED</span>
        <div className="ml-auto px-2 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", fontSize: 9, fontFamily: "monospace" }}>
          {ai.platform ? "HIGH CONFIDENCE" : "MEDIUM"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {ai.platform && (
          <div className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 2 }}>PLATFORM</div>
            <div style={{ fontSize: 13, color: "#E8DCC8", fontWeight: 600 }}>{AI_LABELS[ai.platform] ?? ai.platform}</div>
          </div>
        )}
        {ai.model && (
          <div className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 2 }}>MODEL</div>
            <div style={{ fontSize: 13, color: "#E8DCC8", fontWeight: 600 }}>{ai.model}</div>
          </div>
        )}
        {ai.seed && (
          <div className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 2 }}>SEED</div>
            <div style={{ fontSize: 11, color: "#E8DCC8", fontFamily: "monospace" }}>{ai.seed}</div>
          </div>
        )}
        {ai.cfg && (
          <div className="rounded-lg p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 2 }}>CFG SCALE</div>
            <div style={{ fontSize: 11, color: "#E8DCC8", fontFamily: "monospace" }}>{ai.cfg}</div>
          </div>
        )}
      </div>
      {ai.prompt && (
        <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 4 }}>GENERATION PROMPT</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.70)", lineHeight: 1.6, fontStyle: "italic" }}>"{ai.prompt}"</div>
        </div>
      )}
      {ai.lora && ai.lora.length > 0 && (
        <div className="mb-3">
          <div style={{ fontSize: 9, color: "#6B7280", fontFamily: "monospace", marginBottom: 4 }}>LORA MODELS</div>
          <div className="flex flex-wrap gap-1">
            {ai.lora.map((l, i) => (
              <span key={i} className="px-2 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.10)", color: "#D4AF37", fontSize: 10, fontFamily: "monospace" }}>{l}</span>
            ))}
          </div>
        </div>
      )}
      <div className="pt-3 border-t flex items-center gap-3" style={{ borderColor: "rgba(212,175,55,0.15)" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}>Confirm participation?</span>
        <button className="px-3 py-1 rounded-lg" style={{ background: "rgba(212,175,55,0.20)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.30)", fontSize: 11, fontFamily: "monospace" }}>
          ✓ Confirmed
        </button>
        <button className="px-3 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 11, fontFamily: "monospace" }}>
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Provenance Object View ───────────────────────────────────────────────────

function ProvenanceObjectView({ meta }: { meta: UploadMetadataV2 }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ registry: true, metadata: true });
  const toggle = (k: string) => setExpanded(e => ({ ...e, [k]: !e[k] }));

  const sections = [
    {
      id: "registry",
      label: "REGISTRY",
      sublabel: "WID · Status · Signature",
      rows: [
        { label: "Status", value: "Ready to Register" },
        { label: "WID Type", value: meta.mimeType.startsWith("audio") ? "WID-MUS" : meta.mimeType.startsWith("image") ? "WID-OUT" : "WID-OUT" },
        { label: "SHA-256", value: meta.fileHash.slice(0, 24) + "…" },
        { label: "File Size", value: formatBytes(meta.fileSizeBytes) },
      ],
    },
    {
      id: "metadata",
      label: "METADATA",
      sublabel: "Title · Genre · Technical",
      rows: [
        { label: "Filename", value: meta.file.fileName },
        { label: "Type", value: meta.file.fileType },
        ...(meta.music ? [
          { label: "Title", value: meta.music.title },
          { label: "Artist", value: meta.music.artist },
          { label: "Album", value: meta.music.album },
          { label: "Genre", value: meta.music.genre },
          { label: "BPM", value: meta.music.bpm?.toString() },
          { label: "Key", value: meta.music.key },
          { label: "ISRC", value: meta.music.isrc },
          { label: "Duration", value: meta.music.durationSeconds ? `${Math.floor(meta.music.durationSeconds / 60)}:${String(Math.floor(meta.music.durationSeconds % 60)).padStart(2, "0")}` : undefined },
        ] : []),
        ...(meta.image ? [
          { label: "Dimensions", value: meta.image.width && meta.image.height ? `${meta.image.width} × ${meta.image.height}` : undefined },
          { label: "Camera", value: meta.image.cameraModel },
          { label: "Lens", value: meta.image.lens },
          { label: "ISO", value: meta.image.iso?.toString() },
          { label: "Aperture", value: meta.image.aperture ? `f/${meta.image.aperture}` : undefined },
          { label: "Software", value: meta.image.software },
        ] : []),
      ].filter(r => r.value),
    },
    {
      id: "disclosure",
      label: "DISCLOSURE",
      sublabel: "Participation Chain",
      rows: [
        { label: "AI Involved", value: meta.ai.detected ? "Yes" : "No" },
        { label: "Platform", value: meta.ai.platform ? (AI_LABELS[meta.ai.platform] ?? meta.ai.platform) : undefined },
        { label: "Role", value: meta.provenance.aiParticipation.role },
        { label: "Creator", value: meta.provenance.embeddedAttribution.creator },
        { label: "Copyright", value: meta.provenance.embeddedAttribution.copyright },
        { label: "Publisher", value: meta.provenance.embeddedAttribution.publisher },
      ].filter(r => r.value),
    },
    {
      id: "relationships",
      label: "RELATIONSHIPS",
      sublabel: "Lineage · Derivatives",
      rows: [
        { label: "Parent Work", value: "None detected" },
        { label: "Editing Chain", value: meta.provenance.revisionChain.editingHistory?.join(" → ") },
        { label: "GPS", value: meta.image?.gpsLat && meta.image?.gpsLon ? `${meta.image.gpsLat.toFixed(6)}, ${meta.image.gpsLon.toFixed(6)}` : undefined },
      ].filter(r => r.value),
    },
  ];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,175,55,0.20)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(212,175,55,0.08)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
        <Layers size={13} style={{ color: "#D4AF37" }} />
        <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", color: "#D4AF37", letterSpacing: "0.10em" }}>PROVENANCE OBJECT</span>
        <span className="ml-auto" style={{ fontSize: 10, fontFamily: "monospace", color: "#6B7280" }}>PO-{meta.fileHash.slice(0, 8).toUpperCase()}</span>
      </div>
      {sections.map(sec => (
        <div key={sec.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <button
            onClick={() => toggle(sec.id)}
            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
          >
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#D4AF37", letterSpacing: "0.06em" }}>{sec.label}</span>
            <span style={{ fontSize: 10, color: "#4B5563" }}>{sec.sublabel}</span>
            <div className="ml-auto">
              {expanded[sec.id] ? <ChevronUp size={11} style={{ color: "#4B5563" }} /> : <ChevronDown size={11} style={{ color: "#4B5563" }} />}
            </div>
          </button>
          {expanded[sec.id] && (
            <div className="px-4 pb-3">
              {sec.rows.length === 0 ? (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.20)" }}>No data extracted</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {sec.rows.map((row, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ fontSize: 10, color: "#6B7280", fontFamily: "monospace", minWidth: 72, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: "monospace", wordBreak: "break-all" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Extraction Log ───────────────────────────────────────────────────────────

function ExtractionLog({ entries }: { entries: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entries.length]);

  const colors: Record<LogEntry["type"], string> = {
    info: "rgba(255,255,255,0.35)",
    success: "#34D399",
    ai: "#D4AF37",
    warn: "#F59E0B",
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.40)" }}>
      <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#6B7280", letterSpacing: "0.06em" }}>EXTRACTION FEED</span>
        <span className="ml-auto" style={{ fontSize: 10, fontFamily: "monospace", color: "#4B5563" }}>{entries.length} events</span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 200, padding: "8px 16px" }}>
        {entries.length === 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.20)", padding: "8px 0" }}>Waiting for file…</div>
        )}
        {entries.map((e, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span style={{ fontSize: 9, color: "#374151", fontFamily: "monospace", flexShrink: 0, marginTop: 1 }}>
              {new Date(e.ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span style={{ fontSize: 10, color: colors[e.type], fontFamily: "monospace", lineHeight: 1.5 }}>
              {e.message}
              {e.value && <span style={{ color: "rgba(255,255,255,0.50)", marginLeft: 4 }}>{e.value}</span>}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────

function FileRow({ file, stage, isActive, onSelect, onRemove }: {
  file: File; stage: PipelineStage; isActive: boolean;
  onSelect: () => void; onRemove: () => void;
}) {
  const cat = getFileCategory(file);
  const Icon = cat.icon;
  const processing = stage !== "idle" && stage !== "complete" && stage !== "error";
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
      style={{
        background: isActive ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? "rgba(212,175,55,0.25)" : stage === "complete" ? "rgba(52,211,153,0.15)" : stage === "error" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}18` }}>
        <Icon size={12} style={{ color: cat.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 11, color: "rgba(255,255,255,0.70)" }}>{file.name}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{cat.label} · {formatBytes(file.size)}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {processing && <div className="w-3 h-3 rounded-full border border-[#D4AF37] border-t-transparent animate-spin" />}
        {stage === "complete" && <CheckCircle size={12} style={{ color: "#34D399" }} />}
        {stage === "error" && <AlertCircle size={12} style={{ color: "#EF4444" }} />}
        <button onClick={e => { e.stopPropagation(); onRemove(); }}>
          <X size={11} style={{ color: "rgba(255,255,255,0.20)" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UploadVNextPage() {
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [metaMap, setMetaMap] = useState<Record<string, UploadMetadataV2 | null>>({});
  const [stageMap, setStageMap] = useState<Record<string, PipelineStage>>({});
  const [logMap, setLogMap] = useState<Record<string, LogEntry[]>>({});
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);

  function fileKey(f: File) { return `${f.name}-${f.size}-${f.lastModified}`; }

  function addLog(key: string, entry: Omit<LogEntry, "ts">) {
    setLogMap(m => ({ ...m, [key]: [...(m[key] ?? []), { ...entry, ts: Date.now() }] }));
  }

  const processFile = useCallback(async (file: File) => {
    const key = fileKey(file);
    setStageMap(m => ({ ...m, [key]: "reading" }));
    addLog(key, { message: "Reading file buffer…", type: "info" });
    await new Promise(r => setTimeout(r, 60));

    setStageMap(m => ({ ...m, [key]: "hashing" }));
    addLog(key, { message: "Computing SHA-256 + MD5 hash…", type: "info" });
    await new Promise(r => setTimeout(r, 40));

    try {
      const mime = file.type.toLowerCase();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const isImage = mime.startsWith("image/") || ["jpg","jpeg","png","webp","tiff","heic","raw","cr2","nef"].includes(ext);
      const isAudio = mime.startsWith("audio/") || ["mp3","flac","wav","ogg","aac","m4a","opus","aiff"].includes(ext);

      if (isImage) {
        setStageMap(m => ({ ...m, [key]: "exif" }));
        addLog(key, { message: "Extracting EXIF / IPTC / XMP…", type: "info" });
        await new Promise(r => setTimeout(r, 30));
      }
      if (isAudio) {
        setStageMap(m => ({ ...m, [key]: "music" }));
        addLog(key, { message: "Extracting ID3 / Vorbis music tags…", type: "info" });
        await new Promise(r => setTimeout(r, 30));
      }

      setStageMap(m => ({ ...m, [key]: "ai_detect" }));
      addLog(key, { message: "Scanning for AI generation metadata…", type: "info" });
      await new Promise(r => setTimeout(r, 30));

      const meta = await extractFileMetadata(file);

      addLog(key, { message: "SHA-256:", value: meta.fileHash.slice(0, 16) + "…", type: "success" });
      if (meta.music?.title) addLog(key, { message: "Title:", value: meta.music.title, type: "success" });
      if (meta.music?.artist) addLog(key, { message: "Artist:", value: meta.music.artist, type: "success" });
      if (meta.music?.bpm) addLog(key, { message: "BPM:", value: String(meta.music.bpm), type: "success" });
      if (meta.music?.isrc) addLog(key, { message: "ISRC:", value: meta.music.isrc, type: "success" });
      if (meta.image?.cameraModel) addLog(key, { message: "Camera:", value: meta.image.cameraModel, type: "success" });
      if (meta.image?.gpsLat) addLog(key, { message: "GPS:", value: `${meta.image.gpsLat.toFixed(4)}, ${meta.image.gpsLon?.toFixed(4)}`, type: "success" });
      if (meta.ai.detected) {
        addLog(key, { message: `⚡ AI DETECTED: ${(AI_LABELS[meta.ai.platform ?? ""] ?? meta.ai.platform ?? "UNKNOWN").toUpperCase()}`, value: meta.ai.model ?? "", type: "ai" });
        if (meta.ai.prompt) addLog(key, { message: "Prompt extracted", type: "ai" });
        if (meta.ai.seed) addLog(key, { message: "Seed:", value: meta.ai.seed, type: "ai" });
      } else {
        addLog(key, { message: "No AI participation detected", type: "success" });
      }

      setStageMap(m => ({ ...m, [key]: "provenance" }));
      addLog(key, { message: "Assembling Provenance Object…", type: "info" });
      await new Promise(r => setTimeout(r, 40));

      setStageMap(m => ({ ...m, [key]: "wid" }));
      addLog(key, { message: "WID ready for issuance", type: "success" });
      await new Promise(r => setTimeout(r, 30));

      setMetaMap(m => ({ ...m, [key]: meta }));
      setStageMap(m => ({ ...m, [key]: "complete" }));
      addLog(key, { message: "✓ Provenance Object assembled", type: "success" });

      setActiveFileKey(k => k === null ? key : k);
    } catch (err) {
      setStageMap(m => ({ ...m, [key]: "error" }));
      addLog(key, { message: `Error: ${err instanceof Error ? err.message : "Unknown"}`, type: "warn" });
    }
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(fileKey));
      const unique = newFiles.filter(f => !existing.has(fileKey(f)));
      unique.forEach(f => processFile(f));
      return [...prev, ...unique];
    });
  }, [processFile]);

  const removeFile = useCallback((file: File) => {
    const key = fileKey(file);
    setFiles(f => f.filter(x => fileKey(x) !== key));
    setMetaMap(m => { const n = { ...m }; delete n[key]; return n; });
    setStageMap(m => { const n = { ...m }; delete n[key]; return n; });
    setLogMap(m => { const n = { ...m }; delete n[key]; return n; });
    setActiveFileKey(k => k === key ? null : k);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }, [addFiles]);

  const activeMeta = activeFileKey ? metaMap[activeFileKey] : null;
  const activeStage: PipelineStage = activeFileKey ? (stageMap[activeFileKey] ?? "idle") : "idle";
  const activeLogs = activeFileKey ? (logMap[activeFileKey] ?? []) : [];
  const activeFile = files.find(f => fileKey(f) === activeFileKey) ?? null;
  const allProcessed = files.length > 0 && files.every(f => stageMap[fileKey(f)] === "complete" || stageMap[fileKey(f)] === "error");
  const aiCount = files.filter(f => metaMap[fileKey(f)]?.ai.detected).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void)", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.30)" }}>
            <Upload size={16} style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "#D4AF37", letterSpacing: "0.12em" }}>REGISTRY UPLOAD vNEXT</h1>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", letterSpacing: "0.08em", fontFamily: "monospace" }}>INTELLIGENT PROVENANCE INGESTION ENGINE · LNLS v1.0</p>
          </div>
          {files.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
              {aiCount > 0 && <span style={{ fontSize: 11, color: "#D4AF37" }}>{aiCount} AI detected</span>}
            </div>
          )}
        </div>

        {/* Three-column layout */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "260px 1fr 300px" }}>

          {/* LEFT — Drop zone + file list */}
          <div className="flex flex-col gap-3">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-xl flex flex-col items-center justify-center py-8 px-4 transition-all"
              style={{
                border: `2px dashed ${isDragging ? "#D4AF37" : "rgba(212,175,55,0.18)"}`,
                background: isDragging ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.01)",
                minHeight: 130,
              }}
            >
              <Upload size={22} style={{ color: isDragging ? "#D4AF37" : "rgba(255,255,255,0.18)", marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: isDragging ? "#D4AF37" : "rgba(255,255,255,0.35)", fontWeight: 500, textAlign: "center" }}>
                {isDragging ? "Release to ingest" : "Drop files to ingest"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 4, textAlign: "center", lineHeight: 1.6 }}>
                Images · Music · Video<br />Docs · 3D · Code · ZIP
              </div>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={onInputChange} />
            </div>

            {files.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div style={{ fontSize: 9, color: "#4B5563", fontFamily: "monospace", letterSpacing: "0.06em", paddingLeft: 2 }}>
                  FILES IN QUEUE
                </div>
                {files.map(f => (
                  <FileRow
                    key={fileKey(f)}
                    file={f}
                    stage={stageMap[fileKey(f)] ?? "idle"}
                    isActive={fileKey(f) === activeFileKey}
                    onSelect={() => setActiveFileKey(fileKey(f))}
                    onRemove={() => removeFile(f)}
                  />
                ))}
              </div>
            )}

            {allProcessed && files.length > 0 && (
              <Button
                onClick={() => navigate("/manifest")}
                className="w-full mt-1"
                style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#000", fontFamily: "'Cinzel', serif", letterSpacing: "0.10em", fontSize: 11, border: "none" }}
              >
                REGISTER WORK <ArrowRight size={12} className="ml-1.5" />
              </Button>
            )}
          </div>

          {/* CENTER — Architecture diagram + extraction log */}
          <div className="flex flex-col gap-3">
            <IngestionArchitectureDiagram
              activeStage={activeStage}
              fileName={activeFile?.name}
            />
            <ExtractionLog entries={activeLogs} />

            {files.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", lineHeight: 2 }}>
                  Drop a file to see the ingestion pipeline.<br />
                  Every metadata signal is extracted and mapped<br />
                  to the Living Nexus provenance chain.
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — AI detection + Provenance Object */}
          <div className="flex flex-col gap-3">
            {activeMeta ? (
              <>
                <AIDetectionPanel ai={activeMeta.ai} />
                <ProvenanceObjectView meta={activeMeta} />
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#2D3748", letterSpacing: "0.06em", marginBottom: 8 }}>AI DETECTION</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>Waiting for file…</div>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#2D3748", letterSpacing: "0.06em", marginBottom: 8 }}>PROVENANCE OBJECT</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", lineHeight: 1.8 }}>
                    The Provenance Object assembles here after ingestion.
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    {["REGISTRY", "METADATA", "DISCLOSURE", "RELATIONSHIPS"].map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ background: "rgba(255,255,255,0.05)" }} />
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#1F2937" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
