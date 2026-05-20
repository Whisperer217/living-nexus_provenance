/**
 * /admin/physical — Physical Distribution Export
 * Select songs → package as branded ZIP → download for USB thumb drives.
 * LIMIT: 10 tracks per export.
 * Each track includes: audio, cover art, lyrics sheet, WID provenance doc.
 *
 * Command Domains LLC · BDDT Publishing
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

import {
  Search, CheckSquare, Square, Package,
  Music, Loader2, AlertCircle, Usb,
  FileText, Shield, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const GOLD = "#C9A84C";
const CARD_BG = "rgba(15,15,20,0.85)";
const BORDER_COLOR = "rgba(255,255,255,0.08)";
const MAX_EXPORT = 10;

interface SongRow {
  song: {
    id: number;
    title: string;
    witnessId: string | null;
    genre: string | null;
    contentType: string | null;
    status: string;
    fileUrl: string | null;
    coverArtUrl: string | null;
    durationSeconds: number | null;
    lyricsText: string | null;
    createdAt: string;
  };
  creator: {
    id: number;
    name: string | null;
    artistHandle: string | null;
    profilePhotoUrl: string | null;
  } | null;
}

export default function PhysicalDistributionPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Gate: admin-only
  if (!authLoading && (!user || user.role !== "admin")) {
    navigate("/");
    return null;
  }

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/physical-export/songs?search=${encodeURIComponent(search)}&limit=200`);
      if (!res.ok) throw new Error("Failed to load songs");
      const data = await res.json();
      setSongs(data.songs || []);
      setLoaded(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_EXPORT) {
          toast.error(`Maximum ${MAX_EXPORT} tracks per export. Deselect one first.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      const first10 = songs.filter(s => !!s.song.fileUrl).slice(0, MAX_EXPORT);
      setSelectedIds(new Set(first10.map(s => s.song.id)));
      if (songs.filter(s => !!s.song.fileUrl).length > MAX_EXPORT) {
        toast.info(`Selected first ${MAX_EXPORT} tracks (maximum per export).`);
      }
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error("No songs selected — check the boxes next to songs you want to export.");
      return;
    }
    if (selectedIds.size > MAX_EXPORT) {
      toast.error(`Maximum ${MAX_EXPORT} tracks per export. You have ${selectedIds.size} selected.`);
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/admin/physical-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ songIds: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }
      // Download the ZIP
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "LivingNexus_Physical.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${selectedIds.size} tracks packaged with full documentation. Drag the ZIP onto your USB.`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return "—";
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const atLimit = selectedIds.size >= MAX_EXPORT;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Usb size={28} color={GOLD} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "var(--font-heading, serif)" }}>
            Physical Distribution
          </h1>
        </div>
        <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 8 }}>
          Select songs → Export ZIP → Drag onto USB. Each track includes ID3 tags, cover art, WID certificate, and branded README.
        </p>

        {/* Per-track documentation info */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24,
          padding: "12px 16px", background: "rgba(201,168,76,0.05)",
          border: `1px solid rgba(201,168,76,0.15)`, borderRadius: 8,
        }}>
          <span style={{ fontSize: 11, color: GOLD, display: "flex", alignItems: "center", gap: 4 }}>
            <Music size={12} /> Audio (ID3-tagged)
          </span>
          <span style={{ fontSize: 11, color: GOLD, display: "flex", alignItems: "center", gap: 4 }}>
            <ImageIcon size={12} /> Cover Art
          </span>
          <span style={{ fontSize: 11, color: GOLD, display: "flex", alignItems: "center", gap: 4 }}>
            <FileText size={12} /> Lyrics Sheet
          </span>
          <span style={{ fontSize: 11, color: GOLD, display: "flex", alignItems: "center", gap: 4 }}>
            <Shield size={12} /> WID Provenance
          </span>
          <span style={{ fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>
            Limit: {MAX_EXPORT} tracks per export
          </span>
        </div>

        {/* Search + Load */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Input
            placeholder="Search by title or WID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadSongs()}
            style={{ maxWidth: 320, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER_COLOR}`, color: "#fff" }}
          />
          <Button
            onClick={loadSongs}
            disabled={loading}
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER_COLOR}`, color: "#fff" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span style={{ marginLeft: 6 }}>Load Songs</span>
          </Button>
        </div>

        {/* Actions bar */}
        {loaded && songs.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
            padding: "12px 16px", background: CARD_BG, borderRadius: 8,
            border: `1px solid ${BORDER_COLOR}`,
            flexWrap: "wrap",
          }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              style={{ color: GOLD, fontSize: 13 }}
            >
              {selectedIds.size > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
              <span style={{ marginLeft: 6 }}>
                {selectedIds.size > 0 ? "Clear All" : `Select First ${MAX_EXPORT}`}
              </span>
            </Button>

            <span style={{ color: atLimit ? GOLD : "#94A3B8", fontSize: 13, fontWeight: atLimit ? 600 : 400 }}>
              {selectedIds.size} / {MAX_EXPORT} selected
              {atLimit && " (limit reached)"}
            </span>

            <div style={{ flex: 1 }} />

            <Button
              onClick={handleExport}
              disabled={exporting || selectedIds.size === 0}
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
                color: "#000",
                fontWeight: 600,
                fontSize: 13,
                opacity: selectedIds.size === 0 ? 0.4 : 1,
              }}
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ marginLeft: 6 }}>Packaging...</span>
                </>
              ) : (
                <>
                  <Package size={16} />
                  <span style={{ marginLeft: 6 }}>Export for USB ({selectedIds.size})</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Empty state */}
        {loaded && songs.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>
            <AlertCircle size={32} style={{ margin: "0 auto 12px" }} />
            <p>No songs found. Try a different search or clear the filter.</p>
          </div>
        )}

        {/* Song list */}
        {songs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {songs.map((row) => {
              const { song, creator } = row;
              const isSelected = selectedIds.has(song.id);
              const hasAudio = !!song.fileUrl;
              const hasLyrics = !!song.lyricsText;
              const creatorName = creator?.artistHandle
                ? `@${creator.artistHandle}`
                : (creator?.name ?? "Unknown");
              const isDisabled = !hasAudio || (atLimit && !isSelected);

              return (
                <div
                  key={song.id}
                  onClick={() => !isDisabled && toggleSelect(song.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: isSelected ? "rgba(201,168,76,0.08)" : CARD_BG,
                    border: `1px solid ${isSelected ? "rgba(201,168,76,0.3)" : BORDER_COLOR}`,
                    borderRadius: 6,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.4 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ flexShrink: 0 }}>
                    {isSelected ? (
                      <CheckSquare size={18} color={GOLD} />
                    ) : (
                      <Square size={18} color="#64748B" />
                    )}
                  </div>

                  {/* Cover art */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 4, overflow: "hidden",
                    background: "rgba(255,255,255,0.05)", flexShrink: 0,
                  }}>
                    {song.coverArtUrl ? (
                      <img src={song.coverArtUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <Music size={16} color="#64748B" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: "#fff",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {song.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>
                      {creatorName} · {song.genre || "—"} · {formatDuration(song.durationSeconds)}
                    </div>
                  </div>

                  {/* Documentation indicators */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {hasLyrics && (
                      <span title="Has lyrics" style={{
                        fontSize: 9, color: "#10B981", background: "rgba(16,185,129,0.1)",
                        padding: "2px 5px", borderRadius: 3,
                      }}>
                        LYR
                      </span>
                    )}
                    {song.witnessId && (
                      <span title="Has WID provenance" style={{
                        fontSize: 9, color: GOLD, background: "rgba(201,168,76,0.1)",
                        padding: "2px 5px", borderRadius: 3, fontFamily: "monospace",
                      }}>
                        WID
                      </span>
                    )}
                  </div>

                  {/* No audio indicator */}
                  {!hasAudio && (
                    <span style={{ fontSize: 10, color: "#EF4444" }}>No audio</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {loaded && songs.length > 0 && (
          <div style={{
            marginTop: 24, padding: "16px", background: CARD_BG,
            border: `1px solid ${BORDER_COLOR}`, borderRadius: 8,
            fontSize: 12, color: "#64748B", lineHeight: 1.6,
          }}>
            <strong style={{ color: "#94A3B8" }}>Per-Track Documentation:</strong><br />
            Each exported track folder contains: <code style={{ color: GOLD }}>track.mp3</code> (ID3-tagged with WID),{" "}
            <code style={{ color: GOLD }}>cover.jpg</code>,{" "}
            <code style={{ color: GOLD }}>lyrics.txt</code> (full lyrics sheet),{" "}
            <code style={{ color: GOLD }}>provenance.txt</code> (WID certificate with crypto proof),{" "}
            and <code style={{ color: GOLD }}>WID_Certificate.pdf</code> (if available).<br /><br />
            <strong style={{ color: "#94A3B8" }}>USB Drive Tip:</strong> Format as exFAT for cross-platform compatibility.
            Drag the extracted ZIP contents directly to the drive root.<br /><br />
            <strong style={{ color: "#94A3B8" }}>Limit:</strong> {MAX_EXPORT} tracks per export to keep file sizes manageable for USB duplication.
          </div>
        )}
      </div>
    </div>
  );
}
