/**
 * SaveQueueAsPlaylistModal
 * Cathedral-aesthetic dialog for converting the current session queue into a
 * named, ownable playlist artifact with optional AI-generated cover art.
 */
import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  X, Wand2, RefreshCw, Music2, Loader2, Check, ImageIcon,
} from "lucide-react";

const GOLD = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.18)";
const BORDER = `1px solid rgba(201,168,76,0.28)`;

interface Props {
  onClose: () => void;
}

function trackToSongId(t: Track): number | null {
  const n = parseInt(t.id, 10);
  return isNaN(n) ? null : n;
}

export function SaveQueueAsPlaylistModal({ onClose }: Props) {
  const { allTracks } = usePlayer();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const tracks = allTracks();
  const validSongIds = tracks.map(trackToSongId).filter((id): id is number => id !== null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateCoverMutation = trpc.playlists.generateCover.useMutation();
  const saveQueueMutation = trpc.playlists.saveQueueAsPlaylist.useMutation();
  const utils = trpc.useUtils();

  // Auto-build a cover prompt from track titles if user hasn't typed one
  const autoCoverPrompt = useCallback(() => {
    if (coverPrompt.trim()) return coverPrompt;
    const titles = tracks.slice(0, 5).map(t => t.title).join(", ");
    return `A luminous cathedral-aesthetic music collection featuring: ${titles}. Sacred geometry, gold light, deep shadows.`;
  }, [coverPrompt, tracks]);

  const handleGenerateCover = useCallback(async () => {
    setGeneratingCover(true);
    try {
      // Pass existing cover art URLs from tracks as reference images
      const refUrls = tracks
        .slice(0, 4)
        .map(t => t.artUrl)
        .filter((u): u is string => !!u);
      const result = await generateCoverMutation.mutateAsync({
        prompt: autoCoverPrompt(),
        referenceImageUrls: refUrls,
      });
      setCoverUrl(result.url ?? null);
    } catch (e) {
      toast.error("Cover generation failed. Try again.");
    } finally {
      setGeneratingCover(false);
    }
  }, [generateCoverMutation, autoCoverPrompt, tracks]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error("Please enter a playlist name."); return; }
    if (validSongIds.length === 0) { toast.error("No valid tracks in queue."); return; }
    setSaving(true);
    try {
      const result = await saveQueueMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        coverArtUrl: coverUrl ?? undefined,
        isPublic,
        songIds: validSongIds,
      });
      await utils.playlists.mine.invalidate();
      toast.success(`"${name.trim()}" saved to your Collections`, { duration: 3500 });
      onClose();
      navigate(`/profile?tab=collections`);
    } catch (e) {
      toast.error("Failed to save playlist. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, description, coverUrl, isPublic, validSongIds, saveQueueMutation, utils, onClose, navigate]);

  if (!user) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 99998, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md mx-auto rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0e1214 0%, #0a0c0e 100%)",
          border: BORDER,
          boxShadow: "0 0 60px rgba(201,168,76,0.12), 0 24px 80px rgba(0,0,0,0.8)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: BORDER }}>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: GOLD, opacity: 0.7 }}>
              Sanctify the Queue
            </p>
            <h2 className="text-[15px] font-semibold mt-0.5" style={{ color: "#f8f4ec", fontFamily: "'Cinzel', serif" }}>
              Save as Playlist
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: "rgba(248,244,236,0.5)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Cover art section */}
          <div className="flex gap-4 items-start">
            {/* Cover preview */}
            <div
              className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: GOLD_DIM, border: BORDER }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Playlist cover" className="w-full h-full object-cover" />
              ) : (
                <Music2 size={28} style={{ color: GOLD, opacity: 0.5 }} />
              )}
            </div>

            {/* Cover generation controls */}
            <div className="flex-1 space-y-2">
              <label className="block text-[10px] tracking-[0.15em] uppercase" style={{ color: GOLD, opacity: 0.7 }}>
                Cover Prompt
              </label>
              <textarea
                value={coverPrompt}
                onChange={e => setCoverPrompt(e.target.value)}
                placeholder="Describe the visual essence of this collection…"
                rows={2}
                className="w-full text-[12px] rounded-lg px-3 py-2 resize-none outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: BORDER,
                  color: "#f8f4ec",
                  caretColor: GOLD,
                }}
              />
              <button
                onClick={handleGenerateCover}
                disabled={generatingCover}
                className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: GOLD_DIM,
                  border: BORDER,
                  color: GOLD,
                }}
              >
                {generatingCover ? (
                  <><Loader2 size={12} className="animate-spin" /> Generating…</>
                ) : coverUrl ? (
                  <><RefreshCw size={12} /> Regenerate</>
                ) : (
                  <><Wand2 size={12} /> Generate Cover</>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(201,168,76,0.12)" }} />

          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.15em] uppercase" style={{ color: GOLD, opacity: 0.7 }}>
              Playlist Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name this collection…"
              maxLength={128}
              className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: name.trim() ? `1px solid rgba(201,168,76,0.5)` : BORDER,
                color: "#f8f4ec",
                caretColor: GOLD,
              }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.15em] uppercase" style={{ color: GOLD, opacity: 0.7 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is the spirit of this collection?"
              rows={2}
              maxLength={500}
              className="w-full text-[12px] rounded-lg px-3 py-2 resize-none outline-none transition-colors"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: BORDER,
                color: "#f8f4ec",
                caretColor: GOLD,
              }}
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px]" style={{ color: "#f8f4ec" }}>Make Public</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(248,244,236,0.4)" }}>
                Visible on your creator profile
              </p>
            </div>
            <button
              onClick={() => setIsPublic(v => !v)}
              className="w-11 h-6 rounded-full transition-all relative"
              style={{
                background: isPublic ? GOLD : "rgba(255,255,255,0.1)",
                border: isPublic ? "none" : BORDER,
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: isPublic ? "#0a0c0e" : "rgba(255,255,255,0.6)",
                  left: isPublic ? "calc(100% - 1.375rem)" : "0.125rem",
                }}
              />
            </button>
          </div>

          {/* Track count summary */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.03)", border: BORDER }}
          >
            <Music2 size={13} style={{ color: GOLD, opacity: 0.6 }} />
            <span className="text-[11px]" style={{ color: "rgba(248,244,236,0.5)" }}>
              {validSongIds.length} track{validSongIds.length !== 1 ? "s" : ""} from current queue
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || validSongIds.length === 0}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: saving ? GOLD_DIM : `linear-gradient(135deg, ${GOLD} 0%, #a07830 100%)`,
              color: saving ? GOLD : "#0a0c0e",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.08em",
            }}
          >
            {saving ? (
              <><Loader2 size={15} className="animate-spin" /> Sanctifying…</>
            ) : (
              <><Check size={15} /> Sanctify This Queue</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
