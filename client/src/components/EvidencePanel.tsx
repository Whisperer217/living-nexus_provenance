/**
 * EvidencePanel — Witnessed Work Layer
 *
 * Phase 149b: "The manifestation IS the evidence."
 *
 * When no supplementary proof artifacts have been attached yet,
 * the panel renders an embedded manifestation snapshot instead of
 * an empty state. The work itself — cover art, testimony, WID —
 * is surfaced as the primary evidence.
 *
 * Supplementary evidence types (owner-addable):
 *   file  — S3-uploaded artifact (PDF, audio, stems, contract)
 *   link  — External URL (registration, reference, contract)
 *   note  — Plain-text memo timestamped to the chain
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText, Link2, StickyNote, Plus, ChevronDown, ChevronUp,
  Trash2, Hash, ExternalLink, ShieldCheck, Loader2, Play, BookOpen, Music2,
} from "lucide-react";

interface ManifestationSnapshot {
  coverArtUrl?: string | null;
  fileUrl?: string | null;
  headlineCaption?: string | null;
  description?: string | null;
  witnessId?: string | null;
  title?: string | null;
  contentType?: string | null;
  /** pages JSON string for comics/books */
  pagesJson?: string | null;
}

interface EvidencePanelProps {
  songId: number;
  isOwner: boolean;
  /** Optional: pass the work's manifestation data to show embedded snapshot when evidence list is empty */
  manifestation?: ManifestationSnapshot;
  /** Optional: callback to open the reader for comic/book works */
  onOpenReader?: () => void;
  /** Optional: callback to play audio for song works */
  onPlay?: () => void;
}

const TYPE_META = {
  file: { icon: FileText, label: "File", color: "rgba(196,154,40,0.8)" },
  link: { icon: Link2, label: "Link", color: "rgba(96,165,250,0.8)" },
  note: { icon: StickyNote, label: "Note", color: "rgba(167,243,208,0.8)" },
};

function fmtDate(ts: Date | string | number) {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

/** Embedded manifestation snapshot — shown when no supplementary proof artifacts exist */
function ManifestationSnapshotBlock({
  m,
  onPlay,
  onOpenReader,
}: {
  m: ManifestationSnapshot;
  onPlay?: () => void;
  onOpenReader?: () => void;
}) {
  const isComic = m.contentType === "comic" || m.contentType === "manuscript";
  const isAudio = !isComic && (m.fileUrl || m.contentType === "audio");
  const hasPages = (() => {
    try { return m.pagesJson ? JSON.parse(m.pagesJson).length > 0 : false; } catch { return false; }
  })();

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ border: "1px solid rgba(196,154,40,0.18)", background: "rgba(255,255,255,0.02)" }}
    >
      {/* Cover art strip */}
      {m.coverArtUrl && (
        <div className="relative" style={{ aspectRatio: "16/6", overflow: "hidden" }}>
          <img
            src={m.coverArtUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.55) saturate(0.8)" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 100%)" }} />
          {/* Primary CTA overlay */}
          {(isAudio && onPlay) && (
            <button
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center gap-2 group"
              aria-label="Play this work"
            >
              <div
                className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 group-hover:scale-105"
                style={{
                  background: "rgba(196,154,40,0.85)",
                  border: "1px solid rgba(196,154,40,0.5)",
                  boxShadow: "0 4px 20px rgba(196,154,40,0.2)",
                }}
              >
                <Play size={14} fill="#0A0B08" style={{ color: "#0A0B08" }} className="ml-0.5" />
                <span className="text-xs font-heading font-bold tracking-widest" style={{ color: "#0A0B08" }}>PLAY NOW</span>
              </div>
            </button>
          )}
          {(isComic && (onOpenReader || hasPages)) && (
            <button
              onClick={onOpenReader}
              className="absolute inset-0 flex items-center justify-center gap-2 group"
              aria-label="Read this work"
            >
              <div
                className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 group-hover:scale-105"
                style={{
                  background: "rgba(196,154,40,0.85)",
                  border: "1px solid rgba(196,154,40,0.5)",
                  boxShadow: "0 4px 20px rgba(196,154,40,0.2)",
                }}
              >
                <BookOpen size={14} style={{ color: "#0A0B08" }} />
                <span className="text-xs font-heading font-bold tracking-widest" style={{ color: "#0A0B08" }}>READ NOW</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Testimony excerpt + WID */}
      <div className="px-4 py-3 space-y-2">
        {/* Content type badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)" }}>
            {isComic
              ? <BookOpen size={10} style={{ color: "rgba(196,154,40,0.7)" }} />
              : <Music2 size={10} style={{ color: "rgba(196,154,40,0.7)" }} />}
            <span className="text-[10px] font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.7)" }}>
              {m.contentType ?? "Work"} — Primary Manifestation
            </span>
          </div>
          {m.witnessId && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
              style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <Hash size={9} style={{ color: "rgba(74,222,128,0.7)" }} />
              <span className="text-[10px]" style={{ color: "rgba(74,222,128,0.7)" }}>{m.witnessId.slice(0, 20)}…</span>
            </div>
          )}
        </div>

        {/* Testimony excerpt */}
        {(m.headlineCaption || m.description) && (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--ln-smoke)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
          >
            "{(m.headlineCaption || m.description || "").slice(0, 200)}{((m.headlineCaption || m.description || "").length > 200 ? "…" : "")}"
          </p>
        )}

        {/* Framing statement */}
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          The manifestation itself is the primary evidence of this work's existence and authorship.
          Supplementary proof artifacts (drafts, stems, contracts) can be attached below by the creator.
        </p>
      </div>
    </div>
  );
}

export function EvidencePanel({ songId, isOwner, manifestation, onPlay, onOpenReader }: EvidencePanelProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Default collapsed — keeps the page compact; user expands to view proof artifacts
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"file" | "link" | "note">("file");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNote, setFormNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = trpc.evidence.list.useQuery(
    { songId },
    { staleTime: 30_000 }
  );

  const addMutation = trpc.evidence.add.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate({ songId });
      setShowForm(false);
      setFormTitle("");
      setFormUrl("");
      setFormNote("");
      toast.success("Added to Witnessed Work.");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.evidence.uploadFile.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.evidence.delete.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate({ songId });
      toast.success("Witnessed Work item removed.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File must be under 16 MB.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadMutation.mutateAsync({
        songId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
      });
      setFormUrl(result.url);
      if (!formTitle) setFormTitle(file.name.replace(/\.[^.]+$/, ""));
      toast.success("File uploaded — hash computed.");
      await addMutation.mutateAsync({
        songId,
        type: "file",
        title: formTitle || file.name.replace(/\.[^.]+$/, ""),
        url: result.url,
        hash: result.hash,
        metadataJson: { filename: file.name, size: file.size, mimeType: file.type },
      });
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error("Title is required."); return; }
    if (formType === "link" && !formUrl.trim()) { toast.error("URL is required for links."); return; }
    if (formType === "note" && !formNote.trim()) { toast.error("Note body is required."); return; }
    await addMutation.mutateAsync({
      songId,
      type: formType,
      title: formTitle.trim(),
      url: formType === "link" ? formUrl.trim() : undefined,
      noteBody: formType === "note" ? formNote.trim() : undefined,
    });
  };

  // Badge count: show items count if any, otherwise show "Manifestation" if we have a snapshot
  const badgeCount = items.length > 0 ? items.length : (manifestation ? null : 0);

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}
    >
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: "rgba(196,154,40,0.8)" }} />
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            Witnessed Work
          </span>
          {items.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(196,154,40,0.1)",
                color: "rgba(196,154,40,0.7)",
                border: "1px solid rgba(196,154,40,0.2)",
              }}
            >
              {items.length} artifact{items.length !== 1 ? "s" : ""}
            </span>
          )}
          {items.length === 0 && manifestation && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(74,222,128,0.06)",
                color: "rgba(74,222,128,0.6)",
                border: "1px solid rgba(74,222,128,0.2)",
              }}
            >
              Manifestation on record
            </span>
          )}
          <span className="text-xs ml-1" style={{ color: "var(--ln-smoke)" }}>
            {expanded ? "Collapse" : "Expand"}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: "#E2E8F0" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "#E2E8F0" }} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {/* Manifestation snapshot — shown when no supplementary artifacts exist */}
          {!isLoading && items.length === 0 && manifestation && (
            <ManifestationSnapshotBlock
              m={manifestation}
              onPlay={onPlay}
              onOpenReader={onOpenReader}
            />
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-2 py-4" style={{ color: "var(--ln-smoke)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {/* Empty state — no manifestation data either */}
          {!isLoading && items.length === 0 && !manifestation && (
            <div
              className="rounded-xl px-4 py-6 text-center mb-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(196,154,40,0.15)" }}
            >
              <ShieldCheck className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(196,154,40,0.3)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--ln-parchment)" }}>
                No supplementary artifacts yet
              </p>
              <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                {isOwner
                  ? "Attach drafts, stems, contracts, or notes to strengthen this work's provenance chain."
                  : "The creator has not attached supplementary proof artifacts to this work yet."}
              </p>
            </div>
          )}

          {/* Supplementary artifact list */}
          {items.length > 0 && (
            <div className="space-y-2 mb-4">
              {items.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(196,154,40,0.1)",
                    }}
                  >
                    <div
                      className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg"
                      style={{ background: "rgba(196,154,40,0.07)" }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>
                          {item.title}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide"
                          style={{
                            background: "rgba(196,154,40,0.06)",
                            color: meta.color,
                            border: `1px solid ${meta.color.replace("0.8", "0.25")}`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>

                      {item.type === "note" && item.noteBody && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                          {item.noteBody}
                        </p>
                      )}

                      {item.url && item.type !== "note" && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs mt-1 hover:underline"
                          style={{ color: "rgba(96,165,250,0.8)" }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {item.type === "file" ? "View file" : item.url.slice(0, 48) + (item.url.length > 48 ? "…" : "")}
                        </a>
                      )}

                      {item.hash && (
                        <div
                          className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono"
                          style={{
                            background: "rgba(74,222,128,0.06)",
                            border: "1px solid rgba(74,222,128,0.2)",
                            color: "rgba(74,222,128,0.7)",
                          }}
                          title={`SHA-256: ${item.hash}`}
                        >
                          <Hash className="w-2.5 h-2.5" />
                          {item.hash.slice(0, 16)}…
                        </div>
                      )}

                      <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Added {fmtDate(item.createdAt)}
                      </p>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Remove this artifact from the chain?")) {
                            deleteMutation.mutate({ id: item.id });
                          }
                        }}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-all hover:bg-red-500/10"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                        aria-label="Delete artifact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add artifact — owner only */}
          {isOwner && !showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="gap-1.5"
              style={{
                borderColor: "rgba(196,154,40,0.3)",
                color: "rgba(196,154,40,0.8)",
                background: "transparent",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Proof Artifact
            </Button>
          )}

          {/* Inline Add Form */}
          {isOwner && showForm && (
            <div
              className="rounded-xl p-4 mt-2"
              style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.2)" }}
            >
              <p
                className="text-xs font-semibold mb-3 uppercase tracking-widest"
                style={{ color: "rgba(196,154,40,0.7)" }}
              >
                Add Proof Artifact
              </p>

              <div className="flex gap-2 mb-3">
                {(["file", "link", "note"] as const).map((t) => {
                  const m = TYPE_META[t];
                  const Icon = m.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{
                        background: formType === t ? "rgba(196,154,40,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${formType === t ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: formType === t ? "rgba(196,154,40,0.9)" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <Input
                placeholder="Title (e.g. Draft v1, Original Lyrics, Contract)"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="mb-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}
              />

              {formType === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="evidence-file-input"
                  />
                  <label
                    htmlFor="evidence-file-input"
                    className="flex items-center justify-center gap-2 w-full rounded-lg py-3 text-sm cursor-pointer transition-all"
                    style={{
                      background: "rgba(196,154,40,0.05)",
                      border: "1px dashed rgba(196,154,40,0.3)",
                      color: "rgba(196,154,40,0.7)",
                    }}
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    ) : (
                      <><FileText className="w-4 h-4" /> Choose file (max 16 MB)</>
                    )}
                  </label>
                </div>
              )}

              {formType === "link" && (
                <Input
                  placeholder="https://…"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="mb-2 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}
                />
              )}

              {formType === "note" && (
                <Textarea
                  placeholder="Write a note…"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  rows={3}
                  className="mb-2 text-sm resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}
                />
              )}

              <div className="flex gap-2 mt-3">
                {formType !== "file" && (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={addMutation.isPending}
                    style={{ background: "rgba(196,154,40,0.85)", color: "#0A0B08" }}
                  >
                    {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowForm(false); setFormTitle(""); setFormUrl(""); setFormNote(""); }}
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ln-smoke)" }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
