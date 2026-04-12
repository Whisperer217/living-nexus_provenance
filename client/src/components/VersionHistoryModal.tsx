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
          background: "#2C3438",
          border: "1px solid rgba(203,177,131,0.22)",
          color: "#f1f5f9",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-lg"
            style={{ fontFamily: "'Cinzel', serif", color: "#CBB183" }}
          >
            <History size={18} style={{ color: "#CBB183" }} />
            Version History
          </DialogTitle>
          <p className="text-sm mt-1" style={{ color: "#AA8E64" }}>
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
                  borderColor: "rgba(203,177,131,0.35)",
                  color: "#CBB183",
                  background: "rgba(203,177,131,0.06)",
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
                  background: "#2C3438",
                  border: "1px solid rgba(203,177,131,0.18)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: "#CBB183", fontFamily: "'Cinzel', serif" }}>
                    Upload New Version
                  </p>
                  <button type="button" onClick={() => { setShowUpload(false); setUploadFile(null); }}>
                    <X size={14} style={{ color: "#AA8E64" }} />
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
                    style={{ background: "#2C3438", border: "1px dashed rgba(203,177,131,0.28)" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} style={{ color: "#CBB183" }} />
                    <span className="text-sm" style={{ color: uploadFile ? "#f1f5f9" : "#AA8E64" }}>
                      {uploadFile ? uploadFile.name : "Choose audio file (MP3, WAV, FLAC, M4A)"}
                    </span>
                  </div>
                </div>

                {/* Version label */}
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: "#AA8E64" }}>Version Label (optional)</Label>
                  <Input
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="e.g. Final Master, Radio Edit, Acoustic Demo"
                    className="text-sm"
                    style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.18)", color: "#f1f5f9" }}
                  />
                </div>

                {/* Change note */}
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: "#AA8E64" }}>Change Note (optional)</Label>
                  <Textarea
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="What changed in this version? e.g. Re-mastered with new compression, added bridge section…"
                    rows={2}
                    className="text-sm resize-none"
                    style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.18)", color: "#f1f5f9" }}
                  />
                </div>

                {/* AI disclosure */}
                <div className="space-y-1">
                  <Label className="text-xs" style={{ color: "#AA8E64" }}>AI Disclosure for this version</Label>
                  <Select value={aiDisclosure} onValueChange={(v) => setAiDisclosure(v as any)}>
                    <SelectTrigger
                      className="text-sm"
                      style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.18)", color: "#f1f5f9" }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.18)" }}>
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
                  style={{ background: "#CBB183", color: "#2C3438", fontFamily: "'Cinzel', serif", fontWeight: 700 }}
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
            <Loader2 size={24} className="animate-spin" style={{ color: "#CBB183" }} />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <History size={32} className="mx-auto mb-3 opacity-30" style={{ color: "#CBB183" }} />
            <p className="text-sm" style={{ color: "#AA8E64" }}>
              No version history yet.
            </p>
            {isOwner && (
              <p className="text-xs mt-1" style={{ color: "#AA8E64" }}>
                Upload a new version above to start the creative lineage.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-mono tracking-wider uppercase" style={{ color: "#AA8E64" }}>
              {versions.length} version{versions.length !== 1 ? "s" : ""} on record
            </p>
            {versions.map((v: typeof versions[0], idx: number) => (
              <div
                key={v.id}
                className="rounded-xl p-4"
                style={{
                  background: idx === 0
                    ? "#2C3438"
                    : "#2C3438",
                  border: idx === 0
                    ? "1px solid rgba(203,177,131,0.28)"
                    : "1px solid rgba(203,177,131,0.08)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Version number + label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{
                          background: idx === 0 ? "rgba(203,177,131,0.12)" : "rgba(203,177,131,0.06)",
                          color: idx === 0 ? "#CBB183" : "#AA8E64",
                          border: `1px solid ${idx === 0 ? "rgba(203,177,131,0.35)" : "rgba(203,177,131,0.12)"}`,
                        }}
                      >
                        v{v.versionNumber}
                      </span>
                      {idx === 0 && (
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.35)" }}
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
                        <Shield size={11} style={{ color: "rgba(230,205,174,0.7)" }} />
                        <span className="text-[11px] font-mono" style={{ color: "rgba(230,205,174,0.7)" }}>
                          {v.witnessId}
                        </span>
                      </div>
                    )}

                    {/* Change note */}
                    {v.changeNote && (
                      <p className="text-xs mb-2" style={{ color: "#AA8E64" }}>
                        {v.changeNote}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "#AA8E64" }}>
                        <Clock size={10} />
                        {fmtDate(v.createdAt)}
                      </span>
                      {v.aiDisclosure && (
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: v.aiDisclosure === "original"
                              ? "rgba(74,222,128,0.12)"
                              : v.aiDisclosure === "ai_assisted"
                              ? "rgba(203,177,131,0.10)"
                              : "rgba(203,177,131,0.10)",
                            color: v.aiDisclosure === "original"
                              ? "#4ADE80"
                              : v.aiDisclosure === "ai_assisted"
                              ? "#CBB183"
                              : "#CBB183",
                          }}
                        >
                          {AI_LABELS[v.aiDisclosure] ?? v.aiDisclosure}
                        </span>
                      )}
                      {fmtSize(v.fileSizeBytes) && (
                        <span className="text-[11px]" style={{ color: "#AA8E64" }}>
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
                    style={{ background: "rgba(203,177,131,0.10)", border: "1px solid rgba(203,177,131,0.28)" }}
                    title={`Play version ${v.versionNumber}`}
                  >
                    <Play size={12} style={{ color: "#CBB183" }} />
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
            background: "rgba(230,205,174,0.05)",
            border: "1px solid rgba(203,177,131,0.10)",
            color: "#AA8E64",
          }}
        >
          <Shield size={11} className="inline mr-1.5" style={{ color: "rgba(203,177,131,0.45)" }} />
          Every version is permanently witnessed with its own WID. Old versions are never deleted — they are preserved as immutable provenance records in the Living Nexus archive.
        </div>
      </DialogContent>
    </Dialog>
  );
}
