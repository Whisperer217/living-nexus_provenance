/**
 * Creator Studio Workspace
 * Full-page tabbed editor for comic/book works.
 * Replaces the cramped Edit Modal + separate Manage flow.
 *
 * Tabs: Overview | Pages | Access | Metadata | Resonance | Provenance
 * Right panel: Live artifact preview (mirrors reader experience)
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  BookOpen, FileText, Lock, Tag, BarChart2, Shield,
  ChevronLeft, Save, Eye, EyeOff, AlertCircle, CheckCircle,
  Loader2, Upload, X, Layers, Settings, Compass, Music, GitFork, Plus, Trash2, ExternalLink
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StoryboardBuilder, type StoryboardPage } from "@/components/reader/StoryboardBuilder";
import { CinematicComicReader } from "@/components/reader/CinematicComicReader";
import type { PagePanelData, SoundtrackCue } from "@/components/reader/CinematicComicReader";
import { ChildrensBookReader } from "@/components/reader/ChildrensBookReader";
import { ManuscriptReader } from "@/components/reader/ManuscriptReader";
import PanelRegionEditor from "@/components/studio/PanelRegionEditor";
import SoundtrackCueMapper from "@/components/studio/SoundtrackCueMapper";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "pages" | "guided" | "soundtrack" | "access" | "metadata" | "resonance" | "provenance" | "derivatives";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "Overview",   icon: <BookOpen size={14} /> },
  { id: "pages",      label: "Pages",      icon: <Layers size={14} /> },
  { id: "guided",     label: "Guided Mode", icon: <Compass size={14} /> },
  { id: "soundtrack", label: "Soundtrack",  icon: <Music size={14} /> },
  { id: "access",     label: "Access",     icon: <Lock size={14} /> },
  { id: "metadata",   label: "Metadata",   icon: <Tag size={14} /> },
  { id: "resonance",  label: "Resonance",  icon: <BarChart2 size={14} /> },
  { id: "provenance", label: "Provenance", icon: <Shield size={14} /> },
  { id: "derivatives", label: "Derivatives", icon: <GitFork size={14} /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreatorStudioPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const bookId = parseInt(id ?? "0", 10);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── Fetch work ──────────────────────────────────────────────────────────────
  const { data: song, isLoading, refetch } = trpc.songs.getById.useQuery(
    { id: bookId },
    { enabled: !!bookId }
  );

  const isOwner = user?.id === song?.userId;

  // ── Local edit state ────────────────────────────────────────────────────────
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [headlineCaption, setHeadline]  = useState("");
  const [genre, setGenre]               = useState("");
  const [moodTags, setMoodTags]         = useState("");
  const [aiDisclosure, setAiDisclosure] = useState<string>("none");
  const [narrativeFormat, setNarrativeFormat] = useState<"comic" | "childrens" | "manuscript">("comic");
  const [readAccess, setReadAccess]     = useState<"open" | "preview" | "locked">("open");
  const [previewPageCount, setPreviewPageCount] = useState(3);
  const [pagesJson, setPagesJson]       = useState<string | null>(null);
  const [creditsJson, setCreditsJson]   = useState<string>("");
  const [panelData, setPanelData]       = useState<PagePanelData[]>([]);
  const [soundtrackCues, setSoundtrackCues] = useState<SoundtrackCue[]>([]);

  // ── Sync from server ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!song) return;
    setTitle(song.title ?? "");
    setDescription(song.description ?? "");
    setHeadline((song as any).headlineCaption ?? "");
    setGenre(song.genre ?? "");
    setMoodTags(song.moodTags ?? "");
    setAiDisclosure((song as any).aiDisclosure ?? "none");
    setNarrativeFormat(((song as any).narrativeFormat as any) ?? "comic");
    setReadAccess(((song as any).readAccess as any) ?? "open");
    setPreviewPageCount((song as any).previewPageCount ?? 3);
    setPagesJson((song as any).pagesJson ?? null);
    setCreditsJson((song as any).creditsJson ?? "");
    // Guided Mode data
    try {
      const pd = JSON.parse((song as any).panelRegionsJson ?? "[]");
      setPanelData(Array.isArray(pd) ? pd : []);
    } catch { setPanelData([]); }
    try {
      const sc = JSON.parse((song as any).soundtrackCuesJson ?? "[]");
      setSoundtrackCues(Array.isArray(sc) ? sc : []);
    } catch { setSoundtrackCues([]); }
  }, [song]);

  // ── Mutation ────────────────────────────────────────────────────────────────
  const updateMutation = trpc.songs.updateMetadata.useMutation({
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      setSaveStatus("saved");
      refetch();
      setTimeout(() => setSaveStatus("idle"), 2500);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      songId: bookId,
      title,
      description,
      headlineCaption,
      genre,
      moodTags: moodTags ? moodTags.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined,
      aiDisclosure: aiDisclosure as any,
      narrativeFormat,
      readAccess,
      previewPageCount,
      pagesJson: pagesJson ?? undefined,
      creditsJson,
      panelRegionsJson: JSON.stringify(panelData),
      soundtrackCuesJson: JSON.stringify(soundtrackCues),
    });
  }, [bookId, title, description, headlineCaption, genre, moodTags, aiDisclosure, narrativeFormat, readAccess, previewPageCount, pagesJson, creditsJson, panelData, soundtrackCues]);

  // ── Guard ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void)" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  if (!song || !isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--ln-void)" }}>
        <AlertCircle size={40} style={{ color: "var(--ln-gold)" }} />
        <p className="font-heading text-lg" style={{ color: "var(--ln-parchment)" }}>
          {!song ? "Work not found." : "You don't have permission to edit this work."}
        </p>
        <Button variant="outline" onClick={() => navigate(-1 as any)}>Go Back</Button>
      </div>
    );
  }

  // ── Parse pages for preview ─────────────────────────────────────────────────
  let storyboardPages: StoryboardPage[] = [];
  try {
    const parsed = JSON.parse(pagesJson ?? "[]");
    storyboardPages = Array.isArray(parsed) ? parsed : [];
  } catch { /* ignore */ }

  const previewPages = storyboardPages.map((p: StoryboardPage) => ({
    imageUrl: p.imageUrl,
    pageNumber: p.pageNumber,
  }));

  const accentColor = "var(--ln-gold)";
  const format = narrativeFormat ?? "comic";

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--ln-void)", color: "var(--ln-parchment)" }}
    >
      {/* ── Top Bar ── */}
      <header
        className="flex items-center justify-between px-5 py-3 flex-shrink-0 sticky top-0 z-50"
        style={{ background: "rgba(13,20,25,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(196,154,40,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/book/${bookId}`)}
            className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--ln-smoke)" }}
          >
            <ChevronLeft size={16} />
            Back to Work
          </button>
          <span style={{ color: "rgba(196,154,40,0.3)" }}>·</span>
          <div className="flex items-center gap-2">
            <Settings size={14} style={{ color: accentColor }} />
            <span className="font-heading text-sm font-bold tracking-wide" style={{ color: "var(--ln-parchment)" }}>
              Creator Studio
            </span>
          </div>
          <span className="text-xs truncate max-w-[200px]" style={{ color: "var(--ln-smoke)" }}>
            {song.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <button
            onClick={() => setPreviewOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide transition-all hover:opacity-80"
            style={{
              background: previewOpen ? "rgba(196,154,40,0.15)" : "rgba(255,255,255,0.05)",
              color: previewOpen ? accentColor : "var(--ln-smoke)",
              border: `1px solid ${previewOpen ? "rgba(196,154,40,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {previewOpen ? <EyeOff size={12} /> : <Eye size={12} />}
            {previewOpen ? "Hide Preview" : "Live Preview"}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: accentColor, color: "#0D1419" }}
          >
            {saveStatus === "saving" ? (
              <><Loader2 size={12} className="animate-spin" /> Saving…</>
            ) : saveStatus === "saved" ? (
              <><CheckCircle size={12} /> Saved</>
            ) : saveStatus === "error" ? (
              <><AlertCircle size={12} /> Error</>
            ) : (
              <><Save size={12} /> Commit Revision</>
            )}
          </button>
        </div>
      </header>

      {/* ── Body: Editor + Preview ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Editor ── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: previewOpen ? "50%" : "100%", transition: "width 0.3s ease" }}
        >
          {/* Tab bar */}
          <div
            className="flex items-center gap-1 px-5 py-2 flex-shrink-0 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.10)", background: "rgba(13,20,25,0.6)" }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide whitespace-nowrap transition-all"
                style={{
                  background: activeTab === tab.id ? "rgba(196,154,40,0.15)" : "transparent",
                  color: activeTab === tab.id ? accentColor : "var(--ln-smoke)",
                  border: `1px solid ${activeTab === tab.id ? "rgba(196,154,40,0.3)" : "transparent"}`,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeTab === "overview" && (
              <OverviewTab
                title={title} setTitle={setTitle}
                description={description} setDescription={setDescription}
                headlineCaption={headlineCaption} setHeadline={setHeadline}
                genre={genre} setGenre={setGenre}
                creditsJson={creditsJson} setCreditsJson={setCreditsJson}
                song={song}
              />
            )}
            {activeTab === "pages" && (
              <PagesTab
                storyboardPages={storyboardPages}
                setPagesJson={setPagesJson}
              />
            )}
            {activeTab === "guided" && (
              <GuidedModeTab
                pages={storyboardPages.map(p => ({ pageNumber: p.pageNumber, url: p.imageUrl ?? p._previewUrl ?? "" }))}
                panelData={panelData}
                onChange={setPanelData}
              />
            )}
            {activeTab === "soundtrack" && (
              <SoundtrackTab
                pages={storyboardPages.map(p => ({ pageNumber: p.pageNumber }))}
                cues={soundtrackCues}
                onChange={setSoundtrackCues}
              />
            )}
            {activeTab === "access" && (
              <AccessTab
                readAccess={readAccess} setReadAccess={setReadAccess}
                previewPageCount={previewPageCount} setPreviewPageCount={setPreviewPageCount}
              />
            )}
            {activeTab === "metadata" && (
              <MetadataTab
                moodTags={moodTags} setMoodTags={setMoodTags}
                aiDisclosure={aiDisclosure} setAiDisclosure={setAiDisclosure}
                narrativeFormat={narrativeFormat} setNarrativeFormat={setNarrativeFormat}
              />
            )}
            {activeTab === "resonance" && (
              <ResonanceTab song={song} />
            )}
            {activeTab === "provenance" && (
              <ProvenanceTab song={song} />
            )}
            {activeTab === "derivatives" && (
              <DerivativesTab songId={bookId} />
            )}
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        {previewOpen && (
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ borderLeft: "1px solid rgba(196,154,40,0.12)", background: "rgba(8,12,16,0.8)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(196,154,40,0.10)" }}
            >
              <span className="text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.5)" }}>
                Live Preview — {format === "comic" ? "🎭 Comic" : format === "childrens" ? "📖 Children's" : "📄 Manuscript"}
              </span>
              <button onClick={() => setPreviewOpen(false)} style={{ color: "var(--ln-smoke)" }}>
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewPages.length > 0 ? (
                format === "childrens" ? (
                  <ChildrensBookReader
                    pages={previewPages.map(p => ({ pageNumber: p.pageNumber, imageUrl: p.imageUrl }))}
                    title={title}
                    onClose={() => {}}
                  />
                ) : format === "manuscript" ? (
                  <ManuscriptReader
                    workId={String(bookId)}
                    title={title}
                    content={{ text: (song as any)?.lyricsText ?? "" }}
                    onClose={() => {}}
                  />
                ) : (
                  <CinematicComicReader
                    pages={previewPages}
                    title={title}
                    panelData={panelData}
                    soundtrackCues={soundtrackCues}
                    hasWitnessAccess={true}
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                  <BookOpen size={40} style={{ color: "var(--ln-gold)" }} />
                  <p className="text-sm font-heading" style={{ color: "var(--ln-smoke)" }}>
                    Add pages in the Pages tab to see a live preview.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ title, setTitle, description, setDescription, headlineCaption, setHeadline, genre, setGenre, creditsJson, setCreditsJson, song }: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <StudioSection label="Title">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Work title…"
          className="studio-input"
        />
      </StudioSection>

      <StudioSection label="Origin Testimony" hint="The creator's intent, emotional meaning, and inspiration behind this work.">
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Why does this work exist? What does it mean to you?"
          rows={5}
          className="studio-input resize-none"
        />
      </StudioSection>

      <StudioSection label="Headline Caption" hint="Short excerpt shown on cards and hero banners (1–2 lines).">
        <Input
          value={headlineCaption}
          onChange={e => setHeadline(e.target.value)}
          placeholder="A single line that captures the essence…"
          className="studio-input"
          maxLength={160}
        />
        <p className="text-xs mt-1" style={{ color: "var(--ln-smoke)" }}>{headlineCaption.length}/160</p>
      </StudioSection>

      <StudioSection label="Genre">
        <Input
          value={genre}
          onChange={e => setGenre(e.target.value)}
          placeholder="e.g. Sci-Fi, Fantasy, Faith, Horror…"
          className="studio-input"
        />
      </StudioSection>

      <StudioSection label="Cover Art">
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{ width: 180, height: 240, background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}
        >
          {song?.coverArtUrl ? (
            <img src={song.coverArtUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Upload size={24} style={{ color: "var(--ln-gold)" }} />
              <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>No cover</span>
            </div>
          )}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--ln-smoke)" }}>
          To update cover art, use the Upload page and re-upload the work.
        </p>
      </StudioSection>

      <StudioSection label="Credits (JSON)" hint='e.g. [{"role":"Author","name":"Doc Seraph Mercer"}]'>
        <Textarea
          value={creditsJson}
          onChange={e => setCreditsJson(e.target.value)}
          placeholder='[{"role":"Author","name":"..."}]'
          rows={3}
          className="studio-input resize-none font-mono text-xs"
        />
      </StudioSection>
    </div>
  );
}

// ─── Tab: Pages ───────────────────────────────────────────────────────────────

function PagesTab({ storyboardPages, setPagesJson }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-sm tracking-wide" style={{ color: "var(--ln-parchment)" }}>
            Page Orchestration
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
            Drag to reorder, replace images, tag spreads, and define panel regions for Guided Mode.
          </p>
        </div>
        <Badge variant="outline" style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
          {storyboardPages.length} pages
        </Badge>
      </div>
      <StoryboardBuilder
        initialPages={storyboardPages}
        onChange={setPagesJson}
      />
    </div>
  );
}

// ─── Tab: Access ──────────────────────────────────────────────────────────────

function AccessTab({ readAccess, setReadAccess, previewPageCount, setPreviewPageCount }: any) {
  return (
    <div className="space-y-6 max-w-lg">
      <StudioSection label="Read Access" hint="Controls who can read this work and how much they can see.">
        <Select value={readAccess} onValueChange={setReadAccess}>
          <SelectTrigger className="studio-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">🌐 Open — Anyone can read the full work</SelectItem>
            <SelectItem value="preview">👁 Preview — First N pages free, rest gated</SelectItem>
            <SelectItem value="locked">🔒 Locked — Witness Access required</SelectItem>
          </SelectContent>
        </Select>
      </StudioSection>

      {readAccess === "preview" && (
        <StudioSection label="Free Preview Pages" hint="How many pages are visible before the gate.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={previewPageCount}
              onChange={e => setPreviewPageCount(parseInt(e.target.value))}
              className="flex-1 accent-[#C49A28]"
            />
            <span className="font-heading font-bold text-sm w-8 text-center" style={{ color: "var(--ln-gold)" }}>
              {previewPageCount}
            </span>
          </div>
        </StudioSection>
      )}

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.12)" }}
      >
        <p className="text-xs font-heading font-bold tracking-wide uppercase" style={{ color: "rgba(196,154,40,0.6)" }}>
          Coming Soon
        </p>
        <ul className="space-y-1">
          {["Collector Editions", "Supporter Unlocks", "Witness-Gated Chapters", "Pay-per-read"].map(f => (
            <li key={f} className="text-xs flex items-center gap-2" style={{ color: "var(--ln-smoke)" }}>
              <span style={{ color: "rgba(196,154,40,0.4)" }}>·</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tab: Metadata ────────────────────────────────────────────────────────────

function MetadataTab({ moodTags, setMoodTags, aiDisclosure, setAiDisclosure, narrativeFormat, setNarrativeFormat }: any) {
  return (
    <div className="space-y-6 max-w-lg">
      <StudioSection label="Mood Tags" hint="Comma-separated descriptors for discovery (e.g. dark, redemptive, epic).">
        <Input
          value={moodTags}
          onChange={e => setMoodTags(e.target.value)}
          placeholder="dark, redemptive, faith, cosmic…"
          className="studio-input"
        />
      </StudioSection>

      <StudioSection label="Narrative Format" hint="Determines which reading engine loads for this work.">
        <Select value={narrativeFormat} onValueChange={setNarrativeFormat}>
          <SelectTrigger className="studio-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comic">🎭 Comic Book — Panel-sequenced, guided mode</SelectItem>
            <SelectItem value="childrens">📖 Children's Book — Spread pages, ambient atmosphere</SelectItem>
            <SelectItem value="manuscript">📄 Illustrated Novel — Flowing text, typography focus</SelectItem>
          </SelectContent>
        </Select>
      </StudioSection>

      <StudioSection label="AI Disclosure" hint="Transparency about AI involvement in this work.">
        <Select value={aiDisclosure} onValueChange={setAiDisclosure}>
          <SelectTrigger className="studio-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Human-created — No AI involvement</SelectItem>
            <SelectItem value="ai_assisted">AI-Assisted — Human-led, AI-enhanced</SelectItem>
            <SelectItem value="ai_generated">AI-Assisted Manifestation — Primarily AI-produced</SelectItem>
            <SelectItem value="haai">HAAI — Human-Authored, AI-Implemented</SelectItem>
          </SelectContent>
        </Select>
      </StudioSection>
    </div>
  );
}

// ─── Tab: Resonance ───────────────────────────────────────────────────────────

function ResonanceTab({ song }: any) {
  return (
    <div className="space-y-6 max-w-lg">
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.12)" }}
      >
        <p className="text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.5)" }}>
          Resonance Signals
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Plays", value: song?.playCount ?? 0, icon: "▶" },
            { label: "Tips", value: song?.tipCount ?? 0, icon: "🔥" },
            { label: "Witnesses", value: "—", icon: "👁" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-heading font-bold" style={{ color: "var(--ln-gold)" }}>
                {stat.icon} {stat.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--ln-smoke)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}
      >
        <p className="text-xs font-heading font-bold tracking-wide uppercase mb-2" style={{ color: "rgba(196,154,40,0.5)" }}>
          Coming Soon
        </p>
        <ul className="space-y-1">
          {["Resonance Heatmaps (panel-level)", "Witness Engagement Timeline", "Contribution Breakdown", "Discovery Trail"].map(f => (
            <li key={f} className="text-xs flex items-center gap-2" style={{ color: "var(--ln-smoke)" }}>
              <span style={{ color: "rgba(196,154,40,0.4)" }}>·</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tab: Provenance ──────────────────────────────────────────────────────────

function ProvenanceTab({ song }: any) {
  const wid = (song as any)?.witnessId;
  const createdAt = song?.createdAt ? new Date(song.createdAt).toLocaleString() : "—";
  const updatedAt = song?.updatedAt ? new Date(song.updatedAt).toLocaleString() : "—";

  return (
    <div className="space-y-6 max-w-lg">
      <StudioSection label="Witness ID (WID)">
        <div
          className="rounded-xl px-4 py-3 font-mono text-xs break-all"
          style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-gold)" }}
        >
          {wid ?? "Not yet witnessed — publish to generate WID"}
        </div>
      </StudioSection>

      <div className="grid grid-cols-2 gap-4">
        <StudioSection label="First Witnessed">
          <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>{createdAt}</p>
        </StudioSection>
        <StudioSection label="Last Updated">
          <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>{updatedAt}</p>
        </StudioSection>
      </div>

      <StudioSection label="Certificate">
        {(song as any)?.certificateUrl ? (
          <a
            href={(song as any).certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline transition-opacity hover:opacity-80"
            style={{ color: "var(--ln-gold)" }}
          >
            View Provenance Certificate →
          </a>
        ) : (
          <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No certificate generated yet.</p>
        )}
      </StudioSection>

      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}
      >
        <p className="text-xs font-heading font-bold tracking-wide uppercase mb-2" style={{ color: "rgba(196,154,40,0.5)" }}>
          Coming Soon
        </p>
        <ul className="space-y-1">
          {["Derivative Tracking", "Lineage Graph", "Contributor Registry", "Version History"].map(f => (
            <li key={f} className="text-xs flex items-center gap-2" style={{ color: "var(--ln-smoke)" }}>
              <span style={{ color: "rgba(196,154,40,0.4)" }}>·</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tab: Guided Mode ────────────────────────────────────────────────────────

function GuidedModeTab({ pages, panelData, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm tracking-wide" style={{ color: "var(--ln-parchment)" }}>
          Panel Region Editor
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
          Draw bounding boxes on each page to define panel regions for Guided Mode. Assign read order, transition type, emotional beats, and creator commentary.
        </p>
      </div>
      <PanelRegionEditor
        pages={pages}
        panelData={panelData}
        onChange={onChange}
      />
    </div>
  );
}

// ─── Tab: Soundtrack ─────────────────────────────────────────────────────────

function SoundtrackTab({ pages, cues, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm tracking-wide" style={{ color: "var(--ln-parchment)" }}>
          Soundtrack Orchestration
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
          Map music tracks to pages or panel regions. The Guided Mode reader will trigger these cues during cinematic playback.
        </p>
      </div>
      <SoundtrackCueMapper
        pages={pages}
        cues={cues}
        onChange={onChange}
      />
    </div>
  );
}

// ─── Tab: Derivatives ───────────────────────────────────────────────────────

function DerivativesTab({ songId }: { songId: number }) {
  const { data: derivatives, isLoading, refetch } = trpc.derivatives.getByParent.useQuery({ parentSongId: songId });
  const createMut = trpc.derivatives.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setForm({ derivativeType: "remix", permissionStatus: "licensed", licenseNotes: "", testimony: "", externalUrl: "" }); } });
  const deleteMut = trpc.derivatives.delete.useMutation({ onSuccess: () => refetch() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ derivativeType: "remix", permissionStatus: "licensed", licenseNotes: "", testimony: "", externalUrl: "" });
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-sm tracking-wide" style={{ color: "var(--ln-parchment)" }}>Declared Derivatives</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>Remixes, covers, samples, and other works derived from this manifestation.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold" style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}>
          <Plus size={12} /> Declare
        </button>
      </div>
      {showForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,154,40,0.15)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.7)" }}>Type</label>
              <select value={form.derivativeType} onChange={e => setForm(f => ({ ...f, derivativeType: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.2)" }}>
                {["remix","cover","sample","adaptation","translation","parody","other"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.7)" }}>Permission</label>
              <select value={form.permissionStatus} onChange={e => setForm(f => ({ ...f, permissionStatus: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.2)" }}>
                {["licensed","authorized","unauthorized","unknown"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-heading font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.7)" }}>License Notes</label>
            <input value={form.licenseNotes} onChange={e => setForm(f => ({ ...f, licenseNotes: e.target.value }))} placeholder="e.g. Creative Commons BY-SA 4.0" className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.2)" }} />
          </div>
          <div>
            <label className="block text-xs font-heading font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.7)" }}>Testimony</label>
            <textarea value={form.testimony} onChange={e => setForm(f => ({ ...f, testimony: e.target.value }))} placeholder="Describe the creative relationship…" rows={3} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.2)" }} />
          </div>
          <div>
            <label className="block text-xs font-heading font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.7)" }}>External URL</label>
            <input value={form.externalUrl} onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))} placeholder="https://…" className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ln-parchment)", border: "1px solid rgba(196,154,40,0.2)" }} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "var(--ln-smoke)" }}>Cancel</button>
            <button onClick={() => createMut.mutate({ parentSongId: songId, ...form, derivativeType: form.derivativeType as any, permissionStatus: form.permissionStatus as any, licenseNotes: form.licenseNotes || undefined, testimony: form.testimony || undefined, externalUrl: form.externalUrl || undefined })} disabled={createMut.isPending} className="px-4 py-1.5 rounded-lg text-xs font-heading font-bold" style={{ background: "var(--ln-gold)", color: "#0D1419" }}>
              {createMut.isPending ? "Saving…" : "Declare Derivative"}
            </button>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} style={{ color: "var(--ln-gold)" }} /></div>
      ) : !derivatives?.length ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-40">
          <GitFork size={32} style={{ color: "var(--ln-gold)" }} />
          <p className="text-sm font-heading" style={{ color: "var(--ln-smoke)" }}>No derivatives declared yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {derivatives.map((d: any) => (
            <div key={d.id} className="rounded-xl p-4 flex items-start justify-between gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,154,40,0.12)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-heading font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)" }}>{d.derivativeType}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ln-smoke)" }}>{d.permissionStatus}</span>
                </div>
                {d.testimony && <p className="text-sm mt-1" style={{ color: "var(--ln-parchment)" }}>{d.testimony}</p>}
                {d.licenseNotes && <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>{d.licenseNotes}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {d.externalUrl && <a href={d.externalUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--ln-smoke)" }}><ExternalLink size={14} /></a>}
                <button onClick={() => deleteMut.mutate({ id: d.id })} className="p-1.5 rounded hover:opacity-80" style={{ color: "rgba(255,80,80,0.7)" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Utility: StudioSection ───────────────────────────────────────────────────

function StudioSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.7)" }}>
        {label}
      </label>
      {hint && <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>{hint}</p>}
      {children}
    </div>
  );
}
