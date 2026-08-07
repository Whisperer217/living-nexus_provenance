/*
═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Upload vNext
   Intelligent Provenance Ingestion Engine
   Every upload carries testimony. The platform preserves it.
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef } from "react";
import { extractFileMetadata, type UploadMetadataV2 } from "@/lib/uploadPipeline";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Upload, FileText, Music, Image, Video, Code, Archive, Cpu,
  CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp,
  MapPin, Camera, Sparkles, Hash, Clock, Globe, Shield,
  ArrowRight, X, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// ─── File type detection ──────────────────────────────────────────────────────
function getFileCategory(file: File): { label: string; icon: React.ElementType; color: string } {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","tiff","heic","heif","avif","raw","cr2","nef","arw","psd"].includes(ext))
    return { label: "Image", icon: Image, color: "#A78BFA" };
  if (mime.startsWith("audio/") || ["mp3","flac","wav","ogg","aac","m4a","opus","aiff","wma"].includes(ext))
    return { label: "Music", icon: Music, color: "#34D399" };
  if (mime.startsWith("video/") || ["mp4","mov","webm","mkv","avi","mxf"].includes(ext))
    return { label: "Video", icon: Video, color: "#F87171" };
  if (["glb","gltf","obj","fbx","stl","blend"].includes(ext))
    return { label: "3D Asset", icon: Cpu, color: "#60A5FA" };
  if (["js","ts","py","rs","go","cpp","c","java","swift","kt","rb","php"].includes(ext))
    return { label: "Code", icon: Code, color: "#FBBF24" };
  if (["zip","tar","gz","7z","rar"].includes(ext))
    return { label: "Archive", icon: Archive, color: "#94A3B8" };
  return { label: "Document", icon: FileText, color: "#D4AF37" };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Metadata Panel ───────────────────────────────────────────────────────────
function MetadataSection({ title, icon: Icon, color, children, defaultOpen = false }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}22` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: `${color}08` }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span style={{ fontSize: 11, fontFamily: "'Cinzel', serif", letterSpacing: "0.12em", color }}>{title}</span>
        </div>
        {open ? <ChevronUp size={12} style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.30)" }} />}
      </button>
      {open && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", width: 120, flexShrink: 0, fontFamily: "monospace", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: 11, color: "#E8DCC8", wordBreak: "break-word" }}>{String(value)}</span>
    </div>
  );
}

// ─── Provenance Map Display ───────────────────────────────────────────────────
function ProvenanceMap({ meta }: { meta: UploadMetadataV2 }) {
  const { provenance, ai } = meta;
  const steps = [
    { label: "Creator", desc: provenance.embeddedAttribution.creator ?? "You", icon: Shield, color: "#D4AF37" },
    { label: "Creation Event", desc: [provenance.creationEvent.timestamp ? new Date(provenance.creationEvent.timestamp).toLocaleDateString() : "Unknown date", provenance.creationEvent.device, provenance.creationEvent.location].filter(Boolean).join(" · ") || "File timestamp", icon: Clock, color: "#60A5FA" },
    { label: "AI Participation", desc: ai.detected ? `${ai.platform ?? "AI"} — ${provenance.aiParticipation.role ?? "generated"}${ai.model ? ` (${ai.model})` : ""}` : "None detected — Human origin", icon: Sparkles, color: ai.detected ? "#F59E0B" : "#6B7280" },
    { label: "Revision Chain", desc: provenance.revisionChain.editingHistory?.join(" → ") ?? "No editing history found", icon: ArrowRight, color: "#A78BFA" },
    { label: "Publication", desc: "Pending — will be set on registration", icon: Globe, color: "#34D399" },
    { label: "Current Version", desc: `SHA-256: ${meta.file.sha256.slice(0, 16)}…`, icon: Hash, color: "#D4AF37" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: step.color + "18", border: `1px solid ${step.color}44` }}>
              <step.icon size={12} style={{ color: step.color }} />
            </div>
            {i < steps.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "rgba(255,255,255,0.08)", minHeight: 16 }} />}
          </div>
          <div className="flex-1 pb-3">
            <div style={{ fontSize: 11, color: step.color, fontFamily: "'Cinzel', serif", letterSpacing: "0.10em" }}>{step.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", marginTop: 2, lineHeight: 1.5 }}>{step.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single File Card ─────────────────────────────────────────────────────────
function FileIngestionCard({ file, meta, onRemove }: { file: File; meta: UploadMetadataV2 | null; onRemove: () => void }) {
  const cat = getFileCategory(file);
  const CatIcon = cat.icon;
  const [showProvenance, setShowProvenance] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${cat.color}33` }}>
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {meta?.previewDataUrl ? (
          <img src={meta.previewDataUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" style={{ border: `1px solid ${cat.color}33` }} />
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cat.color + "18", border: `1px solid ${cat.color}33` }}>
            <CatIcon size={18} style={{ color: cat.color }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 13, color: "#E8DCC8", fontWeight: 500 }}>{file.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: cat.color + "18", color: cat.color, fontSize: 10 }}>{cat.label}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{formatBytes(file.size)}</span>
            {meta?.ai.detected && (
              <span className="px-1.5 py-0.5 rounded text-xs flex items-center gap-1" style={{ background: "#F59E0B18", color: "#F59E0B", fontSize: 10 }}>
                <Sparkles size={8} /> AI: {meta.ai.platform}
              </span>
            )}
          </div>
        </div>
        {!meta && <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: "rgba(255,255,255,0.30)" }} />}
        {meta && <CheckCircle size={16} className="flex-shrink-0" style={{ color: "#34D399" }} />}
        <button onClick={onRemove} className="p-1 rounded hover:bg-white/5 flex-shrink-0" style={{ color: "rgba(255,100,100,0.50)" }}>
          <X size={14} />
        </button>
      </div>

      {meta && (
        <div className="p-4 flex flex-col gap-3">
          {/* File metadata */}
          <MetadataSection title="FILE METADATA" icon={Hash} color="#D4AF37" defaultOpen>
            <MetaRow label="SHA-256" value={meta.file.sha256} />
            <MetaRow label="MD5 (approx)" value={meta.file.md5} />
            <MetaRow label="File Type" value={meta.file.fileType} />
            <MetaRow label="File Size" value={formatBytes(meta.file.fileSizeBytes)} />
            <MetaRow label="Modified" value={meta.file.modifiedDate ? new Date(meta.file.modifiedDate).toLocaleString() : undefined} />
          </MetadataSection>

          {/* Image / Camera metadata */}
          {meta.image && (meta.image.cameraMake || meta.image.resolution || meta.image.gpsLat) && (
            <MetadataSection title="IMAGE METADATA" icon={Camera} color="#A78BFA" defaultOpen>
              <MetaRow label="Resolution" value={meta.image.resolution} />
              <MetaRow label="Color Profile" value={meta.image.colorProfile} />
              <MetaRow label="Camera" value={[meta.image.cameraMake, meta.image.cameraModel].filter(Boolean).join(" ")} />
              <MetaRow label="Lens" value={meta.image.lens} />
              <MetaRow label="ISO" value={meta.image.iso} />
              <MetaRow label="Aperture" value={meta.image.aperture ? `f/${meta.image.aperture}` : undefined} />
              <MetaRow label="Shutter Speed" value={meta.image.shutterSpeed} />
              <MetaRow label="Focal Length" value={meta.image.focalLength ? `${meta.image.focalLength}mm` : undefined} />
              {meta.image.gpsLat && <MetaRow label="GPS" value={`${meta.image.gpsLat.toFixed(6)}, ${meta.image.gpsLon?.toFixed(6)}`} />}
              {meta.image.gpsAltitude && <MetaRow label="Altitude" value={`${meta.image.gpsAltitude.toFixed(1)}m`} />}
              <MetaRow label="Software" value={meta.image.software} />
              {meta.image.editingChain && <MetaRow label="Editing Chain" value={meta.image.editingChain.join(" → ")} />}
              <MetaRow label="IPTC Creator" value={meta.image.iptcCreator} />
              <MetaRow label="IPTC Copyright" value={meta.image.iptcCopyright} />
              <MetaRow label="IPTC Keywords" value={meta.image.iptcKeywords?.join(", ")} />
              <MetaRow label="XMP Creator" value={meta.image.xmpCreator} />
              <MetaRow label="XMP Rights" value={meta.image.xmpRights} />
            </MetadataSection>
          )}

          {/* Music metadata */}
          {meta.music && (meta.music.title || meta.music.artist || meta.music.isrc) && (
            <MetadataSection title="MUSIC METADATA" icon={Music} color="#34D399" defaultOpen>
              <MetaRow label="Title" value={meta.music.title} />
              <MetaRow label="Artist" value={meta.music.artist} />
              <MetaRow label="Album" value={meta.music.album} />
              <MetaRow label="Album Artist" value={meta.music.albumArtist} />
              <MetaRow label="Composer" value={meta.music.composer} />
              <MetaRow label="Genre" value={meta.music.genre} />
              <MetaRow label="Year" value={meta.music.year} />
              <MetaRow label="Duration" value={meta.music.durationSeconds ? `${Math.floor(meta.music.durationSeconds / 60)}:${String(Math.round(meta.music.durationSeconds % 60)).padStart(2,"0")}` : undefined} />
              <MetaRow label="BPM" value={meta.music.bpm} />
              <MetaRow label="Key" value={meta.music.key} />
              <MetaRow label="ISRC" value={meta.music.isrc} />
              <MetaRow label="Publisher" value={meta.music.publisher} />
              <MetaRow label="Copyright" value={meta.music.copyright} />
              <MetaRow label="Sample Rate" value={meta.music.sampleRate ? `${meta.music.sampleRate} Hz` : undefined} />
              <MetaRow label="Bitrate" value={meta.music.bitrate ? `${Math.round(meta.music.bitrate / 1000)} kbps` : undefined} />
              <MetaRow label="Codec" value={meta.music.codec} />
              {meta.music.lyrics && (
                <div className="mt-2">
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", marginBottom: 4 }}>EMBEDDED LYRICS</div>
                  <div className="p-2 rounded-lg max-h-32 overflow-y-auto" style={{ background: "rgba(255,255,255,0.03)", fontSize: 11, color: "rgba(255,255,255,0.60)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{meta.music.lyrics}</div>
                </div>
              )}
            </MetadataSection>
          )}

          {/* AI metadata */}
          {meta.ai.detected && (
            <MetadataSection title="AI GENERATION METADATA" icon={Sparkles} color="#F59E0B" defaultOpen>
              <MetaRow label="Platform" value={meta.ai.platform} />
              <MetaRow label="Model" value={meta.ai.model} />
              <MetaRow label="Version" value={meta.ai.modelVersion} />
              <MetaRow label="Seed" value={meta.ai.seed} />
              <MetaRow label="CFG Scale" value={meta.ai.cfg} />
              <MetaRow label="Style" value={meta.ai.style} />
              <MetaRow label="Voice Model" value={meta.ai.voiceModel} />
              <MetaRow label="Workflow" value={meta.ai.workflow} />
              {meta.ai.lora && meta.ai.lora.length > 0 && <MetaRow label="LoRA" value={meta.ai.lora.join(", ")} />}
              {meta.ai.prompt && (
                <div className="mt-2">
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", marginBottom: 4 }}>GENERATION PROMPT</div>
                  <div className="p-2 rounded-lg max-h-24 overflow-y-auto" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", fontSize: 11, color: "rgba(255,255,255,0.70)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{meta.ai.prompt}</div>
                </div>
              )}
              {meta.ai.negativePrompt && (
                <div className="mt-2">
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", marginBottom: 4 }}>NEGATIVE PROMPT</div>
                  <div className="p-2 rounded-lg max-h-24 overflow-y-auto" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 11, color: "rgba(255,255,255,0.60)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{meta.ai.negativePrompt}</div>
                </div>
              )}
            </MetadataSection>
          )}

          {/* GPS / Location */}
          {meta.image?.gpsLat && (
            <MetadataSection title="LOCATION DATA" icon={MapPin} color="#F87171">
              <MetaRow label="Coordinates" value={`${meta.image.gpsLat.toFixed(6)}, ${meta.image.gpsLon?.toFixed(6)}`} />
              <MetaRow label="Altitude" value={meta.image.gpsAltitude ? `${meta.image.gpsAltitude.toFixed(1)}m` : undefined} />
              <MetaRow label="GPS Timestamp" value={meta.image.gpsTimestamp} />
              <a
                href={`https://maps.google.com/?q=${meta.image.gpsLat},${meta.image.gpsLon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs"
                style={{ color: "#F87171" }}
              >
                View on Map <ArrowRight size={10} />
              </a>
            </MetadataSection>
          )}

          {/* Provenance mapping */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,175,55,0.25)" }}>
            <button
              onClick={() => setShowProvenance(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ background: "rgba(212,175,55,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Shield size={14} style={{ color: "#D4AF37" }} />
                <span style={{ fontSize: 11, fontFamily: "'Cinzel', serif", letterSpacing: "0.12em", color: "#D4AF37" }}>PROVENANCE MAP</span>
                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", fontSize: 9 }}>
                  Metadata → Witness Data
                </span>
              </div>
              {showProvenance ? <ChevronUp size={12} style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.30)" }} />}
            </button>
            {showProvenance && (
              <div className="px-4 pb-4 pt-2">
                <ProvenanceMap meta={meta} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UploadVNextPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [metaMap, setMetaMap] = useState<Record<string, UploadMetadataV2 | null>>({});
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    setMetaMap(m => ({ ...m, [key]: null }));
    try {
      const meta = await extractFileMetadata(file);
      setMetaMap(m => ({ ...m, [key]: meta }));
    } catch (e) {
      console.error("Metadata extraction failed for", file.name, e);
      setMetaMap(m => {
        const next = { ...m };
        delete next[key];
        return next;
      });
    }
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}-${f.size}`));
      const unique = newFiles.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
      unique.forEach(processFile);
      return [...prev, ...unique];
    });
  }, [processFile]);

  const removeFile = useCallback((file: File) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    setFiles(prev => prev.filter(f => f !== file));
    setMetaMap(m => { const next = { ...m }; delete next[key]; return next; });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) addFiles(dropped);
  }, [addFiles]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) addFiles(selected);
    e.target.value = "";
  }, [addFiles]);

  const allProcessed = files.length > 0 && files.every(f => {
    const key = `${f.name}-${f.size}-${f.lastModified}`;
    return metaMap[key] !== null && metaMap[key] !== undefined;
  });

  const aiDetectedCount = files.filter(f => {
    const key = `${f.name}-${f.size}-${f.lastModified}`;
    return metaMap[key]?.ai.detected;
  }).length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void)" }}>
        <div className="text-center">
          <div style={{ fontFamily: "'Cinzel', serif", color: "#D4AF37", fontSize: 14, letterSpacing: "0.18em" }}>AUTHENTICATION REQUIRED</div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 8 }}>You must be signed in to register works.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void)", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.30)" }}>
              <Upload size={16} style={{ color: "#D4AF37" }} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#D4AF37", letterSpacing: "0.12em" }}>REGISTRY UPLOAD vNEXT</h1>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.06em" }}>INTELLIGENT PROVENANCE INGESTION ENGINE</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", lineHeight: 1.6, maxWidth: 560 }}>
            Every upload carries testimony. Drop any file — image, music, video, document, 3D asset, code, or archive — and the engine extracts every available metadata signal and maps it to the Living Nexus provenance chain.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-2xl flex flex-col items-center justify-center py-12 px-8 mb-6 transition-all"
          style={{
            border: `2px dashed ${isDragging ? "#D4AF37" : "rgba(212,175,55,0.25)"}`,
            background: isDragging ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
          }}
        >
          <Upload size={32} style={{ color: isDragging ? "#D4AF37" : "rgba(255,255,255,0.25)", marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: isDragging ? "#D4AF37" : "rgba(255,255,255,0.50)", fontWeight: 500 }}>
            {isDragging ? "Release to analyze" : "Drop files here or click to browse"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
            Images · Music · Video · Documents · 3D Assets · Code · ZIP · Folders
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onInputChange}
            // @ts-ignore — webkitdirectory is valid HTML but not in TS types
            webkitdirectory={undefined}
          />
        </div>

        {/* Stats bar */}
        {files.length > 0 && (
          <div className="flex items-center gap-4 mb-6 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}>
              <span style={{ color: "#E8DCC8", fontWeight: 600 }}>{files.length}</span> file{files.length !== 1 ? "s" : ""} queued
            </div>
            {aiDetectedCount > 0 && (
              <div className="flex items-center gap-1" style={{ fontSize: 12, color: "#F59E0B" }}>
                <Sparkles size={12} />
                <span>{aiDetectedCount} AI-generated detected</span>
              </div>
            )}
            {allProcessed && (
              <div className="flex items-center gap-1 ml-auto" style={{ fontSize: 12, color: "#34D399" }}>
                <CheckCircle size={12} />
                <span>All analyzed</span>
              </div>
            )}
          </div>
        )}

        {/* File cards */}
        <div className="flex flex-col gap-4">
          {files.map(file => {
            const key = `${file.name}-${file.size}-${file.lastModified}`;
            return (
              <FileIngestionCard
                key={key}
                file={file}
                meta={metaMap[key] ?? null}
                onRemove={() => removeFile(file)}
              />
            );
          })}
        </div>

        {/* Continue to registration */}
        {allProcessed && files.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", textAlign: "center" }}>
              Provenance data extracted. Ready to register on the Living Nexus Registry.
            </div>
            <Button
              onClick={() => navigate("/manifest")}
              className="px-8 py-3"
              style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#000", fontFamily: "'Cinzel', serif", letterSpacing: "0.12em", fontSize: 12, border: "none" }}
            >
              CONTINUE TO REGISTRATION <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
