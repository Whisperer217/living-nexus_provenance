import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { ImagePositioner } from "@/components/ImagePositioner";
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
import { X, Upload, Shield, Lock, Download, FileText, Video, BookOpen, RotateCcw, History, Plus, Trash2, ChevronDown, Link2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/* ── Lyrics editor utilities ──────────────────────────────────────────────── */
/** Rough syllable count per word using vowel-group heuristic */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  // Silent 'e' at end
  if (word.endsWith("e") && count > 1) count -= 1;
  return Math.max(1, count);
}
function lyricsStats(text: string): { lines: number; avgSyllables: number } {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { lines: 0, avgSyllables: 0 };
  const totalSyllables = lines.reduce((acc, line) => {
    const words = line.trim().split(/\s+/);
    return acc + words.reduce((s, w) => s + countSyllables(w), 0);
  }, 0);
  return { lines: lines.length, avgSyllables: Math.round(totalSyllables / lines.length) };
}
function lyricsStorageKey(songId: number | string): string {
  return `ln_lyrics_draft_${songId}`;
}

import {
  EDIT_GENRES as GENRES,
  MANUSCRIPT_CATEGORIES,
  COMIC_CATEGORIES,
} from "@shared/contentTypes";

const AI_CONSENT_LABELS: Record<string, string> = {
  prohibited: "Human-Made — No AI Training",
  permitted_attribution: "AI-Assisted — Attribution Required",
  permitted: "AI-Assisted Manifestation — Open Training",
};

const STATUS_LABELS: Record<string, string> = {
  Published: "Published — Visible to everyone",
  Draft: "Draft — Hidden from public",
  Unlisted: "Unlisted — Only via direct link",
  Deleted: "Deleted — Removed from platform",
};

const STATUS_COLORS: Record<string, string> = {
  Published: "#22c55e",
  Draft: "#f59e0b",
  Unlisted: "#a855f7",
  Deleted: "#ef4444",
};

interface Song {
  id: number;
  title: string;
  genre?: string | null;
  caption?: string | null;
  collectionTag?: string | null;
  coverArtUrl?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  aiConsent?: string | null;
  status: string;
  witnessId?: string | null;
  downloadPermission?: string | null;
  downloadTipThresholdCents?: number | null;
  lyricsText?: string | null;
  lyricsWid?: string | null;
  lyricsFileName?: string | null;
  lyricsAddedAt?: Date | string | null;
  videoUrl?: string | null;
  videoWitnessId?: string | null;
  creditsJson?: string | null;
  contentType?: string | null;
  parentSongId?: number | null;
}

interface EditTrackPanelProps {
  song: Song;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTrackPanel({ song, onClose, onSaved }: EditTrackPanelProps) {
  const isManuscript = song.contentType === "manuscript";
  const isComic = song.contentType === "comic";
  const isWritten = isManuscript || isComic; // non-music written works

  // Desktop: centered modal. Mobile: right-side sheet.
  const isMobile = useIsMobile();

  const [title, setTitle] = useState(song.title ?? "");
  const [caption, setCaption] = useState(song.caption ?? "");
  const [genre, setGenre] = useState(song.genre ?? "");
  const [collectionTag, setCollectionTag] = useState(song.collectionTag ?? "");
  const [coverArtUrl, setCoverArtUrl] = useState(song.coverArtUrl ?? "");
  const [coverPos, setCoverPos] = useState({ x: song.coverPositionX ?? 50, y: song.coverPositionY ?? 50 });
  const [showCoverPositioner, setShowCoverPositioner] = useState(false);
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">(
    (song.aiConsent as any) ?? "prohibited"
  );
  const [ownershipStatus, setOwnershipStatus] = useState<"full" | "partial">(
    (song as any).ownershipStatus ?? "full"
  );
  const [status, setStatus] = useState<"Draft" | "Published" | "Unlisted" | "Deleted">(
    (song.status as any) ?? "Published"
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadPermission, setDownloadPermission] = useState<"none" | "free" | "tipped">(
    (song.downloadPermission as any) ?? "none"
  );
  const [tipThresholdCents, setTipThresholdCents] = useState<number>(
    song.downloadTipThresholdCents ?? 179
  );
  // String state for the input field so backspace / free-form typing works
  const [tipThresholdInput, setTipThresholdInput] = useState<string>(
    ((song.downloadTipThresholdCents ?? 179) / 100).toFixed(2)
  );
  const [dlSaving, setDlSaving] = useState(false);
  const [lyrics, setLyrics] = useState(() => {
    // Restore unsaved draft from localStorage if present
    try {
      const draft = localStorage.getItem(lyricsStorageKey(song.id));
      if (draft !== null) return draft;
    } catch {}
    return song.lyricsText ?? "";
  });
  const [hasDraft, setHasDraft] = useState(() => {
    try { return localStorage.getItem(lyricsStorageKey(song.id)) !== null; } catch { return false; }
  });
  const [lyricsSaving, setLyricsSaving] = useState(false);
  // Undo/redo history for the lyrics editor
  const lyricsHistory = useRef<string[]>([song.lyricsText ?? ""]);
  const lyricsHistoryIdx = useRef<number>(0);
  const lyricsSkipPush = useRef<boolean>(false);

  const setLyricsWithHistory = (val: string) => {
    if (lyricsSkipPush.current) {
      lyricsSkipPush.current = false;
      setLyrics(val);
      return;
    }
    // Truncate forward history on new input
    lyricsHistory.current = lyricsHistory.current.slice(0, lyricsHistoryIdx.current + 1);
    lyricsHistory.current.push(val);
    // Cap at 200 entries
    if (lyricsHistory.current.length > 200) {
      lyricsHistory.current.shift();
    }
    lyricsHistoryIdx.current = lyricsHistory.current.length - 1;
    setLyrics(val);
    // Auto-save draft to localStorage
    try {
      localStorage.setItem(lyricsStorageKey(song.id), val);
      setHasDraft(true);
    } catch {}
  };

  const handleLyricsUndo = () => {
    if (lyricsHistoryIdx.current > 0) {
      lyricsHistoryIdx.current -= 1;
      lyricsSkipPush.current = true;
      setLyrics(lyricsHistory.current[lyricsHistoryIdx.current]);
    }
  };

  const handleLyricsRedo = () => {
    if (lyricsHistoryIdx.current < lyricsHistory.current.length - 1) {
      lyricsHistoryIdx.current += 1;
      lyricsSkipPush.current = true;
      setLyrics(lyricsHistory.current[lyricsHistoryIdx.current]);
    }
  };
  const [lyricsFile, setLyricsFile] = useState<File | null>(null);
  const [lyricsWid, setLyricsWid] = useState<string | null>(song.lyricsWid ?? null);
  const [lyricsFileName, setLyricsFileName] = useState<string | null>(song.lyricsFileName ?? null);
  const [lyricsAddedAt, setLyricsAddedAt] = useState<Date | string | null>(song.lyricsAddedAt ?? null);
  const [lyricsWidLoading, setLyricsWidLoading] = useState(false);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(song.videoUrl ?? null);
  const [currentVideoWid, setCurrentVideoWid] = useState<string | null>(song.videoWitnessId ?? null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // ── Transform / processing status strip ──────────────────────────────────
  // null = idle, string = current step label, "done" = success, "error" = failed
  const [processStep, setProcessStep] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // Replace Audio state
  const [replaceAudioFile, setReplaceAudioFile] = useState<File | null>(null);
  const [replaceAudioNote, setReplaceAudioNote] = useState("");
  const [replaceAudioLoading, setReplaceAudioLoading] = useState(false);
  const [currentWitnessId, setCurrentWitnessId] = useState<string | null>(song.witnessId ?? null);
  const replaceAudioInputRef = useRef<HTMLInputElement>(null);

  // Lineage state
  const [parentSongId, setParentSongId] = useState<string>(
    song.parentSongId != null ? String(song.parentSongId) : ""
  );
  const [lineageExpanded, setLineageExpanded] = useState(false);

  // Book Access Control & Commerce state
  type ExternalLink = { platform: string; url: string; label?: string };
  const parseExternalLinks = (json: string | null | undefined): ExternalLink[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };
  type ConsentSettings = {
    enabled: boolean;
    requireAgeAck: boolean;
    requireAiAck: boolean;
    requireNoRedistrib: boolean;
    customNote: string;
  };
  const parseConsentSettings = (json: string | null | undefined): ConsentSettings => {
    const defaults: ConsentSettings = { enabled: false, requireAgeAck: false, requireAiAck: false, requireNoRedistrib: true, customNote: "" };
    if (!json) return defaults;
    try { return { ...defaults, ...JSON.parse(json) }; } catch { return defaults; }
  };
  const [readAccess, setReadAccess] = useState<"open" | "preview" | "locked">(
    ((song as any).readAccess as any) ?? "open"
  );
  const [purchasePriceDollars, setPurchasePriceDollars] = useState<string>(
    (song as any).purchasePriceCents != null ? ((song as any).purchasePriceCents / 100).toFixed(2) : ""
  );
  const [previewPageCount, setPreviewPageCount] = useState<number>(
    (song as any).previewPageCount ?? 5
  );
  const [consentSettings, setConsentSettings] = useState<ConsentSettings>(
    () => parseConsentSettings((song as any).consentSettingsJson)
  );
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>(
    () => parseExternalLinks((song as any).externalLinksJson)
  );
  const [accessExpanded, setAccessExpanded] = useState(false);

  // Credits state
  type CreditEntry = { role: string; name: string };
  const parseCredits = (json: string | null | undefined): CreditEntry[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };
  const [credits, setCredits] = useState<CreditEntry[]>(() => parseCredits(song.creditsJson));
  // Sync credits state when the song prop changes (e.g. after a save + refetch)
  useEffect(() => {
    setCredits(parseCredits(song.creditsJson));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.creditsJson]);

  const utils = trpc.useUtils();
  const updateDownloadPermission = trpc.songDownload.updatePermission.useMutation({
    onSuccess: () => {
      toast.success("Download permission updated");
      utils.songs.mySongs.invalidate();
      setDlSaving(false);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to update download permission");
      setDlSaving(false);
    },
  });

  const updateMetadata = trpc.songs.updateMetadata.useMutation({
    onSuccess: () => {
      utils.songs.mySongs.invalidate();
      toast.success("Track updated");
      onSaved();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save changes");
      setSaving(false);
    },
  });

  // Separate mutation for position-only saves — does NOT close the panel
  const saveCoverPositionMutation = trpc.songs.updateMetadata.useMutation({
    onSuccess: () => {
      utils.songs.mySongs.invalidate();
      toast.success("Cover position saved");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save position");
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll — routed through global overlay controller
  useEffect(() => {
    overlayOpen("edit-track");
    return () => overlayClose("edit-track");
  }, []);

  const uploadVideoMutation = trpc.songs.uploadVideo.useMutation({
    onSuccess: (data: any) => {
      setCurrentVideoUrl(data.videoUrl);
      setCurrentVideoWid(data.videoWitnessId);
      setVideoFile(null);
      setVideoUploading(false);
      toast.success("Music video uploaded and witnessed!");
      utils.songs.mySongs.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Video upload failed");
      setVideoUploading(false);
    },
  });

  async function handleVideoUpload() {
    if (!videoFile) return;
    setVideoUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      // Compute SHA-256 witness for the video file
      const videoBuf = await videoFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", videoBuf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      const videoWitnessId = `WID-VID-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
      await uploadVideoMutation.mutateAsync({
        songId: song.id,
        videoBase64: base64,
        videoMimeType: videoFile.type || "video/mp4",
        videoFileName: videoFile.name,
        videoWitnessId,
      });
    };
    reader.readAsDataURL(videoFile);
  }

  const uploadCoverArt = trpc.songs.uploadCoverArt.useMutation({
    onSuccess: (data) => {
      setCoverArtUrl(data.url);
      setCoverUploading(false);
      toast.success("Cover art updated");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Cover upload failed");
      setCoverUploading(false);
    },
  });

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Cover art must be under 5MB"); return; }
    // Show local preview for repositioning before uploading
    const objectUrl = URL.createObjectURL(file);
    setPendingCoverUrl(objectUrl);
    setShowCoverPositioner(true);
    (coverInputRef.current as any)._pendingFile = file;
  }
  async function confirmCoverUpload(pos: { x: number; y: number }) {
    const file = (coverInputRef.current as any)?._pendingFile as File | undefined;
    if (!file) return;
    setCoverPos(pos);
    setShowCoverPositioner(false);
    setCoverUploading(true);
    try {
      // Upload via multipart /api/upload-file to bypass the 1 MB tRPC JSON body limit.
      // Base64 encoding inflates file size by ~33%, so any image > ~750 KB would fail
      // if sent through the tRPC uploadCoverArt mutation.
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("type", "cover");
      formData.append("filename", file.name);
      const res = await fetch("/api/upload-file", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Upload failed (${res.status})`);
      }
      const { url } = await res.json() as { url: string; key: string };
      // Persist the new cover URL and position
      await updateMetadata.mutateAsync({
        songId: song.id,
        coverArtUrl: url,
        coverPositionX: pos.x,
        coverPositionY: pos.y,
      });
      setCoverArtUrl(url);
      toast.success("Cover art updated");
    } catch (err: any) {
      toast.error(err?.message || "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
    if (pendingCoverUrl) URL.revokeObjectURL(pendingCoverUrl);
    setPendingCoverUrl(null);
  }
  async function saveCoverPosition(pos: { x: number; y: number }) {
    setCoverPos(pos);
    setShowCoverPositioner(false);
    await saveCoverPositionMutation.mutateAsync({
      songId: song.id,
      coverPositionX: pos.x,
      coverPositionY: pos.y,
    });
  }

  async function handleSave() {
    setSaving(true);
    setProcessError(null);
    setProcessStep("Saving metadata…");
    const validCredits = credits.filter(c => c.role.trim() || c.name.trim());
    // Only include parentSongId in the payload if the user has touched the field
    const parsedParentId = parentSongId.trim() !== "" ? parseInt(parentSongId, 10) : null;
    const purchasePriceCents = purchasePriceDollars.trim() !== ""
      ? Math.round(parseFloat(purchasePriceDollars) * 100)
      : null;
    try {
      await updateMetadata.mutateAsync({
        songId: song.id,
        title: title.trim() || undefined,
        caption: caption.trim() || null,
        genre: genre || null,
        collectionTag: collectionTag.trim() || null,
        coverArtUrl: coverArtUrl || null,
        aiConsent,
        ownershipStatus,
        status,
        creditsJson: validCredits.length > 0 ? JSON.stringify(validCredits) : null,
        parentSongId: parsedParentId,
        // Book access & commerce
        readAccess,
        purchasePriceCents: isNaN(purchasePriceCents as number) ? null : purchasePriceCents,
        previewPageCount,
        consentSettingsJson: JSON.stringify(consentSettings),
        externalLinksJson: externalLinks.length > 0 ? JSON.stringify(externalLinks) : null,
      });
      setProcessStep("done");
      setTimeout(() => setProcessStep(null), 2500);
    } catch (e: any) {
      setProcessError(e?.message || "Save failed");
      setProcessStep("error");
    }
    setSaving(false);
  }

  const addLyricsWithWid = trpc.songs.addLyricsWithWid.useMutation({
    onSuccess: (data: { lyricsWid: string; lyricsAddedAt: Date }) => {
      setLyricsWid(data.lyricsWid);
      setLyricsAddedAt(data.lyricsAddedAt);
      setLyricsFile(null);
      setLyricsWidLoading(false);
      toast.success("Lyrics witnessed — WID-LYR generated!");
      utils.songs.mySongs.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to witness lyrics");
      setLyricsWidLoading(false);
    },
  });

  async function handleWitnessLyrics() {
    if (!lyricsFile) return;
    setLyricsWidLoading(true);
    setProcessError(null);
    setProcessStep("Reading lyrics file…");
    try {
      // Extract text from the file.
      // .txt / .mus (text-based) → read as UTF-8 text directly.
      // .mus files from MuseScore are XML-based — we extract any <lyric text="..."> or
      // plain text content so the WID-LYR is based on the actual lyric words.
      let text: string;
      const ext = lyricsFile.name.split(".").pop()?.toLowerCase() ?? "";
      if (ext === "mus" || ext === "musicxml" || ext === "mxl" || ext === "xml") {
        // Parse XML and extract lyric syllables in order
        const raw = await lyricsFile.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, "application/xml");
        // MusicXML: <lyric><text>word</text></lyric>
        const lyricNodes = Array.from(doc.querySelectorAll("lyric text, lyric syllabic ~ text, words"));
        if (lyricNodes.length > 0) {
          text = lyricNodes.map(n => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
        } else {
          // Fallback: strip all XML tags and use remaining text
          text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        }
        if (!text) throw new Error("No lyric text found in this notation file. Please also upload a .txt version of your lyrics.");
      } else {
        text = await lyricsFile.text();
      }
      setProcessStep("Computing cryptographic hash…");
      // Compute SHA-256 of the raw file bytes (hash covers the original file, not extracted text)
      const buf = await lyricsFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      setLyricsFileName(lyricsFile.name);
      setProcessStep("Generating WID-LYR…");
      await addLyricsWithWid.mutateAsync({
        songId: song.id,
        lyricsText: text,
        lyricsFileName: lyricsFile.name,
        lyricsFileHash: hashHex,
      });
      setProcessStep("done");
      setTimeout(() => setProcessStep(null), 2500);
    } catch (e: any) {
      const msg = e?.message || "Failed to read lyrics file";
      toast.error(msg);
      setProcessError(msg);
      setProcessStep("error");
      setLyricsWidLoading(false);
    }
  }

  const updateLyrics = trpc.songs.updateLyrics.useMutation({
    onSuccess: () => {
      toast.success("Lyrics saved");
      utils.songs.mySongs.invalidate();
      setLyricsSaving(false);
      // Clear draft after successful save
      try { localStorage.removeItem(lyricsStorageKey(song.id)); setHasDraft(false); } catch {}
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save lyrics");
      setLyricsSaving(false);
    },
  });

  async function handleSaveLyrics() {
    setLyricsSaving(true);
    await updateLyrics.mutateAsync({ songId: song.id, lyricsText: lyrics });
  }

  const replaceAudioMutation = trpc.songs.replaceAudio.useMutation({
    onSuccess: (data: { fileUrl: string; witnessId: string }) => {
      setCurrentWitnessId(data.witnessId);
      setReplaceAudioFile(null);
      setReplaceAudioNote("");
      setReplaceAudioLoading(false);
      toast.success("Audio replaced — new WID-MUS generated!");
      utils.songs.mySongs.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to replace audio");
      setReplaceAudioLoading(false);
    },
  });

  const { data: audioVersions } = trpc.songs.getAudioVersions.useQuery(
    { songId: song.id },
    { staleTime: 30_000 }
  );

  async function handleReplaceAudio() {
    if (!replaceAudioFile) return;
    setReplaceAudioLoading(true);
    setProcessError(null);
    setProcessStep("Reading audio file…");
    try {
      setProcessStep("Computing file hash…");
      const buf = await replaceAudioFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      setProcessStep("Uploading audio to secure storage…");
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = (ev.target?.result as string).split(",")[1];
          setProcessStep("Generating new WID-MUS…");
          await replaceAudioMutation.mutateAsync({
            songId: song.id,
            audioBase64: base64,
            audioMimeType: replaceAudioFile.type || "audio/mpeg",
            audioFileName: replaceAudioFile.name,
            fileHash: hashHex,
            versionNote: replaceAudioNote.trim() || undefined,
          });
          setProcessStep("done");
          setTimeout(() => setProcessStep(null), 2500);
        } catch (e: any) {
          const msg = e?.message || "Failed to replace audio";
          toast.error(msg);
          setProcessError(msg);
          setProcessStep("error");
          setReplaceAudioLoading(false);
        }
      };
      reader.readAsDataURL(replaceAudioFile);
    } catch (e: any) {
      const msg = e?.message || "Failed to read audio file";
      toast.error(msg);
      setProcessError(msg);
      setProcessStep("error");
      setReplaceAudioLoading(false);
    }
  }

  async function handleSaveDownloadPermission() {
    setDlSaving(true);
    await updateDownloadPermission.mutateAsync({
      songId: song.id,
      permission: downloadPermission,
      tipThresholdCents,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — centered modal on desktop, right-side sheet on mobile */}
      <div
        ref={panelRef}
        className={isMobile ? "relative ml-auto w-full max-w-md flex flex-col" : "relative w-full flex flex-col"}
        style={{
          height: isMobile ? "100dvh" : "min(90vh, 860px)",
          maxWidth: isMobile ? undefined : "min(720px, 90vw)",
          background: "linear-gradient(180deg, var(--ln-coal) 0%, var(--ln-coal) 100%)",
          border: isMobile ? undefined : "1px solid rgba(212,175,55,0.3)",
          borderLeft: isMobile ? "1px solid rgba(212,175,55,0.2)" : undefined,
          boxShadow: isMobile ? "-8px 0 40px rgba(0,0,0,0.6)" : "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.15)",
          borderRadius: isMobile ? 0 : "16px",
          minWidth: 0,
          overflowY: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 sticky top-0 z-10"
          style={{ background: "var(--ln-coal)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}
        >
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">
              {isManuscript ? "Edit Manuscript" : isComic ? "Edit Comic / Novel" : "Edit Track"}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>
              {song.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: "#94a3b8" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Transform / processing status strip ────────────────────────────────── */}
        {processStep && (
          <div
            className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-lg flex items-center gap-3 transition-all"
            style={{
              background: processStep === "done"
                ? "rgba(34,197,94,0.10)"
                : processStep === "error"
                ? "rgba(239,68,68,0.10)"
                : "rgba(212,175,55,0.10)",
              border: `1px solid ${
                processStep === "done" ? "rgba(34,197,94,0.35)"
                : processStep === "error" ? "rgba(239,68,68,0.35)"
                : "rgba(212,175,55,0.35)"
              }`,
            }}
          >
            {processStep === "done" ? (
              <CheckCircle2 size={15} style={{ color: "#22c55e", flexShrink: 0 }} />
            ) : processStep === "error" ? (
              <AlertCircle size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
            ) : (
              <Loader2 size={15} className="animate-spin" style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{
                color: processStep === "done" ? "#22c55e" : processStep === "error" ? "#ef4444" : "var(--ln-gold)"
              }}>
                {processStep === "done" ? "Changes saved successfully" : processStep === "error" ? (processError || "Operation failed") : processStep}
              </p>
              {processStep !== "done" && processStep !== "error" && (
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(212,175,55,0.15)" }}>
                  <div className="h-full rounded-full animate-pulse" style={{ background: "var(--ln-gold)", width: "60%" }} />
                </div>
              )}
            </div>
            {processStep === "error" && (
              <button
                onClick={() => { setProcessStep(null); setProcessError(null); }}
                className="text-xs hover:underline flex-shrink-0"
                style={{ color: "#ef4444" }}
              >Dismiss</button>
            )}
          </div>
        )}

        {/* WID immutability notice */}
        <div
          className="mx-4 sm:mx-6 mt-4 px-4 py-3 rounded-lg flex items-start gap-3"
          style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
        >
          <Lock size={16} style={{ color: "var(--ln-gold)", marginTop: 2, flexShrink: 0 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--ln-gold)" }}>WID IS IMMUTABLE</p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              Editing metadata never changes the cryptographic proof. The Witness ID{song.witnessId ? ` (${song.witnessId.slice(0, 12)}…)` : ""} is permanently locked.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-6" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>

          {/* Track Title */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">
              {isManuscript ? "Manuscript Title" : isComic ? "Comic / Novel Title" : "Track Title"}
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title…"
              maxLength={200}
              className="text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
              }}
            />
            <p className="text-xs" style={{ color: "#64748b" }}>
              Renaming this work does not change the Witness ID — the cryptographic proof is based on file content, not the title.
            </p>
          </div>

          {/* Cover Art */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Cover Art</Label>
            <div className="flex flex-col items-start gap-3">
              <div
                className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 group relative cursor-pointer"
                style={{ border: "1px solid rgba(212,175,55,0.3)", background: "var(--ln-coal)" }}
                onClick={() => coverArtUrl && setShowCoverPositioner(true)}
              >
                {coverArtUrl ? (
                  <>
                    <img
                      src={coverArtUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${coverPos.x}% ${coverPos.y}%` }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[9px] font-medium">Reposition</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Upload size={20} style={{ color: "#475569" }} />
                  </div>
                )}
              </div>
              <div className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="w-full text-sm"
                  style={{ borderColor: "rgba(212,175,55,0.3)", color: "var(--ln-gold)", background: "transparent" }}
                >
                  {coverUploading ? "Uploading…" : "Replace Cover Art"}
                </Button>
                <p className="text-xs mt-1.5" style={{ color: "#64748b" }}>JPG or PNG, max 5MB • Click cover to reposition</p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>
          </div>
          {/* Cover Art inline repositioner — direct manipulation: drag, scroll, double-click, keyboard */}
          {showCoverPositioner && (pendingCoverUrl || coverArtUrl) && (
            <ImagePositioner
              imageUrl={(pendingCoverUrl || coverArtUrl)!}
              initialX={coverPos.x}
              initialY={coverPos.y}
              initialZoom={110}
              previewHeight="12rem"
              roundedTop={true}
              label={pendingCoverUrl ? "Set Cover Position" : "Reposition Cover Art"}
              onSave={pendingCoverUrl ? confirmCoverUpload : saveCoverPosition}
              onCancel={() => {
                setShowCoverPositioner(false);
                if (pendingCoverUrl) { URL.revokeObjectURL(pendingCoverUrl); setPendingCoverUrl(null); }
              }}
            />
          )}

          {/* Caption / Synopsis */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">
              {isWritten ? "Short Description" : "Caption / Description"}
            </Label>
            {isWritten && (
              <p className="text-xs" style={{ color: "#64748b" }}>Shown on archive cards and the public detail page. Keep it to 1–3 sentences.</p>
            )}
            <Textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                // Auto-grow height
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${t.scrollHeight}px`;
              }}
              placeholder={isManuscript ? "Describe your manuscript — plot, themes, intended audience…" : isComic ? "Describe your comic or novel — story, characters, visual style…" : "Add a caption or description for this track…"}
              maxLength={2000}
              rows={3}
              className="resize-none text-sm overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
                minHeight: "4.5rem",
              }}
            />
            <p className="text-xs text-right" style={{ color: "#475569" }}>{caption.length}/2000</p>
          </div>

          {/* Genre (music) OR Category chips (manuscript/comic) — multi-select for music */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">
              {isWritten ? "Category" : (
                <span className="flex items-center gap-2">
                  Genre
                  <span className="text-[10px] font-normal" style={{ color: "var(--ln-iron)" }}>select all that apply</span>
                </span>
              )}
            </Label>
            {isWritten ? (
              <div className="flex flex-wrap gap-2">
                {(isManuscript ? MANUSCRIPT_CATEGORIES : COMIC_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGenre(cat === genre ? "" : cat)}
                    className="px-3 py-1 rounded-full text-xs transition-all"
                    style={{
                      background: genre === cat ? "rgba(196,154,40,0.2)" : "rgba(255,255,255,0.05)",
                      color: genre === cat ? "var(--ln-gold)" : "var(--ln-smoke)",
                      border: `1px solid ${genre === cat ? "rgba(196,154,40,0.4)" : "rgba(255,255,255,0.15)"}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : (
              /* Music: multi-select chip grid — stored as comma-separated in genre field */
              (() => {
                const selectedGenres = genre ? genre.split(",").map(g => g.trim()).filter(Boolean) : [];
                const toggleGenre = (g: string) => {
                  const next = selectedGenres.includes(g)
                    ? selectedGenres.filter(x => x !== g)
                    : [...selectedGenres, g];
                  // Truncate to fit varchar(64) — keep first N that fit
                  const mutable = [...next];
                  setGenre(mutable.join(", "));
                };
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.map((g) => {
                      const active = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenre(g)}
                          className="px-2.5 py-1 rounded-full text-xs transition-all"
                          style={{
                            background: active ? "rgba(196,154,40,0.22)" : "rgba(255,255,255,0.06)",
                            color: active ? "var(--ln-gold)" : "var(--ln-smoke)",
                            border: `1px solid ${active ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.15)"}`,
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {active && <span className="mr-1 text-[10px]">✓</span>}{g}
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>

          {/* Collection Tag */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">
              {isWritten ? "Series / Collection" : "Collection / Grouping Tag"}
            </Label>
            <Input
              value={collectionTag}
              onChange={(e) => setCollectionTag(e.target.value)}
              placeholder={isWritten ? "e.g. The Chronicles of…, Volume 1, Standalone…" : "e.g. Summer EP, Mixtape Vol. 1, Unreleased…"}
              maxLength={128}
              className="text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
              }}
            />
            <p className="text-xs" style={{ color: "#64748b" }}>
              {isWritten ? "Groups works into a series or collection in your archive." : "Groups tracks together in your archive and creator profile."}
            </p>
          </div>

          {/* AI Disclosure */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <Shield size={14} style={{ color: "var(--ln-gold)" }} />
              AI Disclosure
            </Label>
            <Select value={aiConsent} onValueChange={(v) => setAiConsent(v as any)}>
              <SelectTrigger
                className="text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f1f5f9",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1C1A14", border: "1px solid rgba(196,154,40,0.4)", color: "var(--ln-parchment)" }}>
                <SelectItem value="prohibited" style={{ color: "var(--ln-parchment)" }}>
                  Human-Made — No AI Training
                </SelectItem>
                <SelectItem value="permitted_attribution" style={{ color: "var(--ln-parchment)" }}>
                  AI-Assisted — Attribution Required
                </SelectItem>
                <SelectItem value="permitted" style={{ color: "var(--ln-parchment)" }}>
                  AI-Assisted Manifestation — Open Training
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ownership & Commercial License Disclaimer */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{
              background: ownershipStatus === "partial" ? "rgba(239,68,68,0.07)" : "rgba(196,154,40,0.04)",
              border: `1px solid ${ownershipStatus === "partial" ? "rgba(239,68,68,0.35)" : "rgba(196,154,40,0.18)"}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-white text-sm font-medium flex items-center gap-2">
                  <Shield size={14} style={{ color: ownershipStatus === "partial" ? "var(--ln-ember)" : "var(--ln-gold)" }} />
                  Commercial Ownership
                </Label>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                  {ownershipStatus === "full" ? "Full rights — eligible to publish & monetize" : "Partial / unclear — publish & monetize blocked"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOwnershipStatus(s => s === "full" ? "partial" : "full")}
                className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
                style={{ background: ownershipStatus === "full" ? "var(--ln-gold)" : "rgba(239,68,68,0.5)" }}
                aria-pressed={ownershipStatus === "full"}
                aria-label="Toggle commercial ownership"
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: ownershipStatus === "full" ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>
            {ownershipStatus === "partial" && (
              <p className="text-xs" style={{ color: "var(--ln-ember)" }}>
                AI-generated without a commercial license, or remix without full clearance. Upload is allowed, but this work cannot be published or monetized until you resolve the rights situation and toggle this on.
              </p>
            )}
          </div>

          {/* Visibility */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">
              {isWritten ? "Work Visibility" : "Track Visibility"}
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger
                className="text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${STATUS_COLORS[status] ?? "rgba(255,255,255,0.12)"}40`,
                  color: STATUS_COLORS[status] ?? "#f1f5f9",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1C1A14", border: "1px solid rgba(196,154,40,0.4)", color: "var(--ln-parchment)" }}>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} style={{ color: STATUS_COLORS[val] ?? "var(--ln-parchment)" }}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Download Permission ─────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <Download size={14} style={{ color: "#60a5fa" }} />
              Download Permission
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Controls whether fans can download this track. Defaults to <strong style={{ color: "#94a3b8" }}>off</strong> on every upload.
            </p>

            {/* Three option buttons */}
            <div className="flex flex-col gap-2">
              {([
                { value: "none",   label: "No Download",           desc: "Fans cannot download this track.",                         color: "#ef4444" },
                { value: "free",   label: "Free Download",          desc: "Anyone can download at no cost.",                         color: "#22c55e" },
                { value: "tipped", label: "Gift-Gated Download",     desc: `Unlock after gifting $${(tipThresholdCents / 100).toFixed(2)}.`, color: "#f59e0b" },
              ] as const).map(({ value, label, desc, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDownloadPermission(value)}
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-all"
                  style={{
                    background: downloadPermission === value ? `${color}18` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${downloadPermission === value ? color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: downloadPermission === value ? color : "#f1f5f9" }}>
                    {label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{desc}</p>
                </button>
              ))}
            </div>

            {/* Tip threshold input — only shown when tipped is selected */}
            {downloadPermission === "tipped" && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs" style={{ color: "#94a3b8" }}>Minimum gift to unlock (cents)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "#64748b" }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="1.79"
                    value={tipThresholdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTipThresholdInput(raw);
                      const dollars = parseFloat(raw);
                      if (!isNaN(dollars) && dollars >= 0.5) {
                        setTipThresholdCents(Math.round(dollars * 100));
                      }
                    }}
                    onBlur={() => {
                      // Normalise display on blur
                      const dollars = parseFloat(tipThresholdInput);
                      if (!isNaN(dollars) && dollars >= 0.5) {
                        setTipThresholdInput((Math.round(dollars * 100) / 100).toFixed(2));
                      } else {
                        setTipThresholdInput((tipThresholdCents / 100).toFixed(2));
                      }
                    }}
                    className="flex-1 rounded-md px-3 py-1.5 text-sm"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f1f5f9",
                      outline: "none",
                    }}
                  />
                </div>
                <p className="text-xs" style={{ color: "#64748b" }}>Minimum $0.50 · Default $1.79 per track</p>
              </div>
            )}

            {/* Save download permission button */}
            <Button
              size="sm"
              onClick={handleSaveDownloadPermission}
              disabled={dlSaving}
              className="w-full text-sm font-semibold"
              style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}
            >
              {dlSaving ? "Saving…" : "Save Download Setting"}
            </Button>
          </div>

           {/* ── Lyrics / Synopsis Editor ─────────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <FileText size={14} style={{ color: "var(--ln-gold)" }} />
              {isWritten ? "Full Synopsis / Excerpt" : "Lyrics"}
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              {isWritten
                ? "A longer excerpt or full synopsis embedded in the provenance record. This is separate from the short description shown on cards."
                : "Add or update the lyrics for this track. Lyrics are displayed in the Now Playing panel and serve as a timestamped record of your words."}
            </p>
            <textarea
              value={lyrics}
              onChange={(e) => setLyricsWithHistory(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); handleLyricsUndo(); }
                if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); handleLyricsRedo(); }
              }}
              placeholder={isWritten ? (isManuscript ? "Synopsis or excerpt…" : "Story synopsis or excerpt…") : "Paste or type your lyrics here…"}
              rows={10}
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-y"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,175,55,0.2)",
                color: "#e2e8f0",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                lineHeight: "1.8",
                minHeight: "160px",
              }}
            />
            {/* Undo / Redo toolbar */}
            <div className="flex items-center gap-1.5 mb-1">
              <button
                type="button"
                onClick={handleLyricsUndo}
                disabled={lyricsHistoryIdx.current <= 0}
                title="Undo (Ctrl+Z)"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-opacity disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <RotateCcw size={11} />
                Undo
              </button>
              <button
                type="button"
                onClick={handleLyricsRedo}
                disabled={lyricsHistoryIdx.current >= lyricsHistory.current.length - 1}
                title="Redo (Ctrl+Y)"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-opacity disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)", transform: "scaleX(-1)" }}
              >
                <RotateCcw size={11} />
                Redo
              </button>
            </div>
            {/* Draft indicator */}
            {hasDraft && (
              <p className="text-[10px] mb-1" style={{ color: "rgba(245,196,81,0.5)" }}>
                Draft auto-saved — not yet committed to provenance record
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs flex items-center gap-3 flex-wrap" style={{ color: "#475569" }}>
                <span>{lyrics.length} / 10,000 chars</span>
                {lyrics.trim().length > 0 && (() => {
                  const { lines, avgSyllables } = lyricsStats(lyrics);
                  return (
                    <>
                      <span style={{ color: "rgba(100,116,139,0.6)" }}>·</span>
                      <span>{lines} {lines === 1 ? "line" : "lines"}</span>
                      <span style={{ color: "rgba(100,116,139,0.6)" }}>·</span>
                      <span>~{avgSyllables} syl/line</span>
                    </>
                  );
                })()}
              </span>
              <Button
                size="sm"
                onClick={handleSaveLyrics}
                disabled={lyricsSaving}
                className="text-sm font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(212,175,55,0.3)" }}
              >
                {lyricsSaving ? "Saving…" : "Save Lyrics"}
              </Button>
            </div>
          </div>

          {/* ── Lyrics WID (WID-LYR) ─────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <BookOpen size={14} style={{ color: "var(--ln-gold)" }} />
              Lyrics Witness ID <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.12)", color: "var(--ln-gold)" }}>WID-LYR</span>
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Upload your lyrics as a <strong style={{ color: "#94a3b8" }}>.txt</strong>, <strong style={{ color: "#94a3b8" }}>.mus</strong>, or <strong style={{ color: "#94a3b8" }}>.musicxml</strong> file to generate a cryptographic Witness ID (WID-LYR) — a separate provenance proof for your words, independent of the audio WID.
            </p>

            {/* Existing WID-LYR badge */}
            {lyricsWid && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", color: "var(--ln-gold)" }}>
                  <span>🔐</span>
                  <span className="flex-1 break-all">{lyricsWid}</span>
                </div>
                {lyricsFileName && (
                  <p className="text-xs" style={{ color: "#475569" }}>File: {lyricsFileName}{lyricsAddedAt ? ` · ${new Date(lyricsAddedAt).toLocaleDateString()}` : ""}</p>
                )}
              </div>
            )}

            {/* File drop zone */}
            <div
              onClick={() => lyricsFileInputRef.current?.click()}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{
                border: `2px dashed ${lyricsFile ? "var(--ln-gold)" : "rgba(212,175,55,0.2)"}`,
                background: lyricsFile ? "rgba(212,175,55,0.05)" : "transparent",
              }}
            >
              <input
                ref={lyricsFileInputRef}
                type="file"
                accept=".txt,.mus,.musicxml,.mxl,.xml,text/plain,application/xml,text/xml"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 2 * 1024 * 1024) { toast.error("Lyrics file must be under 2 MB"); e.target.value = ""; return; }
                  setLyricsFile(f);
                }}
              />
              {lyricsFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={14} style={{ color: "var(--ln-gold)" }} />
                  <span className="text-sm" style={{ color: "var(--ln-gold)" }}>{lyricsFile.name}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>({(lyricsFile.size / 1024).toFixed(1)} KB)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setLyricsFile(null); }} className="text-xs hover:underline ml-1" style={{ color: "#94a3b8" }}>Remove</button>
                </div>
              ) : (
                <>
                  <BookOpen size={20} className="mx-auto mb-1" style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{lyricsWid ? "Replace lyrics file" : "Upload lyrics file"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>.txt · .mus · .musicxml · .xml — max 2 MB</p>
                </>
              )}
            </div>

            {lyricsFile && (
              <Button
                size="sm"
                onClick={handleWitnessLyrics}
                disabled={lyricsWidLoading}
                className="w-full text-sm font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(212,175,55,0.4)" }}
              >
                {lyricsWidLoading ? "Witnessing…" : "Witness Lyrics & Generate WID-LYR"}
              </Button>
            )}
          </div>

          {/* ── Replace Audio (Version History) ──────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <RotateCcw size={14} style={{ color: "var(--ln-gold)" }} />
              Replace Audio
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.12)", color: "var(--ln-gold)" }}>WID-MUS</span>
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Upload a new master or mix. The current audio is archived with its WID-MUS intact — nothing is lost. A new Witness ID is generated for the replacement.
            </p>

            {/* Current WID badge */}
            {currentWitnessId && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", color: "var(--ln-gold)" }}>
                <span>🔐</span>
                <span className="flex-1 break-all">Current: {currentWitnessId}</span>
              </div>
            )}

            {/* Version history */}
            {audioVersions && audioVersions.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                  <History size={12} />
                  <span>{audioVersions.length} archived version{audioVersions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {audioVersions.map((v: any, i: number) => (
                    <div key={v.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: "#475569" }}>v{audioVersions.length - i}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate" style={{ color: "#64748b" }}>{v.witnessId}</p>
                        {v.versionNote && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{v.versionNote}</p>}
                        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{new Date(v.replacedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version note */}
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: "#94a3b8" }}>Version note (optional)</Label>
              <input
                type="text"
                placeholder="e.g. Rough mix, Final master, Radio edit…"
                value={replaceAudioNote}
                onChange={e => setReplaceAudioNote(e.target.value)}
                maxLength={255}
                className="w-full rounded-md px-3 py-1.5 text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  color: "#f1f5f9",
                  outline: "none",
                }}
              />
            </div>

            {/* File drop zone */}
            <div
              onClick={() => replaceAudioInputRef.current?.click()}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{
                border: `2px dashed ${replaceAudioFile ? "var(--ln-gold)" : "rgba(212,175,55,0.2)"}`,
                background: replaceAudioFile ? "rgba(212,175,55,0.05)" : "transparent",
              }}
            >
              <input
                ref={replaceAudioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 200 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Max 200 MB.`); e.target.value = ""; return; }
                  setReplaceAudioFile(f);
                }}
              />
              {replaceAudioFile ? (
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw size={14} style={{ color: "var(--ln-gold)" }} />
                  <span className="text-sm" style={{ color: "var(--ln-gold)" }}>{replaceAudioFile.name}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>({(replaceAudioFile.size/1024/1024).toFixed(1)} MB)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setReplaceAudioFile(null); }} className="text-xs hover:underline ml-1" style={{ color: "#94a3b8" }}>Remove</button>
                </div>
              ) : (
                <>
                  <RotateCcw size={20} className="mx-auto mb-1" style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: "#94a3b8" }}>Upload replacement audio file</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>MP3, WAV, FLAC, AAC — max 200 MB</p>
                </>
              )}
            </div>

            {replaceAudioFile && (
              <Button
                size="sm"
                onClick={handleReplaceAudio}
                disabled={replaceAudioLoading}
                className="w-full text-sm font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(212,175,55,0.4)" }}
              >
                {replaceAudioLoading ? "Replacing & Witnessing…" : "Replace Audio & Generate New WID-MUS"}
              </Button>
            )}
          </div>

          {/* ── Music Video Upload ──────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <Video size={14} style={{ color: "var(--ln-seal-bright)" }} />
              Music Video
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Attach a music video to this track. The video gets its own Witness ID alongside the audio. MP4 or MOV, max 500 MB.
            </p>

            {/* Current video preview */}
            {currentVideoUrl && (
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9", background: "var(--ln-coal)" }}>
                <video src={currentVideoUrl} className="w-full h-full object-contain" controls playsInline />
              </div>
            )}

            {/* Current video WID */}
            {currentVideoWid && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", color: "var(--ln-seal-bright)" }}>
                🔐 Video WID: {currentVideoWid}
              </div>
            )}

            {/* File picker */}
            <div
              onClick={() => videoInputRef.current?.click()}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{
                border: `2px dashed ${videoFile ? "var(--ln-seal-bright)" : "rgba(255,255,255,0.12)"}`,
                background: videoFile ? "rgba(74,222,128,0.05)" : "transparent",
              }}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/mov,.mp4,.mov"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 500 * 1024 * 1024) { toast.error(`Video too large (${(f.size/1024/1024).toFixed(0)} MB). Max 500 MB.`); e.target.value = ""; return; }
                  setVideoFile(f);
                }}
              />
              {videoFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Video size={14} style={{ color: "var(--ln-seal-bright)" }} />
                  <span className="text-sm" style={{ color: "var(--ln-seal-bright)" }}>{videoFile.name}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>({(videoFile.size/1024/1024).toFixed(1)} MB)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); }} className="text-xs hover:underline ml-1" style={{ color: "#94a3b8" }}>Remove</button>
                </div>
              ) : (
                <>
                  <Video size={20} className="mx-auto mb-1" style={{ color: "var(--ln-seal-bright)", opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{currentVideoUrl ? "Replace video" : "Upload music video"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>MP4, MOV — max 500 MB</p>
                </>
              )}
            </div>

            {videoFile && (
              <Button
                size="sm"
                onClick={handleVideoUpload}
                disabled={videoUploading}
                className="w-full text-sm font-semibold"
                style={{ background: "rgba(58,138,86,0.15)", color: "var(--ln-seal-bright)", border: "1px solid rgba(58,138,86,0.3)" }}
              >
                {videoUploading ? "Uploading video…" : "Upload & Witness Video"}
              </Button>
            )}
          </div>

          {/* ── Credits ──────────────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--ln-gold)" }}>Credits</h3>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                  {(song as any).contentType === "manuscript" || (song as any).contentType === "comic"
                    ? "Add publisher, author, editor, or illustrator credits."
                    : "Add producers, engineers, co-writers, and featured artists."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                style={{ borderColor: "rgba(212,175,55,0.3)", color: "var(--ln-gold)", background: "transparent" }}
                onClick={() => setCredits(prev => [...prev, { role: "", name: "" }])}
              >
                <Plus size={12} /> Add
              </Button>
              {((song as any).contentType === "manuscript" || (song as any).contentType === "comic") &&
                !credits.some(c => c.role.toLowerCase() === "publisher") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 ml-1"
                  style={{ borderColor: "rgba(212,175,55,0.3)", color: "var(--ln-gold)", background: "transparent" }}
                  onClick={() => setCredits(prev => [{ role: "Publisher", name: "" }, ...prev])}
                >
                  + Publisher
                </Button>
              )}
            </div>
            {credits.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: "#475569" }}>No credits yet. Hit Add to give collaborators recognition.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {credits.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Role (e.g. Producer)"
                      value={c.role}
                      onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                      className="flex-1 h-8 text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                    />
                    <Input
                      placeholder="Name"
                      value={c.name}
                      onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 h-8 text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                    />
                    <button
                      onClick={() => setCredits(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 rounded hover:bg-red-900/30 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={13} style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs" style={{ color: "#475569" }}>Credits save with the rest of your metadata.</p>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || coverUploading}
                className="text-xs h-7 px-3 font-semibold"
                style={{
                  background: saving ? "rgba(196,154,40,0.26)" : "linear-gradient(135deg, #C49A28, #8B6914)",
                  color: "#000",
                  boxShadow: saving ? "none" : "0 0 10px rgba(212,175,55,0.3)",
                }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* ── Lineage ─────────────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Collapsed header — always visible */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
              style={{ background: "rgba(255,255,255,0.02)" }}
              onClick={() => setLineageExpanded(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Link2 size={14} style={{ color: "#64748b" }} />
                <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>Lineage</span>
                {parentSongId.trim() !== "" && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.15)", color: "var(--ln-gold)" }}>linked</span>
                )}
              </div>
              <ChevronDown
                size={14}
                style={{ color: "#64748b", transform: lineageExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </button>

            {/* Expanded body */}
            {lineageExpanded && (
              <div className="px-4 pb-4 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs mb-3" style={{ color: "#64748b" }}>
                  Optionally link this work to a parent work by entering its numeric ID. Leave blank for no lineage.
                </p>
                <Label className="text-xs mb-1 block" style={{ color: "#94a3b8" }}>Parent Work ID</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 12345"
                  value={parentSongId}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setParentSongId(v);
                  }}
                  className="h-8 text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                />
                <p className="text-xs mt-2" style={{ color: "#475569" }}>Saved with Save Changes. Set to blank to remove the link.</p>
              </div>
            )}
          </div>

        </div>

        {/* ── Book Access & Commerce (comic/manuscript only) ───────────────────────────────────── */}
        {isWritten && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Collapsed header */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
              style={{ background: "rgba(255,255,255,0.02)" }}
              onClick={() => setAccessExpanded(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Lock size={14} style={{ color: readAccess !== "open" ? "var(--ln-gold)" : "#64748b" }} />
                <span className="text-sm font-medium" style={{ color: readAccess !== "open" ? "var(--ln-gold)" : "#94a3b8" }}>Access & Commerce</span>
                {readAccess !== "open" && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.15)", color: "var(--ln-gold)" }}>
                    {readAccess === "preview" ? "Preview" : "Locked"}
                  </span>
                )}
              </div>
              <ChevronDown
                size={14}
                style={{ color: "#64748b", transform: accessExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </button>

            {accessExpanded && (
              <div className="px-4 pb-5 pt-3 flex flex-col gap-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

                {/* ── Read Access Mode ── */}
                <div>
                  <Label className="text-xs mb-2 block" style={{ color: "#94a3b8" }}>Read Access</Label>
                  <div className="flex flex-col gap-2">
                    {(["open", "preview", "locked"] as const).map(mode => {
                      const labels: Record<string, { title: string; desc: string }> = {
                        open: { title: "Open", desc: "Anyone can read for free" },
                        preview: { title: "Preview", desc: "First N pages free, rest requires purchase" },
                        locked: { title: "Locked", desc: "No reading without purchase" },
                      };
                      const active = readAccess === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setReadAccess(mode)}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                          style={{
                            background: active ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${active ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)"}`,
                          }}
                        >
                          <div
                            className="mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                            style={{
                              borderColor: active ? "var(--ln-gold)" : "#475569",
                              background: active ? "var(--ln-gold)" : "transparent",
                            }}
                          />
                          <div>
                            <p className="text-xs font-semibold" style={{ color: active ? "var(--ln-gold)" : "#e2e8f0" }}>{labels[mode].title}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{labels[mode].desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Price ── */}
                {(readAccess === "preview" || readAccess === "locked") && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block" style={{ color: "#94a3b8" }}>Purchase Price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#64748b" }}>$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={purchasePriceDollars}
                          onChange={e => setPurchasePriceDollars(e.target.value)}
                          className="h-8 text-xs pl-6"
                          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#475569" }}>Leave blank = not for sale</p>
                    </div>
                    {readAccess === "preview" && (
                      <div className="w-24">
                        <Label className="text-xs mb-1 block" style={{ color: "#94a3b8" }}>Free Pages</Label>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={previewPageCount}
                          onChange={e => setPreviewPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-xs"
                          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Consent Layer ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs" style={{ color: "#94a3b8" }}>Consent Layer</Label>
                    <button
                      type="button"
                      onClick={() => setConsentSettings(s => ({ ...s, enabled: !s.enabled }))}
                      className="relative w-9 h-5 rounded-full transition-colors"
                      style={{ background: consentSettings.enabled ? "rgba(212,175,55,0.7)" : "rgba(255,255,255,0.12)" }}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                        style={{ left: consentSettings.enabled ? "calc(100% - 18px)" : "2px" }}
                      />
                    </button>
                  </div>
                  {consentSettings.enabled && (
                    <div className="flex flex-col gap-2 mt-2">
                      {([
                        ["requireAgeAck", "Age-appropriate acknowledgment"],
                        ["requireAiAck", "AI disclosure acknowledgment"],
                        ["requireNoRedistrib", "No redistribution terms"],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consentSettings[key]}
                            onChange={e => setConsentSettings(s => ({ ...s, [key]: e.target.checked }))}
                            className="w-3.5 h-3.5 accent-yellow-500"
                          />
                          <span className="text-xs" style={{ color: "#94a3b8" }}>{label}</span>
                        </label>
                      ))}
                      <div className="mt-1">
                        <Label className="text-xs mb-1 block" style={{ color: "#94a3b8" }}>Custom consent note (optional)</Label>
                        <Textarea
                          placeholder="e.g. This book contains mature themes. Reader discretion advised."
                          value={consentSettings.customNote}
                          onChange={e => setConsentSettings(s => ({ ...s, customNote: e.target.value }))}
                          className="text-xs resize-none"
                          rows={2}
                          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── External Hosting Links ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-xs" style={{ color: "#94a3b8" }}>External Hosting Links</Label>
                      <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Amazon, Gumroad, your site, etc. — shown as badges on the detail page.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 flex-shrink-0"
                      style={{ borderColor: "rgba(212,175,55,0.3)", color: "var(--ln-gold)", background: "transparent" }}
                      onClick={() => setExternalLinks(prev => [...prev, { platform: "", url: "", label: "" }])}
                    >
                      <Plus size={12} /> Add
                    </Button>
                  </div>
                  {externalLinks.length === 0 ? (
                    <p className="text-xs py-2" style={{ color: "#475569" }}>No external links yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {externalLinks.map((link, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            placeholder="Platform (e.g. Amazon)"
                            value={link.platform}
                            onChange={e => setExternalLinks(prev => prev.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))}
                            className="w-28 h-8 text-xs flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                          />
                          <Input
                            placeholder="https://..."
                            value={link.url}
                            onChange={e => setExternalLinks(prev => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                            className="flex-1 h-8 text-xs"
                            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                          />
                          <button
                            onClick={() => setExternalLinks(prev => prev.filter((_, j) => j !== i))}
                            className="p-1 rounded hover:bg-red-900/30 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={13} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs h-7 px-3 font-semibold self-end"
                  style={{
                    background: saving ? "rgba(196,154,40,0.26)" : "linear-gradient(135deg, #C49A28, #8B6914)",
                    color: "#000",
                  }}
                >
                  {saving ? "Saving…" : "Save Access Settings"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex-shrink-0 px-4 sm:px-6 py-4 flex gap-3"
          style={{
            background: "var(--ln-coal)",
            borderTop: "1px solid rgba(212,175,55,0.15)",
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8", background: "transparent" }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleSave}
            disabled={saving || coverUploading}
            style={{
              background: "linear-gradient(135deg, #C49A28, #8B6914)",
              color: "#000",
              boxShadow: saving ? "none" : "0 0 16px rgba(212,175,55,0.4)",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
