/* ═══════════════════════════════════════════════════════════════════
   LOOP MUSIC REGISTER
   Easy to start · Hard to fake · Optional to go deep
   Flow: Audio+Visual → Details+Participation → Seal → Draft/Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Upload, Music, Image as ImageIcon, Play, Pause, Shield,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2, Sparkles, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { UPLOAD_GENRES as GENRES, MOODS } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell } from "../StudioShell";
import {
  assistAudioMetadata,
  buildWaveformPngFromAudio,
  defaultParticipation,
  deriveToneFromMetadata,
  extractEmbeddedCover,
  participationToAiDisclosure,
  type LoopParticipation,
  type ParticipationValue,
  type PublishIntent,
  type ToneProfile,
  type VisualSource,
  PARTICIPATION_VALUES,
} from "@shared/loopRegistration";

const atmosphere = ATMOSPHERES.music;

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
  return (
    <div className="mb-4">
      <p className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--ln-gold)" }}>
        {label}
      </p>
      <div className="flex gap-2">
        {PARTICIPATION_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="flex-1 py-2 text-xs rounded-full transition-colors"
            style={{
              border: value === v ? "1px solid var(--ln-gold)" : "1px solid rgba(196,154,40,0.2)",
              background: value === v ? "rgba(196,154,40,0.15)" : "transparent",
              color: value === v ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 55%, transparent)",
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

interface MusicEnvironmentProps {
  onBack: () => void;
  pendingFile?: File;
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

export function MusicEnvironment({ onBack, keeperPrefill, pendingFile }: MusicEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
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

  const [title, setTitle] = useState(keeperPrefill?.title ?? "");
  const [genre, setGenre] = useState(keeperPrefill?.genre ?? "");
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

  const generateImage = trpc.guides.generateImage.useMutation();
  const remixImage = trpc.guides.remixImage.useMutation();

  const { data: creatorProfile } = trpc.profile.me.useQuery(undefined, { enabled: !!user });
  useEffect(() => {
    if (creatorProfile?.primaryGenre && !genre) setGenre(creatorProfile.primaryGenre);
  }, [creatorProfile?.primaryGenre]);

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
    setAssisting(true);
    try {
      const assist = await assistAudioMetadata(file);
      if (assist.title && !title) setTitle(assist.title);
      if (assist.genre && !genre) setGenre(assist.genre);
      if (assist.bpm) setBpm(String(assist.bpm));
      if (assist.keySignature) setKeySignature(assist.keySignature);
      if (assist.lyrics && !lyrics) setLyrics(assist.lyrics);
      if (assist.durationSeconds) setDurationSeconds(assist.durationSeconds);

      if (!coverFile && !coverRemoteUrl) {
        const embedded = await extractEmbeddedCover(file);
        if (embedded) {
          setCoverFile(embedded);
          setVisualSource("embedded");
          toast.success("Embedded cover merged from metadata");
        }
      } else {
        toast.success("Audio loaded — metadata suggestions applied where found");
      }
    } catch {
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
    setGeneratingWid(true);
    try {
      const buffer = await audioFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const tone = deriveToneFromMetadata({
        genre: genre || null,
        bpm: bpm ? parseInt(bpm, 10) : null,
        keySignature: keySignature || null,
        moods: selectedMoods,
        participation,
        emotionalHint: originStory || caption || null,
        title,
      });
      const payload = JSON.stringify({
        fileHash,
        title,
        participation,
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
      toast.error("Publish requires a bound visual");
      return;
    }

    setUploadPhase("uploading");
    try {
      const { url: fileUrl, key: fileKey } = await uploadFileToS3(audioFile, "audio");
      let coverArtUrl = coverRemoteUrl || undefined;
      let resolvedVisualSource = visualSource;
      if (coverFile) {
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
        if (visualSource === "none" || visualSource === "embedded") {
          resolvedVisualSource = visualSource === "embedded" ? "embedded" : "uploaded";
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

      const tone =
        toneProfile ||
        deriveToneFromMetadata({
          genre,
          bpm: bpm ? parseInt(bpm, 10) : null,
          keySignature,
          moods: selectedMoods,
          participation,
          emotionalHint: originStory || caption || null,
          title,
        });

      uploadMutation.mutate({
        fileUrl,
        fileKey,
        coverArtUrl,
        title,
        genre: genre || undefined,
        bpm: bpm ? parseInt(bpm, 10) : undefined,
        keySignature: keySignature || undefined,
        aiConsent,
        ownershipStatus: "full",
        moodTags: selectedMoods,
        caption: caption || undefined,
        contentType: "audio" as any,
        fileHash: witnessData.fileHash,
        witnessId: witnessData.wid,
        harmonicSignature: tone.accents.map((a, i) => 110 + i * 55 + (a.charCodeAt(1) % 40)),
        ecdsaPublicKey: witnessData.publicKeyJWK,
        ecdsaSignature: witnessData.signature,
        aiDisclosure: participationToAiDisclosure(participation),
        lyricsText: lyrics || undefined,
        haaiOriginStory: originStory || undefined,
        haaiEmotionalTone: selectedMoods.join(", ") || undefined,
        durationSeconds,
        status: publishIntent,
        participationMusic: participation.music,
        participationLyrics: participation.lyrics,
        participationVoice: participation.voice,
        toneProfileJson: JSON.stringify(tone),
        waveformUrl,
        waveformKey,
        visualSource: hasVisual ? resolvedVisualSource : "none",
        visualPrompt: visualPrompt || undefined,
        visualLineageJson: visualLineage.length ? JSON.stringify(visualLineage) : undefined,
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadPhase("idle");
    }
  };

  const canAdvanceFromUpload = !!audioFile;
  const canAdvanceFromMeta =
    !!title.trim() && attested && participation.music && participation.lyrics && participation.voice;

  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] mb-2" style={{ color: "var(--ln-gold)" }}>
                Loop · Register
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Audio + visual
              </h2>
              <p className="text-sm" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                Drop the canonical track. We merge embedded art when present — or upload / generate a cover.
              </p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith("audio/")) void ingestAudio(f);
              }}
              onClick={() => audioInputRef.current?.click()}
              className="cursor-pointer rounded-sm p-8 text-center"
              style={{
                border: `1px dashed ${audioFile ? "rgba(74,222,128,0.5)" : "rgba(196,154,40,0.35)"}`,
                background: "rgba(196,154,40,0.03)",
              }}
            >
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void ingestAudio(f);
                }}
              />
              {assisting ? (
                <Loader2 className="mx-auto animate-spin" style={{ color: "var(--ln-gold)" }} />
              ) : audioFile ? (
                <>
                  <CheckCircle2 className="mx-auto mb-2" style={{ color: "#4ADE80" }} />
                  <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>
                    {audioFile.name}
                  </p>
                </>
              ) : (
                <>
                  <Music className="mx-auto mb-2 opacity-60" style={{ color: "var(--ln-gold)" }} />
                  <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>
                    Drop audio (MP3, WAV, FLAC…)
                  </p>
                </>
              )}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--ln-gold)" }}>
                Bound visual {visualSource !== "none" && `· ${visualSource}`}
              </p>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="cursor-pointer rounded-sm p-4 flex items-center gap-3 mb-3"
                style={{ border: "1px solid rgba(196,154,40,0.25)" }}
              >
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCoverFile(f);
                      setCoverRemoteUrl(null);
                      setVisualSource("uploaded");
                    }
                  }}
                />
                {coverPreview ? (
                  <img src={coverPreview} alt="" className="w-14 h-14 object-cover rounded-sm" />
                ) : (
                  <ImageIcon size={20} style={{ color: "rgba(245,237,216,0.4)" }} />
                )}
                <div className="text-xs" style={{ color: "rgba(245,237,216,0.65)" }}>
                  {coverPreview ? "Click to replace upload" : "Upload cover art"}
                </div>
              </div>

              <Textarea
                value={visualPrompt}
                onChange={(e) => setVisualPrompt(e.target.value)}
                placeholder="Visual prompt — generate or remix cover art"
                className="mb-2 min-h-[72px] bg-transparent text-sm"
                style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={generatingVisual || !visualPrompt.trim()}
                  onClick={() => runGenerateVisual("generate")}
                  className="gap-1 text-xs"
                  style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)" }}
                >
                  {generatingVisual ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate
                </Button>
                <Button
                  type="button"
                  disabled={generatingVisual || !visualPrompt.trim() || !coverPreview}
                  onClick={() => runGenerateVisual("remix")}
                  className="gap-1 text-xs"
                  style={{ background: "transparent", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.3)" }}
                >
                  <RefreshCw size={12} /> Remix
                </Button>
              </div>
            </div>

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

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
              className="bg-transparent"
              style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="bg-transparent text-sm px-3 py-2 rounded-sm"
                style={{ border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
              >
                <option value="">Genre (suggested)</option>
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
            <Input
              value={keySignature}
              onChange={(e) => setKeySignature(e.target.value)}
              placeholder="Key (e.g. Am)"
              className="bg-transparent"
              style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-parchment)" }}
            />

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
              Explicit choice — nothing goes public by accident. Publish requires bound visual + witness-ready profile.
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
    <div className="space-y-4 p-4">
      <div
        className="aspect-square rounded-sm overflow-hidden flex items-center justify-center"
        style={{ background: "#111", border: "1px solid rgba(196,154,40,0.2)" }}
      >
        {coverPreview ? (
          <img src={coverPreview} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music style={{ color: "var(--ln-gold)", opacity: 0.35 }} size={48} />
        )}
      </div>
      <p className="text-lg" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
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
    </div>
  );

  return (
    <StudioShell
      atmosphere={atmosphere}
      currentStep={step}
      progress={progress}
      onBack={onBack}
      leftPanel={renderLeftPanel()}
      rightPanel={rightPanel}
    />
  );
}
