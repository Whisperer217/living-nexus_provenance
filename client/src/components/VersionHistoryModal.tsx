/**
 * LIVING NEXUS — VersionHistoryModal
 * Shows the full version lineage of a work.
 * Each version is an immutable provenance record with its own WID.
 * The owner can also upload a new version from this modal.
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History, Upload, Shield, Clock, ChevronRight, Play,
  Loader2, CheckCircle, AlertCircle, Plus, X,
} from "lucide-react";

interface VersionHistoryModalProps {
  songId: number;
  songTitle: string;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AI_LABELS: Record<string, string> = {
  original: "Human-Made",
  ai_assisted: "AI-Assisted",
  ai_generated: "AI-Generated",
};

export function VersionHistoryModal({
  songId,
  songTitle,
  isOwner,
  open,
  onClose,
}: VersionHistoryModalProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Fetch version list
  const { data: versions = [], isLoading } = trpc.versions.list.useQuery(
    { songId },
    { enabled: open }
  );

  // Upload new version state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [aiDisclosure, setAiDisclosure] = useState<"original" | "ai_assisted" | "ai_generated">("original");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.versions.upload.useMutation({
    onSuccess: (data) => {
      toast.success(`Version ${data.versionNumber} uploaded — WID: ${data.witnessId}`);
      utils.versions.list.invalidate({ songId });
      utils.songs.mySongs.invalidate();
      setShowUpload(false);
      setUploadFile(null);
      setVersionLabel("");
      setChangeNote("");
      setUploading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
      setUploading(false);
    },
  });

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadMutation.mutateAsync({
        songId,
        fileBase64: base64,
        fileMimeType: uploadFile.type || "audio/mpeg",
        fileName: uploadFile.name,
        versionLabel: versionLabel.trim() || undefined,
        changeNote: changeNote.trim() || undefined,
        aiDisclosure,
      });
    };
    reader.readAsDataURL(uploadFile);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{
          background: "oklch(0.10 0.04 265)",
          border: "1px solid oklch(0.84 0.155 85 / 0.25)",
          color: "#f1f5f9",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-lg"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}
          >
            <History size={18} style={{ color: "oklch(0.84 0.155 85)" }} />
            Version History
          </DialogTitle>
          <p className="text-sm mt-1" style={{ color: "oklch(0.60 0.03 280)" }}>
            {songTitle}
          </p>
        </DialogHeader>

        {/* Upload new version panel */}
        {isOwner && (
          <div className="mb-4">
            {!showUpload ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                style={{
                  borderColor: "oklch(0.84 0.155 85 / 0.4)",
                  color: "oklch(0.84 0.155 85)",
                  background: "oklch(0.84 0.155 85 / 0.06)",
                }}
                onClick={() => setShowUpload(true)}
              >
                <Plus size={14} />
                Upload New Version
              </Button>
            ) : (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.13 0.05 270)",
                  border: "1px solid oklch(0.84 0.155 85 / 0.2)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>
                    Upload New Version
                  </p>
                  <button onClick={() => { setShowUpload(false); setUploadFile(null); }}>
                    <X size={14} style={{ color: "oklch(0.55 0.03 280)" }} />
                  </button>
                </div>

                {/* File picker */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: "oklch(0.16 0.04 270)", border: "1px dashed oklch(0.84 0.155 85 / 0.3)" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} style={{ color: "oklch(0.84 0.155 85)" }} />
                    <span className="text-sm" style={{ color: uploadFile ? "#f1f5f9" : "oklch(0.55 0.03 280)" }}>
                      {uploadFile ? uploadFile.name : "Choose audio file (MP3, WAV, FLAC, M4A)"}
                    </span>
                  </div>
                </div>

                {/* Version label */}
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.03 280)" }}>Version Label (optional)</Label>
                  <Input
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="e.g. Final Master, Radio Edit, Acoustic Demo"
                    className="text-sm"
                    style={{ background: "oklch(0.14 0.04 270)", border: "1px solid oklch(0.84 0.155 85 / 0.2)", color: "#f1f5f9" }}
                  />
                </div>

                {/* Change note */}
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.03 280)" }}>Change Note (optional)</Label>
                  <Textarea
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="What changed in this version? e.g. Re-mastered with new compression, added bridge section…"
                    rows={2}
                    className="text-sm resize-none"
                    style={{ background: "oklch(0.14 0.04 270)", border: "1px solid oklch(0.84 0.155 85 / 0.2)", color: "#f1f5f9" }}
                  />
                </div>

                {/* AI disclosure */}
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: "oklch(0.60 0.03 280)" }}>AI Disclosure for this version</Label>
                  <Select value={aiDisclosure} onValueChange={(v) => setAiDisclosure(v as any)}>
                    <SelectTrigger
                      className="text-sm"
                      style={{ background: "oklch(0.14 0.04 270)", border: "1px solid oklch(0.84 0.155 85 / 0.2)", color: "#f1f5f9" }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: "#0d1520", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}>
                      <SelectItem value="original" className="text-white">Human-Made — No AI Used</SelectItem>
                      <SelectItem value="ai_assisted" className="text-white">AI-Assisted — Human + AI Tools</SelectItem>
                      <SelectItem value="ai_generated" className="text-white">AI-Generated — AI-Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full"
                  style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.09 0.04 265)", fontFamily: "'Cinzel', serif", fontWeight: 700 }}
                >
                  {uploading ? (
                    <><Loader2 size={14} className="animate-spin mr-2" />Uploading & Witnessing…</>
                  ) : (
                    <><Shield size={14} className="mr-2" />Upload & Witness Version</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Version list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "oklch(0.84 0.155 85)" }} />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <History size={32} className="mx-auto mb-3 opacity-30" style={{ color: "oklch(0.84 0.155 85)" }} />
            <p className="text-sm" style={{ color: "oklch(0.55 0.03 280)" }}>
              No version history yet.
            </p>
            {isOwner && (
              <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.03 280)" }}>
                Upload a new version above to start the creative lineage.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-mono tracking-wider uppercase" style={{ color: "oklch(0.50 0.03 280)" }}>
              {versions.length} version{versions.length !== 1 ? "s" : ""} on record
            </p>
            {versions.map((v: typeof versions[0], idx: number) => (
              <div
                key={v.id}
                className="rounded-xl p-4"
                style={{
                  background: idx === 0
                    ? "oklch(0.13 0.06 270)"
                    : "oklch(0.11 0.04 265)",
                  border: idx === 0
                    ? "1px solid oklch(0.84 0.155 85 / 0.3)"
                    : "1px solid oklch(0.84 0.155 85 / 0.08)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Version number + label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{
                          background: idx === 0 ? "oklch(0.84 0.155 85 / 0.15)" : "oklch(0.84 0.155 85 / 0.06)",
                          color: idx === 0 ? "oklch(0.84 0.155 85)" : "oklch(0.65 0.08 280)",
                          border: `1px solid ${idx === 0 ? "oklch(0.84 0.155 85 / 0.4)" : "oklch(0.84 0.155 85 / 0.15)"}`,
                        }}
                      >
                        v{v.versionNumber}
                      </span>
                      {idx === 0 && (
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ background: "oklch(0.55 0.18 145 / 0.15)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.35)" }}
                        >
                          CURRENT
                        </span>
                      )}
                      <span className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                        {v.versionLabel || `Version ${v.versionNumber}`}
                      </span>
                    </div>

                    {/* WID */}
                    {v.witnessId && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield size={11} style={{ color: "oklch(0.84 0.155 85 / 0.7)" }} />
                        <span className="text-[11px] font-mono" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }}>
                          {v.witnessId}
                        </span>
                      </div>
                    )}

                    {/* Change note */}
                    {v.changeNote && (
                      <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.03 280)" }}>
                        {v.changeNote}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.50 0.03 280)" }}>
                        <Clock size={10} />
                        {fmtDate(v.createdAt)}
                      </span>
                      {v.aiDisclosure && (
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: v.aiDisclosure === "original"
                              ? "oklch(0.55 0.18 145 / 0.12)"
                              : v.aiDisclosure === "ai_assisted"
                              ? "oklch(0.84 0.155 85 / 0.10)"
                              : "oklch(0.65 0.2 300 / 0.12)",
                            color: v.aiDisclosure === "original"
                              ? "oklch(0.65 0.18 145)"
                              : v.aiDisclosure === "ai_assisted"
                              ? "oklch(0.84 0.155 85)"
                              : "oklch(0.65 0.2 300)",
                          }}
                        >
                          {AI_LABELS[v.aiDisclosure] ?? v.aiDisclosure}
                        </span>
                      )}
                      {fmtSize(v.fileSizeBytes) && (
                        <span className="text-[11px]" style={{ color: "oklch(0.50 0.03 280)" }}>
                          {fmtSize(v.fileSizeBytes)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Play this version */}
                  <a
                    href={v.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                    style={{ background: "oklch(0.84 0.155 85 / 0.12)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
                    title={`Play version ${v.versionNumber}`}
                  >
                    <Play size={12} style={{ color: "oklch(0.84 0.155 85)" }} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctrine note */}
        <div
          className="mt-4 p-3 rounded-lg text-xs"
          style={{
            background: "oklch(0.84 0.155 85 / 0.05)",
            border: "1px solid oklch(0.84 0.155 85 / 0.12)",
            color: "oklch(0.55 0.03 280)",
          }}
        >
          <Shield size={11} className="inline mr-1.5" style={{ color: "oklch(0.84 0.155 85 / 0.5)" }} />
          Every version is permanently witnessed with its own WID. Old versions are never deleted — they are preserved as immutable provenance records in the Living Nexus archive.
        </div>
      </DialogContent>
    </Dialog>
  );
}
