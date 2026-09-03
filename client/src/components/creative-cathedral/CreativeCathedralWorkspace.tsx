import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ChevronDown, Landmark, Loader2, Maximize2, Sparkles, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type {
  CathedralContextManifest,
  CathedralDraftSnapshot,
  CathedralEvidencePacket,
  CathedralSuggestionPatch,
  CathedralSuggestionResult,
} from "@shared/creativeCathedral";
import { normalizeCathedralDraftSnapshot } from "@shared/creativeCathedral";
import type { AudioMetadataEvidence, VisualSource } from "@shared/loopRegistration";
import { CathedralContextGate } from "./CathedralContextGate";
import { CathedralRecordPanel } from "./CathedralRecordPanel";
import { CathedralStatusRail } from "./CathedralStatusRail";
import { CathedralSuggestionCard } from "./CathedralSuggestionCard";

type StoredSuggestion = {
  id: string;
  status: string;
  proposalJson: CathedralSuggestionResult;
};

function useDesktopCathedral() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}

export function CreativeCathedralWorkspace({
  draft,
  audioFileName,
  audioEvidence,
  attachedVisual,
  wid,
  disabled,
  onApplyPatch,
}: {
  draft: CathedralDraftSnapshot;
  audioFileName?: string;
  audioEvidence?: AudioMetadataEvidence;
  attachedVisual: { present: boolean; source: VisualSource; prompt?: string };
  wid?: string | null;
  disabled?: boolean;
  onApplyPatch: (patch: CathedralSuggestionPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const desktop = useDesktopCathedral();
  const draftFingerprint = JSON.stringify(draft);
  const safeDraft = useMemo(() => normalizeCathedralDraftSnapshot(draft), [draftFingerprint]);
  const utils = trpc.useUtils();
  const currentSession = trpc.cathedral.getCurrentSession.useQuery(undefined, { enabled: !disabled });
  const suggestions = trpc.cathedral.listSuggestions.useQuery(
    { sessionId: sessionId || "pending" },
    { enabled: Boolean(sessionId) },
  );
  const createSession = trpc.cathedral.createSession.useMutation();
  const saveDraft = trpc.cathedral.saveDraftSnapshot.useMutation();
  const requestReview = trpc.cathedral.requestMediaFactReview.useMutation();
  const applySuggestion = trpc.cathedral.applySuggestionToForm.useMutation();
  const editFirst = trpc.cathedral.markEditFirst.useMutation();
  const dismiss = trpc.cathedral.dismissSuggestion.useMutation();
  const clearWorkspace = trpc.cathedral.clearWorkspace.useMutation();

  useEffect(() => {
    if (currentSession.data?.id) setSessionId(currentSession.data.id);
  }, [currentSession.data?.id]);

  useEffect(() => {
    if (!sessionId || !open) return;
    const timer = window.setTimeout(() => {
      saveDraft.mutate({ sessionId, draft: safeDraft, activePanel: "assistant" });
    }, 700);
    return () => window.clearTimeout(timer);
    // The serialized fingerprint intentionally represents the allowlisted draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // The mutation object is not a stable dependency; draftFingerprint is the
    // explicit persistence trigger and prevents repeated saves on query refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, open, draftFingerprint, safeDraft]);

  const sources = useMemo(() => {
    const entries: CathedralContextManifest["sources"] = [];
    if (audioFileName) entries.push({ kind: "filename", label: `Audio filename: ${audioFileName}` });
    if (audioEvidence) {
      const tagFacts = [
        audioEvidence.title ? `title “${audioEvidence.title}”` : null,
        audioEvidence.artist ? `artist ${audioEvidence.artist}` : null,
        audioEvidence.album ? `album ${audioEvidence.album}` : null,
        audioEvidence.genres.length ? `genres ${audioEvidence.genres.join(", ")}` : null,
        audioEvidence.bpm ? `${audioEvidence.bpm} BPM` : null,
        audioEvidence.keySignature ? `key ${audioEvidence.keySignature}` : null,
        audioEvidence.originalReleaseDate ? `date ${audioEvidence.originalReleaseDate}` : null,
        audioEvidence.isrc ? `ISRC ${audioEvidence.isrc}` : null,
        audioEvidence.lyricsExcerpt ? "embedded lyrics present" : null,
      ].filter(Boolean).join(" · ");
      if (tagFacts) entries.push({ kind: "embedded_metadata", label: `Embedded tags: ${tagFacts}`.slice(0, 160) });
      const technicalFacts = [
        audioEvidence.durationSeconds ? `${Math.round(audioEvidence.durationSeconds)}s` : null,
        audioEvidence.codec,
        audioEvidence.sampleRateHz ? `${audioEvidence.sampleRateHz} Hz` : null,
        audioEvidence.bitsPerSample ? `${audioEvidence.bitsPerSample}-bit` : null,
        audioEvidence.channels ? `${audioEvidence.channels} channels` : null,
        audioEvidence.bitrateKbps ? `${audioEvidence.bitrateKbps} kbps` : null,
      ].filter(Boolean).join(" · ");
      if (technicalFacts) entries.push({ kind: "technical_audio", label: `Technical audio: ${technicalFacts}`.slice(0, 160) });
      if (audioEvidence.embeddedArtwork) {
        entries.push({ kind: "embedded_artwork", label: `Embedded artwork: ${audioEvidence.embeddedArtwork.format}, ${Math.round(audioEvidence.embeddedArtwork.sizeBytes / 1024)} KB` });
      }
      if (audioEvidence.productionHints.length) {
        entries.push({ kind: "embedded_metadata", label: `Production hints: ${audioEvidence.productionHints.join(" · ")}`.slice(0, 160) });
      }
    }
    if (attachedVisual.present && !audioEvidence?.embeddedArtwork) {
      entries.push({ kind: "embedded_artwork", label: `Attached visual: ${attachedVisual.source}${attachedVisual.prompt ? ` · creator prompt present` : ""}` });
    }
    if (Object.values(safeDraft).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))) {
      entries.push({ kind: "creator_text", label: "Current form: Details, creator dates, moods, and participation declarations" });
    }
    return entries;
  }, [attachedVisual, audioEvidence, audioFileName, safeDraft]);

  const evidencePacket = useMemo<CathedralEvidencePacket | null>(() => {
    if (!audioFileName) return null;
    return {
      version: 1,
      audio: audioEvidence ?? {
        fileName: audioFileName,
        mimeType: "application/octet-stream",
        sizeBytes: 0,
        genres: [],
        comments: [],
        productionHints: [],
      },
      attachedVisual,
      currentForm: safeDraft,
    };
  }, [attachedVisual, audioEvidence, audioFileName, safeDraft]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const created = await createSession.mutateAsync({ stage: "prepare" });
    setSessionId(created.id);
    return created.id;
  };

  const setWorkspaceOpen = async (nextOpen: boolean) => {
    if (disabled) {
      toast.error("Sign in to use your private Creative Cathedral workspace.");
      return;
    }
    if (!nextOpen) setExpanded(false);
    setOpen(nextOpen);
    if (nextOpen) {
      try { await ensureSession(); }
      catch { toast.error("The private workspace could not be opened."); }
    }
  };

  const requestSuggestion = async () => {
    if (!consented || sources.length === 0 || !evidencePacket) return;
    try {
      const id = await ensureSession();
      const manifest: CathedralContextManifest = {
        version: 1,
        sessionId: id,
        sources,
        permittedPurposes: ["media_fact_review"],
        consentedAt: new Date().toISOString(),
      };
      await requestReview.mutateAsync({ sessionId: id, consent: true, manifest, evidencePacket });
      setConsented(false);
      await utils.cathedral.listSuggestions.invalidate({ sessionId: id });
      toast.success("Private suggestion prepared. No Work data was changed.");
    } catch (error: any) {
      toast.error(typeof error?.message === "string" && !error.message.trim().startsWith("[")
        ? error.message
        : "The Cathedral could not prepare a suggestion. No Work data was changed.");
    }
  };

  const handleApply = async (suggestionId: string, patch?: CathedralSuggestionPatch) => {
    if (!sessionId) return;
    try {
      const result = await applySuggestion.mutateAsync({ sessionId, suggestionId, patch });
      onApplyPatch(result.patch);
      await utils.cathedral.listSuggestions.invalidate({ sessionId });
      toast.success("Suggestion applied to the local form. The Work is still unchanged until you register or save.");
    } catch (error: any) {
      toast.error(error?.message || "The suggestion could not be applied.");
    }
  };

  const handleClear = async () => {
    if (!sessionId || !window.confirm("Clear this private Creative Cathedral workspace? This does not affect the Work or WID.")) return;
    await clearWorkspace.mutateAsync({ sessionId, confirm: "CLEAR PRIVATE WORKSPACE" });
    setSessionId(null);
    setConsented(false);
    setOpen(false);
    await utils.cathedral.getCurrentSession.invalidate();
    toast.success("Private workspace cleared. No Work data was changed.");
  };

  const storedSuggestions = (suggestions.data ?? []) as StoredSuggestion[];
  const busy = requestReview.isPending || applySuggestion.isPending || editFirst.isPending || dismiss.isPending;

  const content = (
    <div className="space-y-5 text-sm" data-testid="creative-cathedral-workspace">
      <CathedralStatusRail hasAudio={Boolean(audioFileName)} suggestionCount={storedSuggestions.length} wid={wid} />
      <CathedralContextGate sources={sources} consented={consented} onConsentedChange={setConsented} />
      <Button
        type="button"
        className="min-h-11 w-full gap-2 text-sm font-semibold"
        disabled={!consented || sources.length === 0 || !evidencePacket || requestReview.isPending}
        onClick={requestSuggestion}
        style={{ background: "var(--ln-gold)", color: "#000" }}
      >
        {requestReview.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        Review extracted media facts
      </Button>
      <div className="space-y-3" aria-live="polite">
        {suggestions.isLoading && <p className="text-sm" style={{ color: "rgba(245,237,216,0.72)" }}>Restoring private suggestions…</p>}
        {storedSuggestions.map((row) => (
          <CathedralSuggestionCard
            key={row.id}
            suggestion={row.proposalJson}
            status={row.status}
            busy={busy}
            onApply={(patch) => handleApply(row.id, patch)}
            onEditFirst={async () => {
              if (!sessionId) return;
              await editFirst.mutateAsync({ sessionId, suggestionId: row.id });
            }}
            onDismiss={async () => {
              if (!sessionId) return;
              await dismiss.mutateAsync({ sessionId, suggestionId: row.id });
              await utils.cathedral.listSuggestions.invalidate({ sessionId });
            }}
          />
        ))}
      </div>
      <CathedralRecordPanel wid={wid} />
      {sessionId && (
        <Button type="button" size="sm" variant="ghost" onClick={handleClear} disabled={clearWorkspace.isPending} className="gap-1 text-sm">
          <Trash2 size={12} /> Clear private workspace
        </Button>
      )}
    </div>
  );

  return (
    <section className="pt-2" aria-label="Creative Cathedral">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full justify-between gap-3 border-amber-700/50 bg-black/55 px-4 text-sm"
        aria-expanded={open}
        aria-controls="creative-cathedral-panel"
        onClick={() => void setWorkspaceOpen(!open)}
      >
        <span className="flex items-center gap-2 font-semibold"><Landmark size={16} style={{ color: "var(--ln-gold)" }} /> Creative Cathedral</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {desktop && open && !expanded && (
        <div id="creative-cathedral-panel" className="mt-3 rounded-md p-4 shadow-2xl" style={{ border: "1px solid rgba(196,154,40,0.34)", background: "rgba(8,6,3,0.97)" }}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Prepare with a steward</p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "rgba(245,237,216,0.76)" }}>The creator remains the authority. Open a larger workspace whenever the evidence needs room to breathe.</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1.5 text-sm" onClick={() => setExpanded(true)} aria-label="Expand Creative Cathedral workspace">
              <Maximize2 size={14} /> Expand
            </Button>
          </div>
          {content}
        </div>
      )}

      <Sheet
        open={open && (!desktop || expanded)}
        onOpenChange={(next) => {
          if (!next && desktop) {
            setExpanded(false);
            return;
          }
          void setWorkspaceOpen(next);
        }}
      >
          <SheetContent
            side="right"
            id="creative-cathedral-panel"
            className="max-w-none overflow-x-hidden border-amber-800/40 p-0 shadow-2xl"
            style={{
              width: desktop ? "min(760px, calc(100vw - 2rem))" : "calc(100vw - 0.5rem)",
              maxWidth: "none",
              zIndex: 9000,
              top: "3rem",
              bottom: 0,
              height: "auto",
              background: "var(--ln-void)",
            }}
          >
            <SheetHeader className="border-b border-amber-800/30 px-5 py-5 pr-14 text-left">
              <SheetTitle className="text-xl" style={{ fontFamily: "var(--font-display)", color: "var(--ln-parchment)" }}>Creative Cathedral workspace</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed" style={{ color: "rgba(245,237,216,0.72)" }}>Private preparation. Creator-approved evidence. Non-binding suggestions. You decide what enters the form.</SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {content}
            </ScrollArea>
          </SheetContent>
      </Sheet>
    </section>
  );
}
