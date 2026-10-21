import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  Album,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Copy,
  Disc3,
  GripVertical,
  LibraryBig,
  ListMusic,
  Loader2,
  Music,
  Plus,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { copyProvenancePlayerManifest } from "@/lib/provenancePlayerManifest";
import { RELEASE_SIGNING_HOLD } from "@shared/albumReleaseTypes";

const PROVENANCE_PLAYER_URL = "https://provenanceplayer.netlify.app/#/home";

type VisibilityIntent = "public" | "unlisted" | "private";

function DraftTrackRow({
  track,
  index,
  total,
  busy,
  onMove,
  onDragStart,
  onDrop,
  onRemove,
}: {
  track: any;
  index: number;
  total: number;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDrop: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className="group flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2"
      draggable={!busy}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={{ borderColor: "rgba(196,154,40,0.18)", background: "rgba(255,255,255,0.025)" }}
    >
      <span className="w-5 shrink-0 text-center font-mono text-[11px]" style={{ color: "var(--ln-smoke)" }}>{index + 1}</span>
      <GripVertical aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: "var(--ln-iron)" }} />
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md" style={{ background: "rgba(196,154,40,0.08)" }}>
        {track.coverArtUrl ? <img src={track.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <Music className="m-2 h-5 w-5" style={{ color: "var(--ln-gold)" }} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: "var(--ln-parchment)" }}>{track.title}</p>
        <p className="truncate font-mono text-[10px]" style={{ color: "rgba(196,154,40,0.52)" }}>{track.witnessId ?? "Work ID preserved"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30" disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label={`Move ${track.title} earlier`}>
          <ArrowUp className="h-3.5 w-3.5" style={{ color: "var(--ln-gold)" }} />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30" disabled={busy || index === total - 1} onClick={() => onMove(1)} aria-label={`Move ${track.title} later`}>
          <ArrowDown className="h-3.5 w-3.5" style={{ color: "var(--ln-gold)" }} />
        </button>
        <button type="button" className="rounded p-1.5 hover:bg-red-500/10 disabled:opacity-30" disabled={busy} onClick={onRemove} aria-label={`Remove ${track.title} from this private draft`}>
          <X className="h-3.5 w-3.5" style={{ color: "var(--ln-ember)" }} />
        </button>
      </div>
    </li>
  );
}

function DraftReleaseEditor({ draftId, onClose }: { draftId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const draftQuery = trpc.releaseDrafts.getMine.useQuery({ draftId });
  const eligibleWorks = trpc.releaseDrafts.listEligibleWorks.useQuery();
  const [draggedMembershipId, setDraggedMembershipId] = useState<number | null>(null);
  const [savingSelection, setSavingSelection] = useState(false);
  const draft = draftQuery.data?.draft;
  const tracks = draftQuery.data?.tracks ?? [];
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState<string | null>(null);
  const [draftVisibility, setDraftVisibility] = useState<VisibilityIntent | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<number[] | null>(null);

  const invalidate = async () => {
    await Promise.all([
      utils.releaseDrafts.listMine.invalidate(),
      utils.releaseDrafts.getMine.invalidate({ draftId }),
    ]);
  };

  const updateMetadata = trpc.releaseDrafts.updateMetadata.useMutation({
    onSuccess: async () => { await invalidate(); toast.success("Draft release details saved."); },
    onError: (error) => toast.error(error.message),
  });
  const replaceTracks = trpc.releaseDrafts.replaceTracks.useMutation({
    onSuccess: async () => { setSavingSelection(false); setSelectedSongIds(null); await invalidate(); toast.success("Draft membership saved."); },
    onError: (error) => { setSavingSelection(false); toast.error(error.message); },
  });
  const reorderTracks = trpc.releaseDrafts.reorderTracks.useMutation({
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });
  const abandon = trpc.releaseDrafts.abandon.useMutation({
    onSuccess: async () => { await utils.releaseDrafts.listMine.invalidate(); toast.success("Draft release archived. Existing Works remain unchanged."); onClose(); },
    onError: (error) => toast.error(error.message),
  });

  const currentSelection = selectedSongIds ?? tracks.map((track: any) => track.songId);
  const metadata = {
    title: draftTitle ?? draft?.title ?? "",
    description: draftDescription ?? draft?.description ?? null,
    visibilityIntent: draftVisibility ?? draft?.visibilityIntent ?? "public",
  } as const;

  const toggleWork = (songId: number) => {
    setSelectedSongIds((previous) => {
      const starting = previous ?? tracks.map((track: any) => track.songId);
      return starting.includes(songId) ? starting.filter((id) => id !== songId) : [...starting, songId];
    });
  };

  const saveTrackMembership = () => {
    if (!draft || currentSelection.length === 0) {
      toast.error("Choose at least one published audio Work.");
      return;
    }
    setSavingSelection(true);
    replaceTracks.mutate({ draftId, expectedRevision: draft.revision, songIdsInOrder: currentSelection });
  };

  const reorder = (fromId: number, toId: number) => {
    if (!draft || fromId === toId) return;
    const currentIds = tracks.map((track: any) => track.membershipId);
    const from = currentIds.indexOf(fromId);
    const to = currentIds.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...currentIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderTracks.mutate({ draftId, expectedRevision: draft.revision, membershipIdsInOrder: next });
  };

  if (draftQuery.isLoading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "var(--ln-gold)" }} /></div>;
  if (!draft) return <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>This private draft is unavailable.</p>;

  const busy = updateMetadata.isPending || replaceTracks.isPending || reorderTracks.isPending || abandon.isPending;
  const selectionChanged = selectedSongIds !== null;

  return (
    <section aria-label="Edit Draft Release" className="space-y-5 rounded-2xl border p-4 sm:p-6" style={{ borderColor: "rgba(196,154,40,0.35)", background: "linear-gradient(145deg, rgba(196,154,40,0.08), rgba(10,10,10,0.18))" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>PRIVATE DRAFT RELEASE</p>
          <h2 className="mt-1 text-xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{draft.title}</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--ln-smoke)" }}>Editable relationships only. Your Works, media, WIDs, and declarations are unchanged.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-white/15 text-xs" style={{ color: "var(--ln-parchment)" }}><ChevronLeft className="mr-1 h-3.5 w-3.5" /> All collections</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs" style={{ color: "var(--ln-smoke)" }}>
          Release title
          <input value={metadata.title} maxLength={255} onChange={(event) => setDraftTitle(event.target.value)} className="min-w-0 rounded-lg border bg-black/20 px-3 py-2 text-sm outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }} />
        </label>
        <label className="grid gap-1.5 text-xs" style={{ color: "var(--ln-smoke)" }}>
          Intended visibility after sealing
          <select value={metadata.visibilityIntent} onChange={(event) => setDraftVisibility(event.target.value as VisibilityIntent)} className="rounded-lg border bg-black/20 px-3 py-2 text-sm outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }}>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-xs" style={{ color: "var(--ln-smoke)" }}>
        Release note
        <textarea value={metadata.description ?? ""} maxLength={20_000} onChange={(event) => setDraftDescription(event.target.value)} rows={3} className="min-w-0 resize-y rounded-lg border bg-black/20 px-3 py-2 text-sm outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }} />
      </label>
      <Button type="button" size="sm" disabled={busy || metadata.title.trim().length === 0} onClick={() => updateMetadata.mutate({ draftId, expectedRevision: draft.revision, metadata })} style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.35)", color: "var(--ln-gold)" }}>
        {updateMetadata.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Save details
      </Button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>Release sequence</h3>
            <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{tracks.length} Work{tracks.length === 1 ? "" : "s"}</span>
          </div>
          {tracks.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.20)", color: "var(--ln-smoke)" }}>Select published audio Works from the catalog, then save the membership.</p> : (
            <ol className="space-y-2">
              {tracks.map((track: any, index: number) => <DraftTrackRow key={track.membershipId} track={track} index={index} total={tracks.length} busy={busy} onDragStart={() => setDraggedMembershipId(track.membershipId)} onDrop={() => { if (draggedMembershipId) reorder(draggedMembershipId, track.membershipId); setDraggedMembershipId(null); }} onMove={(direction) => reorder(track.membershipId, tracks[index + direction].membershipId)} onRemove={() => setSelectedSongIds(currentSelection.filter((songId) => songId !== track.songId))} />)}
            </ol>
          )}
          <p className="mt-2 text-[11px]" style={{ color: "var(--ln-iron)" }}>Drag to reorder, or use the move buttons. Removal remains staged until you save membership.</p>
        </div>

        <div className="min-w-0 rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.18)" }}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>Published Works</h3>
            <span className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>{currentSelection.length} selected</span>
          </div>
          <p className="mb-3 text-xs" style={{ color: "var(--ln-smoke)" }}>Only your published, public audio Works with existing WIDs appear here. Selecting one does not re-register it.</p>
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {(eligibleWorks.data ?? []).map((work: any) => {
              const selected = currentSelection.includes(work.id);
              return <label key={work.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5">
                <input type="checkbox" checked={selected} disabled={busy} onChange={() => toggleWork(work.id)} className="accent-[var(--ln-gold)]" />
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded" style={{ background: "rgba(196,154,40,0.08)" }}>{work.coverArtUrl ? <img src={work.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <Music className="m-2 h-4 w-4" style={{ color: "var(--ln-gold)" }} />}</div>
                <div className="min-w-0"><p className="truncate text-xs font-medium" style={{ color: "var(--ln-parchment)" }}>{work.title}</p><p className="truncate font-mono text-[10px]" style={{ color: "rgba(196,154,40,0.5)" }}>{work.witnessId}</p></div>
              </label>;
            })}
          </div>
          <Button type="button" size="sm" className="mt-3 w-full" disabled={busy || !selectionChanged} onClick={saveTrackMembership} style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>
            {savingSelection ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />} Save track membership
          </Button>
        </div>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: "rgba(196,154,40,0.24)", background: "rgba(196,154,40,0.04)" }}>
        <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--ln-gold)" }} /><div><p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>WID-ALB2 sealed edition</p><p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{RELEASE_SIGNING_HOLD}</p></div></div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { if (window.confirm("Archive this private draft? Its Works and historical records will remain unchanged.")) abandon.mutate({ draftId, expectedRevision: draft.revision }); }} className="border-red-500/30 text-xs hover:bg-red-500/10" style={{ color: "var(--ln-ember)" }}>Archive draft</Button>
        <span className="self-center text-[11px]" style={{ color: "var(--ln-iron)" }}>Revision {draft.revision} · private workspace</span>
      </div>
    </section>
  );
}

export default function CollectionsWorkspacePage() {
  const { id: routeDraftId } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const drafts = trpc.releaseDrafts.listMine.useQuery(undefined, { enabled: !!user });
  const legacyAlbums = trpc.songs.getMyCollections.useQuery(undefined, { enabled: !!user });
  const namedPlaylists = trpc.playlists.mine.useQuery(undefined, { enabled: !!user });
  const [activeDraftId, setActiveDraftId] = useState<number | null>(() => {
    const parsed = Number(routeDraftId);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [newTitle, setNewTitle] = useState("");
  const [newVisibility, setNewVisibility] = useState<VisibilityIntent>("public");
  const [manifestPlaylistId, setManifestPlaylistId] = useState<number | null>(null);
  const createDraft = trpc.releaseDrafts.create.useMutation({
    onSuccess: async ({ draft }) => {
      setNewTitle("");
      setActiveDraftId(draft.id);
      await utils.releaseDrafts.listMine.invalidate();
      toast.success("Private Draft Release created.");
    },
    onError: (error) => toast.error(error.message),
  });

  const content = useMemo(() => ({ drafts: drafts.data ?? [], albums: legacyAlbums.data ?? [], playlists: namedPlaylists.data ?? [] }), [drafts.data, legacyAlbums.data, namedPlaylists.data]);

  const copyPlaylistManifest = async (playlist: any) => {
    setManifestPlaylistId(playlist.id);
    try {
      const manifest = await utils.playlists.copyProvenancePlayerManifest.fetch({ id: playlist.id });
      if (await copyProvenancePlayerManifest(manifest)) {
        toast.success("Manifest copied", { description: "In Provenance Player: Add → LN manifest → Paste → Import." });
      } else {
        toast.error("Clipboard unavailable. Open the playlist editor to download its manifest JSON.");
      }
    } catch {
      toast.error("Manifest unavailable", { description: "Every Work must be eligible for the approved companion player." });
    } finally {
      setManifestPlaylistId(null);
    }
  };

  if (authLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--ln-gold)" }} /></div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Your Collections</h1><p className="mt-3 text-sm" style={{ color: "var(--ln-smoke)" }}>Sign in to organize your registered Works into private Draft Releases and named playlists.</p><Link href="/archive" className="mt-5 inline-block text-sm" style={{ color: "var(--ln-gold)" }}>Return to Archive</Link></div>;

  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 pb-32 sm:py-12">
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs" style={{ color: "var(--ln-smoke)" }}><Link href="/archive?tab=collections" className="hover:underline" style={{ color: "var(--ln-gold)" }}>Archive</Link><span>/</span><span>Collections</span></nav>
    <header className="mb-8 max-w-3xl">
      <p className="text-xs font-bold tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>CREATOR DOMAIN</p>
      <h1 className="mt-2 text-3xl sm:text-4xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Collections Workspace</h1>
      <p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: "var(--ln-smoke)" }}>Arrange existing registered Works without duplicating media or replacing WIDs. Draft Releases are private and editable; sealed editions and named playlists retain their own distinct history.</p>
    </header>

    {activeDraftId ? <DraftReleaseEditor draftId={activeDraftId} onClose={() => { setActiveDraftId(null); if (routeDraftId) navigate("/creator/collections", { replace: true }); }} /> : <div className="space-y-8">
      <section className="rounded-2xl border p-4 sm:p-6" style={{ borderColor: "rgba(196,154,40,0.30)", background: "linear-gradient(135deg, rgba(196,154,40,0.08), rgba(0,0,0,0.08))" }}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[0.14em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>NEW RELEASE</p><h2 className="mt-1 text-xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Begin a private Draft Release</h2><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>Add Works, choose their order, and revise freely. Nothing is public or sealed here.</p></div><Sparkles className="h-8 w-8" style={{ color: "var(--ln-gold)" }} /></div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (newTitle.trim()) createDraft.mutate({ requestId: crypto.randomUUID(), metadata: { title: newTitle.trim(), visibilityIntent: newVisibility } }); }}>
          <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={255} placeholder="Release title" aria-label="New Draft Release title" className="min-w-0 flex-1 rounded-lg border bg-black/20 px-3 py-2 text-sm outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }} />
          <select value={newVisibility} onChange={(event) => setNewVisibility(event.target.value as VisibilityIntent)} aria-label="Intended edition visibility" className="rounded-lg border bg-black/20 px-3 py-2 text-sm" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }}><option value="public">Public when sealed</option><option value="unlisted">Unlisted when sealed</option><option value="private">Private when sealed</option></select>
          <Button type="submit" disabled={createDraft.isPending || !newTitle.trim()} style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>{createDraft.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Create draft</Button>
        </form>
      </section>

      <section aria-labelledby="draft-releases-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold tracking-[0.14em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>EDITABLE</p><h2 id="draft-releases-heading" className="text-xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Draft Releases</h2></div><span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{content.drafts.length} private draft{content.drafts.length === 1 ? "" : "s"}</span></div>
        {drafts.isLoading ? <div className="h-28 animate-pulse rounded-2xl" style={{ background: "var(--ln-coal)" }} /> : content.drafts.length === 0 ? <p className="rounded-2xl border border-dashed p-6 text-sm" style={{ borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-smoke)" }}>No Draft Releases yet. Start with existing published audio Works when you are ready.</p> : <div className="grid gap-3 md:grid-cols-2">{content.drafts.map((draft: any) => <button key={draft.id} type="button" onClick={() => setActiveDraftId(draft.id)} className="group min-w-0 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[rgba(196,154,40,0.52)] focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.22)", background: "var(--ln-coal)" }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-base" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{draft.title}</p><p className="mt-1 text-xs" style={{ color: "var(--ln-smoke)" }}>{draft.trackCount} Work{draft.trackCount === 1 ? "" : "s"} · revision {draft.revision}</p></div><span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: "var(--ln-gold)", background: "rgba(196,154,40,0.12)" }}>DRAFT</span></div><p className="mt-4 text-xs" style={{ color: "var(--ln-gold)" }}>Open private workspace →</p></button>)}</div>}
      </section>

      <section aria-labelledby="sealed-albums-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold tracking-[0.14em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>HISTORICAL</p><h2 id="sealed-albums-heading" className="text-xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Legacy WID-ALB Sealed Albums</h2></div><span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{content.albums.length} preserved album{content.albums.length === 1 ? "" : "s"}</span></div>
        <p className="mb-3 text-sm" style={{ color: "var(--ln-smoke)" }}>These origin records remain intact. Their membership and collective hash are not edited here; use the linked Studio for permitted presentation changes only.</p>
        <div className="grid gap-3 md:grid-cols-2">{content.albums.map((album: any) => <article key={album.id} className="min-w-0 rounded-2xl border p-4" style={{ borderColor: "rgba(255,255,255,0.1)", background: "var(--ln-coal)" }}><div className="flex min-w-0 gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: "rgba(196,154,40,0.08)" }}>{album.coverArtUrl ? <img src={album.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <Album className="m-3 h-6 w-6" style={{ color: "var(--ln-gold)" }} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{album.name}</p><p className="mt-1 truncate font-mono text-[10px]" style={{ color: "rgba(196,154,40,0.52)" }}>{album.collectionWid}</p><p className="mt-1 text-xs" style={{ color: "var(--ln-smoke)" }}>{album.trackCount ?? 0} tracks · {album.visibility}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Link href={`/album/${encodeURIComponent(album.collectionWid)}`} className="rounded-lg px-2.5 py-1.5 text-xs" style={{ color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}>View / copy manifest</Link><Link href={`/studio/collection/${album.id}`} className="rounded-lg px-2.5 py-1.5 text-xs" style={{ color: "var(--ln-smoke)", border: "1px solid rgba(255,255,255,0.1)" }}>Presentation Studio</Link></div></article>)}</div>
      </section>

      <section aria-labelledby="named-playlists-heading" className="rounded-2xl border p-4 sm:p-6" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold tracking-[0.14em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>EDITABLE LISTS</p><h2 id="named-playlists-heading" className="text-xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Named Playlists</h2><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>Playlists remain editable listening paths and may intentionally include a Work more than once. Their one canonical editor is kept separate from release drafting.</p></div><div className="flex flex-wrap gap-2"><Link href="/playlists" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs" style={{ color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}><ListMusic className="h-3.5 w-3.5" /> Manage playlists</Link><a href={PROVENANCE_PLAYER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs" style={{ color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}><Radio className="h-3.5 w-3.5" /> Open companion player</a></div></div>
        {namedPlaylists.isLoading ? <div className="h-20 animate-pulse rounded-xl" style={{ background: "var(--ln-coal)" }} /> : content.playlists.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-smoke)" }}>No named playlists yet. Create one in the playlist editor to build a flexible listening path.</p> : <div className="grid gap-2 sm:grid-cols-2">{content.playlists.map((playlist: any) => <article key={playlist.id} className="flex min-w-0 items-center gap-3 rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.14)" }}><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: "rgba(196,154,40,0.08)" }}>{playlist.coverArtUrl ? <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <ListMusic className="h-5 w-5" style={{ color: "var(--ln-gold)" }} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" style={{ color: "var(--ln-parchment)" }}>{playlist.name}</p><p className="mt-0.5 text-[11px]" style={{ color: "var(--ln-smoke)" }}>{playlist.trackCount ?? 0} track{playlist.trackCount === 1 ? "" : "s"} · {playlist.isPublic ? "shared" : "private"}</p></div><button type="button" disabled={manifestPlaylistId !== null} onClick={() => copyPlaylistManifest(playlist)} className="shrink-0 rounded-lg border p-2 disabled:opacity-50" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }} title="Copy eligible ordered manifest"><>{manifestPlaylistId === playlist.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}</></button></article>)}</div>}
      </section>
    </div>}
  </main>;
}
