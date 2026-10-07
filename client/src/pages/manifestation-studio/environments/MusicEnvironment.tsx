/* ═══════════════════════════════════════════════════════════════════
   LOOP MUSIC REGISTER
   Easy to start · Hard to fake · Optional to go deep
   Flow: Audio+Visual → Details+Participation → Seal → Draft/Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Upload, Music, Image as ImageIcon, Play, Pause, Shield,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, Sparkles, RefreshCw, CircleHelp, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HistoricalDateField } from "@/components/HistoricalDateField";
import { CreativeCathedralWorkspace } from "@/components/creative-cathedral/CreativeCathedralWorkspace";
import type { CathedralSuggestionPatch } from "@shared/creativeCathedral";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { UPLOAD_GENRES as GENRES, MOODS } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell } from "../StudioShell";
import { RegistrationAssetCard } from "../RegistrationAssetCard";
import {
  assistAudioMetadata,
  buildWaveformPngFromAudio,
  defaultParticipation,
  inspectAudioFile,
  validateIsrc,
  type AudioMetadataEvidence,
  type LoopParticipation,
  type ParticipationValue,
  type PublishIntent,
  type ToneProfile,
  type VisualSource,
  PARTICIPATION_VALUES,
} from "@shared/loopRegistration";
import {
  buildPreparedWorkUploadPayload,
  createPreparedWorkRegistration,
  derivePreparedWorkTone,
  serializePreparedWorkWidPayload,
} from "@shared/preparedWorkRegistration";
import { validateHistoricalDates } from "@shared/workHistoricalDates";
import { applySuggestedWorkGenres, getSuggestedWorkGenres, parseWorkGenres, toggleWorkGenre } from "@shared/workMetadata";
import { isLoopMp3File } from "@/lib/loopProduct";

const atmosphere = ATMOSPHERES.music;

type DetectedMetadataField = "title" | "officialArtistName" | "albumName" | "publisherName" | "isrc" | "creatorReleaseDate";

const VISUAL_SOURCE_COPY: Record<VisualSource, { label: string; detail: string }> = {
  none: { label: "No visual identity attached", detail: "Attach artwork or create a visual identity before public publication." },
  embedded: { label: "Embedded artwork", detail: "Extracted from the selected audio file's metadata." },
  uploaded: { label: "Creator upload", detail: "Selected directly from your device for this Work." },
  generated: { label: "Generated visual", detail: "Created from your prompt and held in local preparation state." },
  remixed: { label: "Remixed visual", detail: "Derived from the prior visual using your prompt." },
};

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function generateECDSAKeypair() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}
async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(payload)
  );
  let binary = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function exportPublicKeyJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });
}

function AxisPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ParticipationValue;
  onChange: (v: ParticipationValue) => void;
}) {
  // Music necessarily has a sound-making axis. Lyrics and Voice can be
  // truthfully absent on an instrumental Work; their stored value is `None`.
  const availableValues = label === "Music"
    ? PARTICIPATION_VALUES.filter((candidate) => candidate !== "None")
    : PARTICIPATION_VALUES;
  const optionLabel = (candidate: ParticipationValue) => {
    if (candidate !== "None") return candidate;
    return label === "Lyrics" ? "No lyrics" : "No voice";
  };

  return (
    <div className="mb-4">
      <p className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--ln-gold)" }}>
        {label}
      </p>
      <div className="flex gap-2">
        {availableValues.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="flex-1 py-2 text-xs rounded-full transition-colors"
            aria-pressed={value === v}
            aria-label={`${label}: ${optionLabel(v)}`}
            style={{
              border: value === v ? "1px solid var(--ln-gold)" : "1px solid rgba(196,154,40,0.2)",
              background: value === v ? "rgba(196,154,40,0.15)" : "transparent",
              color: value === v ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 55%, transparent)",
            }}
          >
            {optionLabel(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExtractedMetadataStatus({
  extracted,
  tooltip,
}: {
  extracted: boolean;
  tooltip?: string;
}) {
  if (!extracted && !tooltip) return null;

  return (
    <span className="inline-flex max-w-full shrink-0 flex-wrap items-center gap-1.5">
      {extracted && (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--ln-gold-hot)" }}>
          <Sparkles aria-hidden="true" className="size-3" /> Extracted
        </span>
      )}
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Field guidance"
              className="inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--ln-gold)_14%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ln-gold-hot)]"
              style={{ color: "var(--ln-gold)" }}
            >
              <CircleHelp aria-hidden="true" className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-xs border" style={{ background: "var(--ln-iron)", color: "var(--ln-parchment)", borderColor: "color-mix(in srgb, var(--ln-gold) 32%, transparent)" }}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

interface MusicEnvironmentProps {
  onBack: () => void;
  pendingFile?: File;
  /** Creator-set, pre-review title proposal. It pre-fills the existing Work title input only. */
  queueReviewTitle?: string;
  /** Creator-set, pre-review editorial proposal. Each Work remains independently editable and date-validated. */
  queueBulkMetadata?: {
    officialArtistName?: string;
    albumName?: string;
    publisherName?: string;
    creatorReleaseDate?: string;
  };
  queueProgress?: {
    current: number;
    total: number;
    completed: number;
    remaining: number;
  };
  /** Returns true only when the parent has safely advanced an in-memory queue. */
  onRegistered?: (data: { songId?: number; witnessId?: string }, registeredTitle: string) => boolean;
  keeperPrefill?: {
    title?: string;
    genre?: string;
    lyrics?: string;
    description?: string;
    caption?: string;
    aiDisclosure?: string;
    moodTags?: string[];
    haaiEmotionalTone?: string;
    haaiOriginStory?: string;
    parentGuideWid?: string;
  };
}

export function MusicEnvironment({ onBack, keeperPrefill, pendingFile, queueReviewTitle, queueBulkMetadata, queueProgress, onRegistered }: MusicEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [step, setStep] = useState<StudioStep>("upload");

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [coverRemoteUrl, setCoverRemoteUrl] = useState<string | null>(null);
  const [visualSource, setVisualSource] = useState<VisualSource>("none");
  const [visualPrompt, setVisualPrompt] = useState("");
  const [visualLineage, setVisualLineage] = useState<Array<{ prompt: string; url: string; at: string }>>([]);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [assisting, setAssisting] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(queueReviewTitle ?? keeperPrefill?.title ?? "");
  const [officialArtistName, setOfficialArtistName] = useState(queueBulkMetadata?.officialArtistName ?? "");
  const [albumName, setAlbumName] = useState(queueBulkMetadata?.albumName ?? "");
  const [publisherName, setPublisherName] = useState(queueBulkMetadata?.publisherName ?? "");
  const [isrc, setIsrc] = useState("");
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [genre, setGenre] = useState(keeperPrefill?.genre ?? "");
  const [creationDate, setCreationDate] = useState("");
  const [creatorReleaseDate, setCreatorReleaseDate] = useState(queueBulkMetadata?.creatorReleaseDate ?? "");
  const [bpm, setBpm] = useState("");
  const [keySignature, setKeySignature] = useState("");
  const [lyrics, setLyrics] = useState(keeperPrefill?.lyrics ?? "");
  const [selectedMoods, setSelectedMoods] = useState<string[]>(keeperPrefill?.moodTags ?? []);
  const [caption, setCaption] = useState(keeperPrefill?.caption ?? "");
  const [originStory, setOriginStory] = useState(keeperPrefill?.haaiOriginStory ?? "");
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");
  const [participation, setParticipation] = useState<LoopParticipation>(defaultParticipation());
  const [attested, setAttested] = useState(false);
  const [publishIntent, setPublishIntent] = useState<PublishIntent>("Draft");
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>();
  const [audioEvidence, setAudioEvidence] = useState<AudioMetadataEvidence | null>(null);
  const [detectedRecordReviewed, setDetectedRecordReviewed] = useState(false);
  const [autoExtractedFields, setAutoExtractedFields] = useState<Partial<Record<DetectedMetadataField, true>>>({});
  const visualSourceCopy = VISUAL_SOURCE_COPY[visualSource];
  const detectedRecordFields = [
    { label: "Title", value: audioEvidence?.title },
    { label: audioEvidence?.albumArtist ? "Album artist" : "Artist", value: audioEvidence?.albumArtist ?? audioEvidence?.artist },
    { label: "Album", value: audioEvidence?.album },
    { label: "Publisher / label", value: audioEvidence?.publisher },
    { label: "ISRC", value: audioEvidence?.isrc },
    { label: "Original release date", value: audioEvidence?.originalReleaseDate },
  ].filter((field): field is { label: string; value: string } => Boolean(field.value));
  const hasDetectedRecord = detectedRecordFields.length > 0;
  const isrcValidationError = validateIsrc(isrc);
  const releaseDateValidationError = validateHistoricalDates({
    creationDate,
    originalReleaseDate: creatorReleaseDate,
  });
  const detectedRecordValidationError = isrcValidationError ?? releaseDateValidationError;
  const queueBulkPrefillFields = [
    { label: "Artist", value: queueBulkMetadata?.officialArtistName },
    { label: "Album", value: queueBulkMetadata?.albumName },
    { label: "Publisher", value: queueBulkMetadata?.publisherName },
    { label: "Original Release Date", value: queueBulkMetadata?.creatorReleaseDate },
  ].filter((field): field is { label: string; value: string } => Boolean(field.value?.trim()));
  const clearExtractedMarker = (field: DetectedMetadataField) => {
    setAutoExtractedFields((current) => ({ ...current, [field]: undefined }));
  };

  const [witnessData, setWitnessData] = useState<{
    wid: string;
    fileHash: string;
    publicKeyJWK: string;
    signature: string;
    timestamp: string;
  } | null>(null);
  const [toneProfile, setToneProfile] = useState<ToneProfile | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done">("idle");
  const [clearingGenres, setClearingGenres] = useState(false);

  const generateImage = trpc.guides.generateImage.useMutation();
  const remixImage = trpc.guides.remixImage.useMutation();

  const prepareWorkRegistration = () =>
    createPreparedWorkRegistration({
      audioFile,
      coverFile,
      coverRemoteUrl,
      visualSource,
      visualPrompt,
      visualLineage,
      title,
      officialArtistName,
      albumName,
      publisherName,
      isrc,
      collectionId,
      genre,
      bpm,
      keySignature,
      lyrics,
      moodTags: selectedMoods,
      caption,
      originStory,
      aiConsent,
      participation,
      publishIntent,
      durationSeconds,
      releaseDate: creationDate,
      creatorReleaseDate,
    });

  const { data: creatorProfile } = trpc.profile.me.useQuery(undefined, { enabled: !!user });
  const { data: creatorAlbums = [] } = trpc.collectionStudio.listMine.useQuery(undefined, { enabled: !!user });
  const creatorGenreSuggestions = useMemo(
    () => getSuggestedWorkGenres(creatorProfile?.primaryGenre, genre),
    [creatorProfile?.primaryGenre, genre]
  );

  const clearWorkGenres = useCallback(() => {
    if (!window.confirm("Clear all selected genres for this Work? This only resets the current form until you Save or Publish.")) return;
    setClearingGenres(true);
    window.setTimeout(() => {
      setGenre("");
      setClearingGenres(false);
    }, 180);
  }, []);

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (coverRemoteUrl) setCoverPreview(coverRemoteUrl);
    else setCoverPreview("");
  }, [coverFile, coverRemoteUrl]);

  // Consume pending file from upload engine
  useEffect(() => {
    if (pendingFile) void ingestAudio(pendingFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  const ingestAudio = async (file: File) => {
    setAudioFile(file);
    setAudioEvidence(null);
    setDetectedRecordReviewed(false);
    setAutoExtractedFields({});
    setWitnessData(null);
    setToneProfile(null);
    setAssisting(true);
    try {
      const inspection = await inspectAudioFile(file);
      const assist = inspection.assistance;
      const extracted: Partial<Record<DetectedMetadataField, true>> = {};
      setAudioEvidence(inspection.evidence);
      if (assist.title && !title) {
        setTitle(assist.title);
        extracted.title = true;
      }
      if (assist.genre && !genre) setGenre(assist.genre);
      if (assist.bpm) setBpm(String(assist.bpm));
      if (assist.keySignature) setKeySignature(assist.keySignature);
      if (assist.lyrics && !lyrics) setLyrics(assist.lyrics);
      if (assist.durationSeconds) setDurationSeconds(assist.durationSeconds);
      const detectedArtist = inspection.evidence.albumArtist ?? inspection.evidence.artist;
      if (detectedArtist && !officialArtistName) {
        setOfficialArtistName(detectedArtist);
        extracted.officialArtistName = true;
      }
      if (inspection.evidence.album && !albumName) {
        setAlbumName(inspection.evidence.album);
        extracted.albumName = true;
      }
      if (inspection.evidence.publisher && !publisherName) {
        setPublisherName(inspection.evidence.publisher);
        extracted.publisherName = true;
      }
      if (inspection.evidence.isrc && !isrc) {
        setIsrc(inspection.evidence.isrc);
        extracted.isrc = true;
      }
      if (inspection.evidence.originalReleaseDate && !creatorReleaseDate) {
        setCreatorReleaseDate(inspection.evidence.originalReleaseDate);
        extracted.creatorReleaseDate = true;
      }
      setAutoExtractedFields(extracted);

      if (!coverFile && !coverRemoteUrl) {
        const embedded = inspection.embeddedCover;
        if (embedded) {
          setCoverFile(embedded);
          setVisualSource("embedded");
          toast.success("Embedded cover merged from metadata");
        }
      } else {
        toast.success("Audio loaded — metadata suggestions applied where found");
      }
    } catch {
      setAudioEvidence({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
        genres: [],
        comments: [],
        productionHints: [],
      });
      toast.success("Audio loaded");
    } finally {
      setAssisting(false);
    }
  };

  const progress =
    step === "upload"
      ? audioFile
        ? 25
        : 5
      : step === "metadata"
        ? title
          ? 55
          : 35
        : step === "provenance"
          ? witnessData
            ? 85
            : 65
          : 95;

  const uploadFileToS3 = async (
    file: File,
    type: "audio" | "cover" | "video"
  ): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("filename", file.name);
    if (type === "audio" && queueProgress) formData.append("loopIntake", "mp3-queue");
    formData.append("file", file);
    const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return res.json();
  };

  const runGenerateVisual = async (mode: "generate" | "remix") => {
    if (!visualPrompt.trim()) {
      toast.error("Enter a prompt for the visual");
      return;
    }
    setGeneratingVisual(true);
    try {
      let url: string;
      if (mode === "remix" && (coverRemoteUrl || coverPreview)) {
        // Prefer remote URL; if only local file, upload first
        let source = coverRemoteUrl;
        if (!source && coverFile) {
          const up = await uploadFileToS3(coverFile, "cover");
          source = up.url;
          setCoverRemoteUrl(up.url);
        }
        if (!source) throw new Error("No source visual to remix");
        const res = await remixImage.mutateAsync({
          sourceImageUrl: source,
          prompt: visualPrompt.trim(),
        } as any);
        url = (res as any).url;
        setVisualSource("remixed");
      } else {
        const toneHint = [genre, keySignature, bpm ? `${bpm} BPM` : "", selectedMoods.join(", ")]
          .filter(Boolean)
          .join(" · ");
        const res = await generateImage.mutateAsync({
          prompt: `${visualPrompt.trim()}${toneHint ? `. Musical context: ${toneHint}` : ""}`,
        } as any);
        url = (res as any).url;
        setVisualSource("generated");
      }
      setCoverRemoteUrl(url);
      setCoverFile(null);
      setVisualLineage((prev) => [...prev, { prompt: visualPrompt.trim(), url, at: new Date().toISOString() }]);
      toast.success(mode === "remix" ? "Visual remixed" : "Visual generated");
    } catch (e: any) {
      toast.error(e?.message || "Visual generation failed");
    } finally {
      setGeneratingVisual(false);
    }
  };

  const generateWID = async () => {
    if (!audioFile || !title.trim()) {
      toast.error("Audio and title required before seal");
      return;
    }
    if (hasDetectedRecord && !detectedRecordReviewed) {
      toast.error("Review the detected record details before sealing");
      return;
    }
    if (detectedRecordValidationError) {
      toast.error(detectedRecordValidationError);
      return;
    }
    setGeneratingWid(true);
    try {
      const prepared = prepareWorkRegistration();
      const buffer = await audioFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const tone = derivePreparedWorkTone(prepared);
      const payload = serializePreparedWorkWidPayload({
        fileHash,
        title: prepared.metadata.title,
        participation: prepared.metadata.participation,
        toneLabel: tone.label,
        timestamp,
      });
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const wid = `WID-MUS-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
      setToneProfile(tone);
      setWitnessData({ wid, fileHash, publicKeyJWK, signature, timestamp });
      toast.success("WID sealed — tone locked from metadata");
    } catch (err: any) {
      toast.error("WID generation failed: " + (err?.message || "Unknown error"));
    } finally {
      setGeneratingWid(false);
    }
  };

  const uploadMutation = trpc.songs.upload.useMutation({
    onSuccess: (data: any) => {
      setUploadPhase("done");
      // Registration can change a creator's Work lists and an assigned album's
      // track count. Invalidate existing read surfaces before navigation so the
      // returned view cannot present stale placement state.
      void utils.songs.mySongs.invalidate();
      void utils.songs.getMyCollections.invalidate();
      void utils.songs.exploreIndex.invalidate();
      void utils.collectionStudio.listMine.invalidate();
      void utils.collectionStudio.getAvailableSongs.invalidate();
      void utils.collectionStudio.getCollection.invalidate();
      void utils.songs.getCollectionTracks.invalidate();
      void utils.songs.getCollectionForSong.invalidate();
      if (data?.witnessId && title) {
        addWIDSnapshot({
          wid: data.witnessId,
          title,
          creator: "",
          contentType: "music",
          timestamp: Date.now(),
          verified: true,
        });
      }
      toast.success(
        publishIntent === "Published"
          ? "Published to the registry"
          : "Saved as draft — seal retained"
      );
      if (onRegistered?.(data ?? {}, title)) return;
      if (data?.songId) navigate(`/song/${data.songId}`);
      else navigate("/manage");
    },
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setUploadPhase("idle");
    },
  });

  const handlePublish = async () => {
    if (!audioFile || !title.trim()) {
      toast.error("Audio and title are required");
      return;
    }
    if (!attested) {
      toast.error("Confirm participation attestation to continue");
      return;
    }
    if (!witnessData) {
      toast.error("Seal a WID first");
      return;
    }
    const hasVisual = !!(coverFile || coverRemoteUrl);
    if (publishIntent === "Published" && !hasVisual) {
      toast.error("Publish requires a visual identity");
      return;
    }
    const historicalDateError = validateHistoricalDates({
      creationDate,
      originalReleaseDate: creatorReleaseDate,
    });
    if (historicalDateError) {
      toast.error(historicalDateError);
      return;
    }

    setUploadPhase("uploading");
    try {
      const prepared = prepareWorkRegistration();
      const { url: fileUrl, key: fileKey } = await uploadFileToS3(audioFile, "audio");
      let coverArtUrl = prepared.assets.coverRemoteUrl || undefined;
      let resolvedVisualSource = prepared.metadata.visualSource;
      if (prepared.assets.coverFile) {
        const { url } = await uploadFileToS3(prepared.assets.coverFile, "cover");
        coverArtUrl = url;
        if (prepared.metadata.visualSource === "none" || prepared.metadata.visualSource === "embedded") {
          resolvedVisualSource = prepared.metadata.visualSource === "embedded" ? "embedded" : "uploaded";
        }
      }

      // Waveform from canonical audio
      let waveformUrl: string | undefined;
      let waveformKey: string | undefined;
      try {
        const png = await buildWaveformPngFromAudio(audioFile);
        const wfFile = new File([png], `waveform-${Date.now()}.png`, { type: "image/png" });
        const wf = await uploadFileToS3(wfFile, "cover");
        waveformUrl = wf.url;
        waveformKey = wf.key;
      } catch {
        /* non-blocking */
      }

      const tone = toneProfile || derivePreparedWorkTone(prepared);

      uploadMutation.mutate(
        buildPreparedWorkUploadPayload(prepared, {
          fileUrl,
          fileKey,
          coverArtUrl,
          fileHash: witnessData.fileHash,
          witnessId: witnessData.wid,
          publicKeyJWK: witnessData.publicKeyJWK,
          signature: witnessData.signature,
          tone,
          waveformUrl,
          waveformKey,
          visualSource: hasVisual ? resolvedVisualSource : "none",
        }) as any
      );
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadPhase("idle");
    }
  };

  const ingestCandidateAudio = (file: File) => {
    if (queueProgress && !isLoopMp3File(file)) {
      toast.error("MP3 Queue accepts .mp3 audio only. This queue does not replace the single-record audio path.");
      return;
    }
    void ingestAudio(file);
  };

  const canAdvanceFromUpload = !!audioFile;
  const canAdvanceFromMeta =
    !!title.trim() && attested && participation.music && participation.lyrics && participation.voice &&
    (!hasDetectedRecord || detectedRecordReviewed) && !detectedRecordValidationError;

  const applyCathedralPatch = useCallback((patch: CathedralSuggestionPatch) => {
    const nextCreationDate = patch.creationDate ?? creationDate;
    const nextOriginalReleaseDate = patch.originalReleaseDate ?? creatorReleaseDate;
    const historicalDateError = validateHistoricalDates({
      creationDate: nextCreationDate,
      originalReleaseDate: nextOriginalReleaseDate,
    });
    if (historicalDateError) {
      toast.error(historicalDateError);
      return;
    }
    if (patch.title !== undefined) {
      setTitle(patch.title);
      clearExtractedMarker("title");
    }
    if (patch.genre !== undefined) setGenre(patch.genre);
    if (patch.bpm !== undefined) setBpm(patch.bpm === null ? "" : String(patch.bpm));
    if (patch.keySignature !== undefined) setKeySignature(patch.keySignature ?? "");
    if (patch.moodTags !== undefined) setSelectedMoods(patch.moodTags);
    if (patch.caption !== undefined) setCaption(patch.caption);
    if (patch.creationDate !== undefined) setCreationDate(patch.creationDate);
    if (patch.originalReleaseDate !== undefined) {
      setCreatorReleaseDate(patch.originalReleaseDate);
      clearExtractedMarker("creatorReleaseDate");
    }
    if (patch.participationMusic !== undefined) setParticipation((previous) => ({ ...previous, music: patch.participationMusic! }));
    if (patch.participationLyrics !== undefined) setParticipation((previous) => ({ ...previous, lyrics: patch.participationLyrics! }));
    if (patch.participationVoice !== undefined) setParticipation((previous) => ({ ...previous, voice: patch.participationVoice! }));
  }, [creationDate, creatorReleaseDate]);

  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-8">
            <div className="max-w-2xl border-l-2 pl-5" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 58%, transparent)" }}>
              <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                Loop · Register Work
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-parchment)" }}>
                {queueProgress ? "Review this Work" : "Prepare this Work"}
              </h1>
              <p className="mt-3 max-w-xl text-lg leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-bone)" }}>
                Confirm the canonical audio, then attach the visual identity that will accompany this Work.
              </p>
              {queueProgress && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                  This record remains independent: its metadata, participation disclosure, attestation, and Witness ID are reviewed here—not inherited from the rest of the queue.
                </p>
              )}
            </div>

            <RegistrationAssetCard
              id="music-register-canonical-audio"
              sectionNumber="01"
              eyebrow="Canonical artifact"
              title={audioFile ? "Canonical audio received" : "Choose canonical audio"}
              description={audioFile
                ? "Metadata is ready for your review. Replace only if this is not the file you intend to witness."
                : queueProgress
                  ? "This queued record must remain an MP3. Its canonical audio hash will be used only for this Work's Witness ID."
                  : "This exact audio file establishes the canonical audio hash used when the Witness ID is sealed."}
              status={audioFile
                ? `Ready for review: ${audioFile.name}`
                : queueProgress
                  ? `MP3 Queue · record ${queueProgress.current} of ${queueProgress.total}`
                  : "Required before you can continue to Details and participation."}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full text-sm sm:w-auto"
                  onClick={() => audioInputRef.current?.click()}
                >
                  {audioFile ? "Replace audio" : "Choose audio"}
                </Button>
              }
            >
              <label
                htmlFor="music-register-audio-file"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) ingestCandidateAudio(f);
                }}
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border border-dashed px-6 py-7 text-center"
                style={{
                  borderColor: audioFile ? "rgba(74,222,128,0.5)" : "rgba(196,154,40,0.35)",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                <input
                  id="music-register-audio-file"
                  ref={audioInputRef}
                  type="file"
                  accept={queueProgress ? ".mp3,audio/mpeg,audio/mp3" : "audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"}
                  aria-label="Choose canonical audio file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) ingestCandidateAudio(f);
                    e.target.value = "";
                  }}
                />
                {assisting ? (
                  <Loader2 className="animate-spin" style={{ color: "var(--ln-gold)" }} />
                ) : audioFile ? (
                  <>
                    <CheckCircle2 className="h-6 w-6" style={{ color: "#4ADE80" }} />
                    <p
                      className="line-clamp-2 max-w-full break-all text-sm leading-relaxed"
                      title={audioFile.name}
                      style={{ color: "var(--ln-parchment)" }}
                    >
                      {audioFile.name}
                    </p>
                  </>
                ) : (
                  <>
                    <Music className="h-6 w-6 opacity-60" style={{ color: "var(--ln-gold)" }} />
                    <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>
                      {queueProgress ? "Drop canonical MP3" : "Drop canonical audio (MP3, WAV, FLAC…)"}
                    </p>
                  </>
                )}
              </label>
            </RegistrationAssetCard>

            <RegistrationAssetCard
              id="music-register-visual-identity"
              sectionNumber="02"
              eyebrow="Visual identity"
              title="Artwork for this Work"
              description="Visual identity is attached to this Work for presentation and publication. It is not part of the WID hash."
              interactive
              status={coverPreview
                ? `${visualSourceCopy.label} is attached to this Work.`
                : "Optional for draft. Required before public publication."}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full text-sm sm:w-auto"
                  onClick={() => coverInputRef.current?.click()}
                  aria-describedby="music-register-artwork-source"
                >
                  {coverPreview ? "Replace artwork" : "Upload artwork"}
                </Button>
              }
            >
              <input
                ref={coverInputRef}
                id="music-register-cover-file"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setCoverFile(f);
                    setCoverRemoteUrl(null);
                    setVisualSource("uploaded");
                  }
                }}
              />
              <div className="registration-artwork-preview grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-sm border p-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-center sm:p-4" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 22%, transparent)", background: "color-mix(in srgb, var(--ln-coal) 84%, var(--ln-gold))" }}>
                <div className="registration-artwork-preview__image relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm" style={{ background: "color-mix(in srgb, var(--ln-gold) 6%, var(--ln-coal))", border: "1px solid color-mix(in srgb, var(--ln-gold) 22%, transparent)" }}>
                  {coverPreview ? (
                    <img src={coverPreview} alt={`${visualSourceCopy.label} preview`} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon size={22} style={{ color: "rgba(245,237,216,0.45)" }} />
                  )}
                  <span className="absolute bottom-1 left-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.82)", color: "var(--ln-gold)" }}>
                    {visualSource === "none" ? "No source" : visualSource}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{visualSourceCopy.label}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ln-bone)" }}>{visualSourceCopy.detail}</p>
                  {visualSource === "uploaded" && coverFile?.name && (
                    <p className="mt-1 line-clamp-2 break-all text-xs" title={coverFile.name} style={{ color: "rgba(245,237,216,0.52)" }}>{coverFile.name}</p>
                  )}
                </div>
              </div>
              <span id="music-register-artwork-source" className="sr-only">Current visual identity source: {visualSourceCopy.label}</span>

              <div className="mt-4 space-y-3">
                <Textarea
                  value={visualPrompt}
                  onChange={(e) => setVisualPrompt(e.target.value)}
                  placeholder="Visual prompt — generate or remix artwork"
                  className="min-h-[88px] bg-transparent text-sm"
                  style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={generatingVisual || !visualPrompt.trim()}
                    onClick={() => runGenerateVisual("generate")}
                    className="min-h-11 gap-1 text-sm"
                    style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)" }}
                  >
                    {generatingVisual ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate artwork
                  </Button>
                  <Button
                    type="button"
                    disabled={generatingVisual || !visualPrompt.trim() || !coverPreview}
                    onClick={() => runGenerateVisual("remix")}
                    className="min-h-11 gap-1 text-sm"
                    style={{ background: "transparent", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.3)" }}
                  >
                    <RefreshCw size={14} /> Remix artwork
                  </Button>
                </div>
              </div>
            </RegistrationAssetCard>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  if (!canAdvanceFromUpload) {
                    toast.error("Add audio first");
                    return;
                  }
                  setStep("metadata");
                }}
                disabled={!canAdvanceFromUpload}
                className="gap-2"
                style={{ background: "var(--ln-gold)", color: "#000" }}
              >
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "metadata":
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Details & participation
              </h2>
              <p className="text-sm" style={{ color: "rgba(245,237,216,0.6)", fontFamily: "'Cormorant Garamond', serif" }}>
                Confirm who participated. Suggestions are marked — you attest the truth.
              </p>
            </div>

            {hasDetectedRecord && (
              <section
                aria-labelledby="detected-record-title"
                className="rounded-sm border p-4"
                style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 38%, transparent)", background: "color-mix(in srgb, var(--ln-gold) 5%, var(--ln-coal))" }}
              >
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                  Detected record
                </p>
                <h3 id="detected-record-title" className="mt-1 text-lg font-semibold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif" }}>
                  Review embedded audio evidence
                </h3>
                <p id="detected-record-boundary" className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>
                  These suggestions came from the selected audio file. Confirm or correct the editable fields below; they never replace your Living Nexus creator identity or alter the source file.
                </p>
                <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  {detectedRecordFields.map((field) => (
                    <div key={field.label} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "color-mix(in srgb, var(--ln-gold) 78%, transparent)" }}>{field.label}</dt>
                      <dd className="mt-0.5 break-words text-sm" style={{ color: "var(--ln-parchment)" }}>{field.value}</dd>
                    </div>
                  ))}
                </dl>
                {detectedRecordValidationError && (
                  <p id="detected-record-validation" role="alert" className="mt-3 rounded-sm border px-3 py-2 text-sm leading-relaxed" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 48%, transparent)", background: "color-mix(in srgb, var(--ln-gold) 9%, var(--ln-coal))", color: "var(--ln-parchment)" }}>
                    {detectedRecordValidationError}
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 62%, transparent)" }}>
                    The <Sparkles aria-hidden="true" className="mx-0.5 inline size-3" style={{ color: "var(--ln-gold-hot)" }} /> Extracted marker identifies values populated from this audio file.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(detectedRecordValidationError)}
                    onClick={() => {
                      setDetectedRecordReviewed(true);
                      toast.success("Detected record approved — ready to seal when you are.");
                    }}
                    aria-describedby={detectedRecordValidationError ? "detected-record-validation" : "detected-record-boundary"}
                    className="min-h-11 shrink-0 gap-2 border-[color-mix(in_srgb,var(--ln-gold)_45%,transparent)] text-sm text-[var(--ln-gold)] hover:bg-[color-mix(in_srgb,var(--ln-gold)_10%,transparent)]"
                  >
                    <CheckCircle2 aria-hidden="true" className="size-4" /> Approve All
                  </Button>
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-sm border p-3" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 22%, transparent)", background: "color-mix(in srgb, var(--ln-coal) 90%, var(--ln-gold))" }}>
                  <input
                    type="checkbox"
                    checked={detectedRecordReviewed}
                    onChange={(event) => setDetectedRecordReviewed(event.target.checked)}
                    aria-describedby="detected-record-boundary"
                    className="mt-1"
                  />
                  <span className="text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>
                    I reviewed the detected record and confirm or correct these details before the Witness ID is sealed.
                  </span>
                </label>
              </section>
            )}

            <label className="block space-y-1.5">
              <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>
                <span>Work title</span>
                <ExtractedMetadataStatus extracted={Boolean(autoExtractedFields.title)} />
              </span>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearExtractedMarker("title");
                }}
                placeholder="Work title *"
                aria-label="Work title"
                className="bg-transparent"
                style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
              />
            </label>

            <section className="space-y-3 rounded-sm border p-4" aria-labelledby="distribution-record-title" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 23%, transparent)", background: "color-mix(in srgb, var(--ln-coal) 92%, var(--ln-gold))" }}>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>Record identifiers</p>
                <h3 id="distribution-record-title" className="mt-1 text-base font-semibold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif" }}>Industry metadata</h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ln-bone)" }}>
                  Editable Work metadata. It is kept separate from your Living Nexus handle and does not expand the current WID payload.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}><span>Official artist / album artist</span><ExtractedMetadataStatus extracted={Boolean(autoExtractedFields.officialArtistName)} /></span>
                  <Input value={officialArtistName} onChange={(event) => { setOfficialArtistName(event.target.value); clearExtractedMarker("officialArtistName"); }} placeholder="Embedded artist attribution" className="bg-transparent" style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }} />
                </label>
                <label className="block space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}><span>Album metadata</span><ExtractedMetadataStatus extracted={Boolean(autoExtractedFields.albumName)} /></span>
                  <Input value={albumName} onChange={(event) => { setAlbumName(event.target.value); clearExtractedMarker("albumName"); }} placeholder="Embedded album name" className="bg-transparent" style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }} />
                </label>
                <label className="block space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}><span>Publisher / label</span><ExtractedMetadataStatus extracted={Boolean(autoExtractedFields.publisherName)} /></span>
                  <Input value={publisherName} onChange={(event) => { setPublisherName(event.target.value); clearExtractedMarker("publisherName"); }} placeholder="Recorded as a Work credit" className="bg-transparent" style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }} />
                </label>
                <label className="block space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}><span>ISRC</span><ExtractedMetadataStatus extracted={Boolean(autoExtractedFields.isrc)} tooltip="An ISRC identifies a sound recording. It does not establish authorship or replace a WID. Use 12 characters, for example US-ABC-24-12345." /></span>
                  <Input value={isrc} onChange={(event) => { setIsrc(event.target.value.toUpperCase()); clearExtractedMarker("isrc"); }} placeholder="International Standard Recording Code" aria-invalid={Boolean(isrcValidationError)} aria-describedby={isrcValidationError ? "isrc-help isrc-validation" : "isrc-help"} className="bg-transparent font-mono" style={{ borderColor: isrcValidationError ? "var(--ln-gold-hot)" : "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }} />
                  <span id="isrc-help" className="block text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }}>Optional recording identifier. Hyphens and spaces are accepted.</span>
                  {isrcValidationError && <span id="isrc-validation" role="alert" className="block text-[11px] leading-relaxed" style={{ color: "var(--ln-gold-hot)" }}>{isrcValidationError}</span>}
                </label>
              </div>
            </section>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>Living Nexus Collection placement</span>
              <select
                aria-label="Place this Work in an existing album"
                value={collectionId ?? ""}
                onChange={(event) => setCollectionId(event.target.value ? Number(event.target.value) : null)}
                className="w-full rounded-sm bg-transparent px-3 py-2 text-sm"
                style={{ border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
              >
                <option value="" style={{ color: "#000" }}>No album — keep this Work unassigned</option>
                {creatorAlbums.map((album: { id: number; name: string; trackCount: number }) => (
                  <option key={album.id} value={album.id} style={{ color: "#000" }}>
                    {album.name} · {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                  </option>
                ))}
              </select>
              <span className="block text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 52%, transparent)" }}>
                Optional creator organization, distinct from the embedded album metadata above. It does not change this Work’s WID, signature, dates, or publication state.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setGenre(toggleWorkGenre(genre, e.target.value) ?? "");
                }}
                className="bg-transparent text-sm px-3 py-2 rounded-sm"
                style={{ border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
              >
                <option value="">Add genre</option>
                {GENRES.map((g) => (
                  <option key={g} value={g} style={{ color: "#000" }}>
                    {g}
                  </option>
                ))}
              </select>
              <Input
                value={bpm}
                onChange={(e) => setBpm(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="BPM"
                className="bg-transparent"
                style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
              />
            </div>
            {parseWorkGenres(genre).length > 0 && (
              <div className="space-y-2" aria-label="Selected genres">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--ln-parchment) 58%, transparent)" }}>
                    Selected for this Work
                  </span>
                  <button
                    type="button"
                    onClick={clearWorkGenres}
                    disabled={clearingGenres}
                    className="text-[11px] underline underline-offset-4 transition-colors disabled:opacity-60"
                    style={{ color: "var(--ln-gold)" }}
                    aria-label="Clear all selected genres for this Work"
                  >
                    Clear All
                  </button>
                </div>
                <div className={`flex flex-wrap gap-2 ${clearingGenres ? "work-genre-selection-clearing" : ""}`} aria-live="polite">
                  {parseWorkGenres(genre).map((selectedGenre) => (
                    <button
                      key={selectedGenre}
                      type="button"
                      onClick={() => setGenre(toggleWorkGenre(genre, selectedGenre) ?? "")}
                      className="text-[11px] px-2 py-1 rounded-full"
                      style={{ border: "1px solid var(--ln-gold)", color: "var(--ln-gold)", background: "rgba(196,154,40,0.1)" }}
                      aria-label={`Remove ${selectedGenre} genre`}
                    >
                      {selectedGenre} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
            {creatorGenreSuggestions.length > 0 && (
              <div className="space-y-2" aria-label="Genre suggestions from your profile">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 52%, transparent)" }}>
                    From your creator profile — optional suggestions. Select only what describes this Work.
                  </p>
                  <button
                    type="button"
                    onClick={() => setGenre(applySuggestedWorkGenres(creatorProfile?.primaryGenre, genre) ?? "")}
                    className="shrink-0 text-[11px] underline underline-offset-4 transition-colors"
                    style={{ color: "var(--ln-gold)" }}
                    aria-label="Add all suggested profile genres to this Work"
                  >
                    Select All Suggested
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {creatorGenreSuggestions.map((suggestedGenre) => (
                      <button
                        key={suggestedGenre}
                        type="button"
                        onClick={() => setGenre(toggleWorkGenre(genre, suggestedGenre) ?? "")}
                        className="text-[11px] px-2 py-1 rounded-full"
                        style={{
                          border: "1px solid rgba(196,154,40,0.42)",
                          color: "color-mix(in srgb, var(--ln-parchment) 72%, transparent)",
                          background: "rgba(196,154,40,0.04)",
                        }}
                        aria-label={`Add suggested ${suggestedGenre} genre for this Work`}
                      >
                        + {suggestedGenre}
                      </button>
                  ))}
                </div>
              </div>
            )}
            <Input
              value={keySignature}
              onChange={(e) => setKeySignature(e.target.value)}
              placeholder="Key (e.g. Am)"
              className="bg-transparent"
              style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HistoricalDateField
                id="music-creation-date"
                label="Creation Date"
                value={creationDate}
                onChange={setCreationDate}
                maxDate={creatorReleaseDate}
                helpText="When you created this Work. Creator-declared."
              />
              <HistoricalDateField
                id="music-original-release-date"
                label="Original Release Date"
                value={creatorReleaseDate}
                onChange={(value) => {
                  setCreatorReleaseDate(value);
                  clearExtractedMarker("creatorReleaseDate");
                }}
                minDate={creationDate}
                helpText="When this Work was first released, if applicable. Creator-declared."
                labelAdornment={
                  <ExtractedMetadataStatus
                    extracted={Boolean(autoExtractedFields.creatorReleaseDate)}
                    tooltip="Original Release Date is the first release of this Work, if known. It is creator-declared and distinct from the Living Nexus registry timestamp."
                  />
                }
              />
              {releaseDateValidationError && (
                <p id="release-date-validation" role="alert" className="sm:col-span-2 text-[11px] leading-relaxed" style={{ color: "var(--ln-gold-hot)" }}>
                  {releaseDateValidationError}
                </p>
              )}
              <p className="sm:col-span-2 text-[11px]" style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}>
                Creator-declared work history. The WID assignment and publication timestamps are system records and cannot be edited here.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {MOODS.slice(0, 12).map((m) => {
                const on = selectedMoods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setSelectedMoods((prev) => (on ? prev.filter((x) => x !== m) : [...prev, m]))
                    }
                    className="text-[11px] px-2 py-1 rounded-full"
                    style={{
                      border: on ? "1px solid var(--ln-gold)" : "1px solid rgba(196,154,40,0.2)",
                      color: on ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 50%, transparent)",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="pt-2" style={{ borderTop: "1px solid rgba(196,154,40,0.15)" }}>
              <p className="text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: "var(--ln-gold)" }}>
                Who participated?
              </p>
              <AxisPicker
                label="Music"
                value={participation.music}
                onChange={(v) => setParticipation((p) => ({ ...p, music: v }))}
              />
              <AxisPicker
                label="Lyrics"
                value={participation.lyrics}
                onChange={(v) => setParticipation((p) => ({ ...p, lyrics: v }))}
              />
              <AxisPicker
                label="Voice"
                value={participation.voice}
                onChange={(v) => setParticipation((p) => ({ ...p, voice: v }))}
              />
            </div>

            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Lyrics (shown on the work page)"
              className="min-h-[100px] bg-transparent text-sm"
              style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
            />
            <Textarea
              value={originStory}
              onChange={(e) => setOriginStory(e.target.value)}
              placeholder="Origin / process (optional depth)"
              className="min-h-[72px] bg-transparent text-sm"
              style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm" style={{ color: "color-mix(in srgb, var(--ln-parchment) 75%, transparent)" }}>
                I attest that the participation declarations above are true to the best of my knowledge.
              </span>
            </label>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep("upload")} className="gap-1 text-sm">
                <ChevronLeft size={14} /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!canAdvanceFromMeta) {
                    toast.error("Title + attestation required");
                    return;
                  }
                  setStep("provenance");
                }}
                disabled={!canAdvanceFromMeta}
                className="gap-2"
                style={{ background: "var(--ln-gold)", color: "#000" }}
              >
                Seal <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "provenance":
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              Seal the record
            </h2>
            <p className="text-sm" style={{ color: "rgba(245,237,216,0.65)", fontFamily: "'Cormorant Garamond', serif" }}>
              WID · tone-from-metadata · waveform from your audio
            </p>

            {!witnessData ? (
              <Button
                onClick={generateWID}
                disabled={generatingWid}
                className="gap-2 w-full"
                style={{ background: "var(--ln-gold)", color: "#000" }}
              >
                {generatingWid ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                Generate WID
              </Button>
            ) : (
              <div className="space-y-3 p-4 rounded-sm" style={{ border: "1px solid rgba(196,154,40,0.35)" }}>
                <p className="font-mono text-sm" style={{ color: "var(--ln-gold)" }}>
                  {witnessData.wid}
                </p>
                {toneProfile && (
                  <p className="text-sm" style={{ color: "color-mix(in srgb, var(--ln-parchment) 80%, transparent)" }}>
                    Tone: {toneProfile.label}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep("metadata")} className="gap-1 text-sm">
                <ChevronLeft size={14} /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!witnessData) {
                    toast.error("Generate WID first");
                    return;
                  }
                  setStep("publish");
                }}
                disabled={!witnessData}
                className="gap-2"
                style={{ background: "var(--ln-gold)", color: "#000" }}
              >
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "publish":
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              Draft or publish
            </h2>
            <p className="text-sm" style={{ color: "rgba(245,237,216,0.65)" }}>
              Explicit choice — nothing goes public by accident. Publish requires a visual identity and a witness-ready profile.
            </p>

            <div className="flex gap-2">
              {(["Draft", "Published"] as PublishIntent[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPublishIntent(s)}
                  className="flex-1 py-3 text-sm rounded-full"
                  style={{
                    border: publishIntent === s ? "1px solid var(--ln-gold)" : "1px solid rgba(196,154,40,0.2)",
                    background: publishIntent === s ? "rgba(196,154,40,0.15)" : "transparent",
                    color: publishIntent === s ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 55%, transparent)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <ul className="text-xs space-y-1" style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }}>
              <li>Title: {title}</li>
              <li>WID: {witnessData?.wid}</li>
              <li>Visual: {coverPreview ? visualSource : "none"}</li>
              <li>
                Participation: Music {participation.music} · Lyrics {participation.lyrics} · Voice{" "}
                {participation.voice}
              </li>
            </ul>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep("provenance")} className="gap-1 text-sm">
                <ChevronLeft size={14} /> Back
              </Button>
              <Button
                onClick={handlePublish}
                disabled={uploadPhase === "uploading"}
                className="gap-2"
                style={{ background: "var(--ln-gold)", color: "#000" }}
              >
                {uploadPhase === "uploading" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Upload size={16} />
                )}
                {publishIntent === "Published" ? "Publish" : "Save draft"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const rightPanel = (
    <div className="space-y-6 sm:space-y-7">
      <div className="max-w-lg border-l-2 pl-4" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 46%, transparent)" }}>
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>Work preview</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>A live reference for the Work you are preparing. Visual presentation remains separate from the canonical audio and Witness ID boundary.</p>
      </div>
      <div
        className="relative aspect-square overflow-hidden rounded-sm flex items-center justify-center"
        style={{ background: "#111", border: "1px solid rgba(196,154,40,0.2)" }}
      >
        {coverPreview ? (
          <img src={coverPreview} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music style={{ color: "var(--ln-gold)", opacity: 0.35 }} size={48} />
        )}
        <span className="absolute bottom-2 left-2 rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.82)", color: "var(--ln-gold)" }}>
          {visualSourceCopy.label}
        </span>
      </div>
      <p
        className="line-clamp-3 min-w-0 break-words text-lg leading-snug [overflow-wrap:anywhere]"
        title={title || "Untitled work"}
        style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
      >
        {title || "Untitled work"}
      </p>
      {toneProfile && (
        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }}>
          {toneProfile.label}
        </p>
      )}
      {witnessData && (
        <p className="font-mono text-[10px]" style={{ color: "var(--ln-gold)" }}>
          {witnessData.wid}
        </p>
      )}
      {queueProgress && queueBulkPrefillFields.length > 0 && (
        <section
          className="rounded-sm border px-4 py-4 sm:px-5"
          aria-label="Bulk edit metadata prefill"
          style={{
            borderColor: "color-mix(in srgb, var(--ln-gold-hot) 48%, transparent)",
            background: "color-mix(in srgb, var(--ln-gold) 9%, var(--ln-coal))",
            boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--ln-gold) 10%, transparent)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold-hot) 58%, transparent)", color: "var(--ln-gold-hot)", fontFamily: "'Cinzel', serif" }}>
              <ListChecks aria-hidden="true" className="size-3" /> Bulk edit proposal
            </span>
            <span className="max-w-full text-[10px] leading-relaxed uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>Prefilled for review</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--ln-bone)" }}>
            Creator-proposed shared values for this queued Work. Confirm or edit them in Details before sealing.
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {queueBulkPrefillFields.map((field) => (
              <div key={field.label} className="min-w-0 rounded-sm border px-3 py-2" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 18%, transparent)", background: "color-mix(in srgb, var(--ln-coal) 78%, var(--ln-gold))" }}>
                <dt className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>{field.label}</dt>
                <dd className="mt-1 line-clamp-2 break-words text-sm leading-snug [overflow-wrap:anywhere] sm:text-xs" title={field.value} style={{ color: "var(--ln-parchment)" }}>{field.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Bulk prefill does not alter the source file, embedded metadata, or Witness ID boundary.</p>
        </section>
      )}
      <CreativeCathedralWorkspace
        disabled={!user}
        audioFileName={audioFile?.name}
        audioEvidence={audioEvidence ?? undefined}
        attachedVisual={{
          present: Boolean(coverFile || coverRemoteUrl),
          source: visualSource,
          prompt: visualPrompt.trim() || undefined,
        }}
        wid={witnessData?.wid}
        draft={{
          title,
          genre,
          bpm,
          keySignature,
          moodTags: selectedMoods,
          caption,
          creationDate,
          originalReleaseDate: creatorReleaseDate,
          participationMusic: participation.music,
          participationLyrics: participation.lyrics,
          participationVoice: participation.voice,
        }}
        onApplyPatch={applyCathedralPatch}
      />
    </div>
  );

  const queueCompletionPercent = queueProgress ? Math.round((queueProgress.completed / queueProgress.total) * 100) : 0;
  const queueNotice = queueProgress ? (
    <section
      className="mb-8 rounded-sm border px-5 py-5"
      aria-label="MP3 queue progress"
      style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 42%, transparent)", background: "color-mix(in srgb, var(--ln-gold) 7%, var(--ln-coal))" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
          MP3 queue
        </p>
        <span className="text-xs" style={{ color: "var(--ln-bone)" }}>{queueProgress.completed} completed · {queueProgress.remaining} remaining</span>
      </div>
      <p className="mt-2 text-2xl leading-tight" style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif" }}>Reviewing record {queueProgress.current} of {queueProgress.total}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>Work through this record at its own pace. Every queued Work receives its own review, disclosure, attestation, and Witness ID.</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--ln-gold) 14%, var(--ln-coal))" }}>
        <div
          role="progressbar"
          aria-label="Completed MP3 queue records"
          aria-valuemin={0}
          aria-valuemax={queueProgress.total}
          aria-valuenow={queueProgress.completed}
          aria-valuetext={`${queueProgress.completed} of ${queueProgress.total} records completed`}
          className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${queueCompletionPercent}%`, background: "var(--ln-gold)", boxShadow: "0 0 10px color-mix(in srgb, var(--ln-gold) 48%, transparent)" }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="MP3 queue record status">
        {Array.from({ length: queueProgress.total }, (_, index) => {
          const isComplete = index < queueProgress.completed;
          const isCurrent = index === queueProgress.current - 1;
          return (
            <span
              key={index}
              title={isComplete ? `Record ${index + 1}: completed` : isCurrent ? `Record ${index + 1}: in review` : `Record ${index + 1}: awaiting review`}
              className="inline-flex size-2.5 rounded-full"
              style={{
                background: isComplete ? "var(--ln-gold)" : isCurrent ? "var(--ln-gold-hot)" : "color-mix(in srgb, var(--ln-smoke) 44%, transparent)",
                boxShadow: isCurrent ? "0 0 8px color-mix(in srgb, var(--ln-gold-hot) 52%, transparent)" : "none",
              }}
            />
          );
        })}
      </div>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 68%, transparent)" }}>
        This Work receives its own metadata review, participation disclosure, attestation, and WID. Nothing is carried forward automatically.
      </p>
    </section>
  ) : null;

  return (
    <div className={`h-full min-h-0${queueProgress ? " loop-queued-work-transition" : ""}`}>
      <StudioShell
        atmosphere={atmosphere}
        currentStep={step}
        progress={progress}
        onBack={onBack}
        leftPanel={<>{queueNotice}{renderLeftPanel()}</>}
        rightPanel={rightPanel}
      />
    </div>
  );
}
