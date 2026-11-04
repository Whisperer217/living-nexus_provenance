import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Archive,
  ArrowRight,
  ChevronRight,
  FolderKanban,
  GripVertical,
  LibraryBig,
  ListMusic,
  MoreVertical,
  Share2,
  Trash2,
  Loader2,
  Music2,
  Pencil,
  Plus,
  Search,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useWorkEditorActions } from "@/contexts/WorkEditorContext";
import { usePlayer } from "@/contexts/PlayerContext";
import type { CreativeDrawerSong } from "@/components/CreativeDrawer";
import { toast } from "sonner";

const PROVENANCE_PLAYER_URL = "https://provenanceplayer.netlify.app/#/home";

type Work = Record<string, any> & { id: number; title: string };

function asEditorWork(work: Work): CreativeDrawerSong {
  return {
    id: work.id,
    title: work.title,
    genre: work.genre ?? null,
    caption: work.caption ?? null,
    coverArtUrl: work.coverArtUrl ?? null,
    aiConsent: work.aiConsent ?? null,
    status: work.status ?? "Published",
    lyricsText: work.lyricsText ?? null,
    haaiOriginStory: work.haaiOriginStory ?? null,
    aiDisclosure: work.aiDisclosure ?? null,
    participationMusic: work.participationMusic ?? null,
    participationLyrics: work.participationLyrics ?? null,
    participationVoice: work.participationVoice ?? null,
    contentType: work.contentType ?? "audio",
    releaseDate: work.releaseDate ?? null,
    creatorReleaseDate: work.creatorReleaseDate ?? null,
    description: work.description ?? null,
    witnessId: work.witnessId ?? null,
    videoUrl: work.videoUrl ?? null,
    videoWitnessId: work.videoWitnessId ?? null,
    externalLinksJson: work.externalLinksJson ?? null,
    downloadPermission: work.downloadPermission ?? null,
    downloadTipThresholdCents: work.downloadTipThresholdCents ?? null,
  };
}

function DeskLink({ href, icon: Icon, eyebrow, title, description, meta }: {
  href: string;
  icon: typeof LibraryBig;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link href={href} className="ln-nav-interactive group flex min-h-36 min-w-0 flex-col rounded-2xl border p-5 focus-visible:outline-none" style={{ borderColor: "rgba(196,154,40,0.25)", background: "linear-gradient(145deg, rgba(196,154,40,0.08), rgba(0,0,0,0.16))" }}>
      <span className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)", background: "rgba(196,154,40,0.08)" }}><Icon size={18} aria-hidden /></span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: "var(--ln-gold)" }} aria-hidden />
      </span>
      <span className="mt-5 text-[10px] font-semibold tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>{eyebrow}</span>
      <span className="mt-1 text-lg leading-tight" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{title}</span>
      <span className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{description}</span>
      {meta && <span className="mt-auto pt-4 text-xs" style={{ color: "var(--ln-gold)" }}>{meta}</span>}
    </Link>
  );
}

function formatTrackDuration(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "—:—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function AlbumManagementPanel({
  albums,
  drafts,
  isAuthenticated,
}: {
  albums: any[];
  drafts: any[];
  isAuthenticated: boolean;
}) {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"existing" | "draft">("existing");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(albums[0]?.id ?? null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [dirty, setDirty] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(new Set());
  const [previewTrackId, setPreviewTrackId] = useState<number | null>(null);
  const { state: playerState, addAndPlay, togglePlay } = usePlayer();
  const albumQuery = trpc.collectionStudio.getCollection.useQuery(
    { collectionId: selectedId ?? 1 },
    { enabled: isAuthenticated && mode === "existing" && !!selectedId, retry: false, refetchOnWindowFocus: false },
  );
  const updateMeta = trpc.collectionStudio.updateMeta.useMutation({
    onSuccess: async () => {
      await utils.collectionStudio.getCollection.invalidate({ collectionId: selectedId ?? 1 });
      await utils.songs.getMyCollections.invalidate();
      setDirty(false);
      toast.success("Album presentation saved.");
    },
    onError: (error) => toast.error(error.message),
  });
  const reorderTracks = trpc.collectionStudio.reorderTracks.useMutation({
    onSuccess: async () => {
      await utils.collectionStudio.getCollection.invalidate({ collectionId: selectedId ?? 1 });
      await utils.songs.getMyCollections.invalidate();
      setDirty(false);
      toast.success("Album order saved.");
    },
    onError: (error) => toast.error(error.message, { description: "The album was not changed. Refresh and try again." }),
  });

  useEffect(() => {
    const collection = albumQuery.data?.collection as any;
    if (!collection || dirty) return;
    setName(collection.name ?? "");
    setDescription(collection.description ?? "");
    setVisibility((collection.visibility as any) ?? "public");
    setTracks((albumQuery.data?.tracks as any[]) ?? []);
  }, [albumQuery.data, dirty]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const filteredAlbums = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return albums.filter((album) => !needle || [album.name, album.collectionWid, album.visibility].some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [albums, search]);

  const chooseAlbum = (id: number) => {
    if (dirty && !window.confirm("Discard your unsaved album changes?")) return;
    setDirty(false);
    setSelectedId(id);
    setSelectedTrackIds(new Set());
    setPreviewTrackId(null);
  };
  const moveTrack = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tracks.length) return;
    setTracks((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setDirty(true);
  };
  const saveOrder = () => {
    if (!selectedId || tracks.length === 0) return;
    reorderTracks.mutate({ collectionId: selectedId, orderedSongIds: tracks.map((track) => track.id) });
  };
  const saveMeta = () => {
    if (!selectedId) return;
    updateMeta.mutate({ collectionId: selectedId, name, description, visibility });
  };
  const toggleTrackSelection = (trackId: number) => {
    setSelectedTrackIds((current) => {
      const next = new Set(current);
      if (next.has(trackId)) next.delete(trackId); else next.add(trackId);
      return next;
    });
  };
  const selectAllTracks = () => setSelectedTrackIds(new Set(tracks.map((track) => track.id)));
  const moveSelected = (toEnd: boolean) => {
    if (selectedTrackIds.size === 0) return;
    setTracks((current) => {
      const chosen = current.filter((track) => selectedTrackIds.has(track.id));
      const remaining = current.filter((track) => !selectedTrackIds.has(track.id));
      return toEnd ? [...remaining, ...chosen] : [...chosen, ...remaining];
    });
    setDirty(true);
  };
  const previewTrack = (track: any) => {
    if (!track.fileUrl) return;
    if (previewTrackId === track.id && playerState.isPlaying) {
      togglePlay();
      return;
    }
    addAndPlay({
      id: String(track.id),
      title: track.title,
      artist: "Album preview",
      genre: track.genre ?? "",
      audioUrl: track.fileUrl,
      artUrl: track.coverArtUrl ?? undefined,
      witnessId: track.witnessId ?? undefined,
    });
    setPreviewTrackId(track.id);
  };

  return (
    <section aria-labelledby="work-desk-albums" className="mt-4 rounded-2xl border p-4 sm:p-5" style={{ borderColor: "rgba(196,154,40,0.28)", background: "linear-gradient(145deg, rgba(196,154,40,0.08), rgba(0,0,0,0.2))" }}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-display text-[10px] tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}><LibraryBig size={14} /> 06 · ALBUM MANAGEMENT</p><h2 id="work-desk-albums" className="mt-1 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Albums</h2><p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--ln-smoke)" }}>Tend existing album presentation and order without changing Work IDs, WIDs, or historical membership.</p></div><span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>Owner-authorized</span></div>
      <div className="mt-5 flex rounded-xl border p-1" style={{ borderColor: "rgba(196,154,40,0.2)", background: "rgba(0,0,0,0.18)" }}><button type="button" onClick={() => setMode("existing")} className="min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold" style={{ color: mode === "existing" ? "var(--ln-parchment)" : "var(--ln-smoke)", background: mode === "existing" ? "rgba(196,154,40,0.16)" : "transparent" }}>Existing Albums</button><button type="button" onClick={() => setMode("draft")} className="min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold" style={{ color: mode === "draft" ? "var(--ln-parchment)" : "var(--ln-smoke)", background: mode === "draft" ? "rgba(196,154,40,0.16)" : "transparent" }}>Draft Releases</button></div>
      {mode === "draft" ? <div className="mt-4 space-y-3">{drafts.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>No private Draft Releases yet. Create one from Collections, then manage membership through the existing revision-aware editor.</p> : drafts.map((draft) => <Link key={draft.id} href={`/studio/release/${draft.id}`} className="ln-nav-interactive flex min-w-0 items-center gap-3 rounded-xl border p-3" style={{ borderColor: "rgba(196,154,40,0.18)", background: "rgba(255,255,255,0.025)" }}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ color: "var(--ln-gold)", background: "rgba(196,154,40,0.09)" }}><LibraryBig size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{draft.title}</span><span className="mt-1 block text-xs" style={{ color: "var(--ln-smoke)" }}>{draft.trackCount ?? 0} Works · revision {draft.revision} · private draft</span></span><ArrowRight size={16} style={{ color: "var(--ln-gold)" }} /></Link>)}</div> : <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,.72fr)_minmax(0,1.28fr)]">
        <div><label className="relative block"><Search size={15} className="absolute left-3 top-3.5" style={{ color: "var(--ln-smoke)" }} /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" aria-label="Search existing albums" placeholder="Search albums or WID…" className="min-h-11 w-full rounded-lg border bg-black/20 pl-9 pr-3 text-sm outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }} /></label><div className="mt-3 space-y-2" role="listbox" aria-label="Existing albums">{filteredAlbums.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>No albums match this search.</p> : filteredAlbums.map((album) => <button key={album.id} type="button" role="option" aria-selected={selectedId === album.id} onClick={() => chooseAlbum(album.id)} className="ln-nav-interactive flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left" style={{ borderColor: selectedId === album.id ? "var(--ln-gold)" : "rgba(196,154,40,0.16)", background: selectedId === album.id ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.025)" }}><span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg" style={{ background: "rgba(196,154,40,0.09)" }}>{album.coverArtUrl ? <img src={album.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <LibraryBig className="m-3.5" size={18} style={{ color: "var(--ln-gold)" }} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{album.name}</span><span className="mt-1 block truncate font-mono text-[10px]" style={{ color: "var(--ln-gold-dim)" }}>{album.collectionWid}</span><span className="mt-1 block text-xs" style={{ color: "var(--ln-smoke)" }}>{album.trackCount ?? 0} Works · {album.visibility}</span></span></button>)}</div></div>
        <div className="min-w-0 rounded-xl border p-4" style={{ borderColor: "rgba(196,154,40,0.18)", background: "rgba(0,0,0,0.16)" }}>{albumQuery.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ln-gold)" }} /></div> : albumQuery.error ? <div className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-smoke)" }}>This album could not be opened. <button type="button" onClick={() => albumQuery.refetch()} className="underline" style={{ color: "var(--ln-gold)" }}>Retry</button></div> : !albumQuery.data ? <p className="p-5 text-sm" style={{ color: "var(--ln-smoke)" }}>Choose an existing album to inspect it.</p> : <><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-lg" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{name}</p><p className="mt-1 break-all font-mono text-[10px]" style={{ color: "var(--ln-gold-dim)" }}>{(albumQuery.data.collection as any).collectionWid}</p></div><span className="rounded-full px-2.5 py-1 text-xs" style={{ color: "var(--ln-parchment)", background: "rgba(196,154,40,0.14)" }}>Sealed membership</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="text-xs" style={{ color: "var(--ln-smoke)" }}>Presentation title<input value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} className="mt-1 min-h-10 w-full rounded-lg border bg-black/20 px-3 text-sm" style={{ borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }} /></label><label className="text-xs" style={{ color: "var(--ln-smoke)" }}>Visibility<select value={visibility} onChange={(event) => { setVisibility(event.target.value as any); setDirty(true); }} className="mt-1 min-h-10 w-full rounded-lg border bg-black/20 px-3 text-sm" style={{ borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></label></div><label className="mt-3 block text-xs" style={{ color: "var(--ln-smoke)" }}>Description<textarea value={description} onChange={(event) => { setDescription(event.target.value); setDirty(true); }} rows={2} className="mt-1 w-full rounded-lg border bg-black/20 px-3 py-2 text-sm" style={{ borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }} /></label><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}><ShieldCheck size={14} style={{ color: "var(--ln-gold)" }} /> Membership additions/removals remain locked; order and presentation are editable.</p><button type="button" disabled={!dirty || updateMeta.isPending} onClick={saveMeta} className="ln-nav-interactive inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:opacity-50" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}><Save size={14} /> Save presentation</button></div><div className="mt-5 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>Track order</p><p className="mt-1 text-xs" style={{ color: "var(--ln-smoke)" }}>Drag on desktop; use Move Up/Down on touch screens. Select several tracks for bulk positioning.</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={selectAllTracks} className="text-[11px] underline" style={{ color: "var(--ln-gold)" }}>Select all</button><button type="button" onClick={() => setSelectedTrackIds(new Set())} className="text-[11px] underline" style={{ color: "var(--ln-smoke)" }}>Clear selection</button>{selectedTrackIds.size > 0 && <><button type="button" onClick={() => moveSelected(false)} className="text-[11px] underline" style={{ color: "var(--ln-gold)" }}>Move selected to top</button><button type="button" onClick={() => moveSelected(true)} className="text-[11px] underline" style={{ color: "var(--ln-gold)" }}>Move selected to bottom</button></>}</div></div><button type="button" disabled={!dirty || reorderTracks.isPending} onClick={saveOrder} className="ln-nav-interactive inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "rgba(196,154,40,0.35)", color: "var(--ln-gold)" }}><Save size={14} /> {reorderTracks.isPending ? "Saving…" : "Save order"}</button></div><div className="mt-3 space-y-2">{tracks.map((track, index) => <div key={track.id} draggable onDragStart={() => setDraggedId(track.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId === null || draggedId === track.id) return; const from = tracks.findIndex((entry) => entry.id === draggedId); const to = index; setTracks((current) => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; }); setDraggedId(null); setDirty(true); }} className="flex min-w-0 items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: "rgba(196,154,40,0.14)", background: "rgba(255,255,255,0.025)" }}><GripVertical className="hidden shrink-0 sm:block" size={16} style={{ color: "var(--ln-gold-dim)" }} aria-label="Drag handle" /><input type="checkbox" checked={selectedTrackIds.has(track.id)} onChange={() => toggleTrackSelection(track.id)} aria-label={`Select ${track.title}`} className="h-4 w-4 shrink-0 accent-[var(--ln-gold)]" /><span className="w-5 shrink-0 text-right font-mono text-xs" style={{ color: "var(--ln-gold-dim)" }}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{track.title}</span><span className="shrink-0 font-mono text-[11px]" style={{ color: "var(--ln-smoke)" }}>{formatTrackDuration(track.durationSeconds)}</span>{track.fileUrl && <button type="button" onClick={() => previewTrack(track)} aria-label={`${previewTrackId === track.id && playerState.isPlaying ? "Pause" : "Preview"} ${track.title}`} className="ln-nav-interactive rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-gold)" }}>{previewTrackId === track.id && playerState.isPlaying ? "Pause" : "Preview"}</button>}<button type="button" onClick={() => moveTrack(index, -1)} disabled={index === 0} aria-label={`Move ${track.title} up`} className="ln-nav-interactive rounded-md p-2 disabled:opacity-30" style={{ color: "var(--ln-gold)" }}><ArrowUp size={15} /></button><button type="button" onClick={() => moveTrack(index, 1)} disabled={index === tracks.length - 1} aria-label={`Move ${track.title} down`} className="ln-nav-interactive rounded-md p-2 disabled:opacity-30" style={{ color: "var(--ln-gold)" }}><ArrowDown size={15} /></button></div>)}</div></div></>}</div>
      </div>}
    </section>
  );
}

function PlaylistRack({
  playlists,
  selectedWork,
  isAuthenticated,
}: {
  playlists: any[];
  selectedWork: Work | null;
  isAuthenticated: boolean;
}) {
  const utils = trpc.useUtils();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(playlists[0]?.id ?? null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [trackItems, setTrackItems] = useState<any[]>([]);
  const [draggedTrackId, setDraggedTrackId] = useState<number | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const playlistQuery = trpc.playlists.getById.useQuery(
    { id: selectedPlaylistId ?? 1 },
    { enabled: isAuthenticated && !!selectedPlaylistId, staleTime: 30_000, retry: false },
  );
  const addTrack = trpc.playlists.addTrack.useMutation({
    onSuccess: async () => {
      await utils.playlists.getById.invalidate({ id: selectedPlaylistId ?? 1 });
      await utils.playlists.mine.invalidate();
      toast.success(`Added “${selectedWork?.title ?? "Work"}” to the playlist.`);
    },
    onError: (error) => toast.error(error.message || "The Work could not be added."),
  });
  const deletePlaylist = trpc.playlists.delete.useMutation({
    onSuccess: async () => {
      await utils.playlists.mine.invalidate();
      setOpenMenuId(null);
      setSelectedPlaylistId(null);
      toast.success("Playlist removed.");
    },
    onError: (error) => toast.error(error.message || "The playlist could not be removed."),
  });
  const generateShareSlug = trpc.playlists.generateShareSlug.useMutation({
    onSuccess: async (data) => {
      const url = `${window.location.origin}/p/${data.slug}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Playlist link copied.");
      } catch {
        toast.error("The playlist link was created, but could not be copied.", { description: url });
      }
      await utils.playlists.mine.invalidate();
      setOpenMenuId(null);
    },
    onError: (error) => toast.error(error.message || "The playlist link could not be created."),
  });
  const sharePlaylist = (playlist: any) => {
    if (playlist.shareSlug) {
      const url = `${window.location.origin}/p/${playlist.shareSlug}`;
      navigator.clipboard.writeText(url).then(() => toast.success("Playlist link copied.")).catch(() => toast.error("Could not copy playlist link."));
      setOpenMenuId(null);
      return;
    }
    generateShareSlug.mutate({ id: playlist.id });
  };
  const removePlaylist = (playlist: any) => {
    if (!window.confirm(`Remove “${playlist.name}” from your Playlists? Its Works and WIDs will remain unchanged.`)) return;
    deletePlaylist.mutate({ id: playlist.id });
  };

  const removeTrack = trpc.playlists.removeTrack.useMutation({
    onSuccess: async () => {
      await utils.playlists.getById.invalidate({ id: selectedPlaylistId ?? 1 });
      await utils.playlists.mine.invalidate();
      toast.success("Playlist occurrence removed.");
    },
    onError: (error) => toast.error(error.message || "The playlist occurrence could not be removed."),
  });
  const reorder = trpc.playlists.reorder.useMutation({
    onSuccess: async () => {
      await utils.playlists.getById.invalidate({ id: selectedPlaylistId ?? 1 });
      await utils.playlists.mine.invalidate();
      setOrderDirty(false);
      toast.success("Playlist order saved.");
    },
    onError: (error) => toast.error(error.message || "Playlist order could not be saved."),
  });

  useEffect(() => {
    if (!orderDirty) setTrackItems((playlistQuery.data?.tracks as any[]) ?? []);
  }, [playlistQuery.data, orderDirty]);

  const choosePlaylist = (id: number) => {
    if (orderDirty && !window.confirm("Discard your unsaved playlist order?")) return;
    setOrderDirty(false);
    setSelectedPlaylistId(id);
  };
  const moveTrack = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= trackItems.length) return;
    setTrackItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setOrderDirty(true);
  };
  const saveOrder = () => {
    if (!selectedPlaylistId || trackItems.length === 0) return;
    reorder.mutate({ playlistId: selectedPlaylistId, orderedPlaylistTrackIds: trackItems.map((track) => track.id) });
  };

  return (
    <section aria-labelledby="work-desk-playlist-rack" className="mt-4 rounded-2xl border p-4 sm:p-5" style={{ borderColor: "rgba(196,154,40,0.28)", background: "linear-gradient(145deg, rgba(196,154,40,0.08), rgba(0,0,0,0.2))" }}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-display text-[10px] tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}><ListMusic size={14} /> 07 · PLAYLIST RACK</p><h2 id="work-desk-playlist-rack" className="mt-1 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Playlist Rack</h2><p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--ln-smoke)" }}>Carry the selected Work into an editable listening path without changing its Registry identity.</p></div><span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>Existing authority</span></div>
      {playlists.length === 0 ? <div className="mt-4 rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>No Named Playlists yet. Create one in the existing Collections workspace, then return here to arrange it.</div> : <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,.72fr)_minmax(0,1.28fr)]"><div className="space-y-2" role="listbox" aria-label="Named Playlists">{playlists.map((playlist) => <div key={playlist.id} className="relative flex min-w-0 items-stretch rounded-xl border" style={{ borderColor: selectedPlaylistId === playlist.id ? "var(--ln-gold)" : "rgba(196,154,40,0.16)", background: selectedPlaylistId === playlist.id ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.025)" }}><button type="button" role="option" aria-selected={selectedPlaylistId === playlist.id} onClick={() => { choosePlaylist(playlist.id); setOpenMenuId(null); }} className="ln-nav-interactive flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-left focus-visible:outline-none"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ color: "var(--ln-gold)", background: "rgba(196,154,40,0.09)" }}><ListMusic size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{playlist.name}</span><span className="mt-1 block text-xs" style={{ color: "var(--ln-smoke)" }}>{playlist.trackCount ?? 0} occurrences · {playlist.isPublic ? "public" : "private"}</span></span></button><div className="relative flex shrink-0 items-center pr-2"><button type="button" aria-label={`Actions for ${playlist.name}`} aria-haspopup="menu" aria-expanded={openMenuId === playlist.id} onClick={() => setOpenMenuId((current) => current === playlist.id ? null : playlist.id)} className="ln-nav-interactive rounded-lg p-2 focus-visible:outline-none" style={{ color: "var(--ln-gold)" }}><MoreVertical size={17} /></button>{openMenuId === playlist.id && <div role="menu" aria-label={`${playlist.name} actions`} className="absolute right-2 top-11 z-20 min-w-40 rounded-xl border p-1.5 shadow-2xl" style={{ borderColor: "rgba(196,154,40,0.35)", background: "var(--ln-iron, #1c1a14)" }}><button type="button" role="menuitem" onClick={() => { choosePlaylist(playlist.id); setOpenMenuId(null); }} className="ln-nav-interactive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs" style={{ color: "var(--ln-parchment)" }}><Pencil size={13} /> Edit playlist</button><button type="button" role="menuitem" onClick={() => sharePlaylist(playlist)} disabled={generateShareSlug.isPending} className="ln-nav-interactive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs disabled:opacity-50" style={{ color: "var(--ln-parchment)" }}><Share2 size={13} /> {generateShareSlug.isPending ? "Creating link…" : "Share playlist"}</button><button type="button" role="menuitem" onClick={() => removePlaylist(playlist)} disabled={deletePlaylist.isPending} className="ln-nav-interactive flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs disabled:opacity-50" style={{ color: "#E8A090" }}><Trash2 size={13} /> Remove playlist</button></div>}</div></div>)}</div><div className="min-w-0 rounded-xl border p-4" style={{ borderColor: "rgba(196,154,40,0.18)", background: "rgba(0,0,0,0.16)" }}>{playlistQuery.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ln-gold)" }} /></div> : playlistQuery.error ? <p className="p-4 text-sm" style={{ color: "var(--ln-smoke)" }}>This playlist could not be opened. <button type="button" onClick={() => playlistQuery.refetch()} className="underline" style={{ color: "var(--ln-gold)" }}>Retry</button></p> : <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{playlistQuery.data?.playlist?.name}</p><p className="mt-1 text-xs" style={{ color: "var(--ln-smoke)" }}>{trackItems.length} playlist occurrences · duplicates remain distinct</p></div><button type="button" disabled={!selectedWork || addTrack.isPending} onClick={() => selectedPlaylistId && selectedWork && addTrack.mutate({ playlistId: selectedPlaylistId, songId: selectedWork.id })} className="ln-nav-interactive inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:opacity-50" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}><Plus size={14} /> {selectedWork ? `Add “${selectedWork.title}”` : "Select a Work first"}</button></div><p className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}><ShieldCheck size={14} style={{ color: "var(--ln-gold)" }} /> Adding and ordering use existing playlist ownership and integrity rules.</p><div className="mt-4 space-y-2">{trackItems.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>No occurrences yet. Select a Work in the cabinet, then add it here.</p> : trackItems.map((track, index) => <div key={track.id} draggable onDragStart={() => { setDraggedTrackId(track.id); setDragOverTrackId(null); }} onDragEnd={() => { setDraggedTrackId(null); setDragOverTrackId(null); }} onDragOver={(event) => { event.preventDefault(); if (draggedTrackId !== track.id) setDragOverTrackId(track.id); }} onDrop={() => { if (draggedTrackId === null || draggedTrackId === track.id) return; const from = trackItems.findIndex((entry) => entry.id === draggedTrackId); const to = index; setTrackItems((current) => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; }); setDraggedTrackId(null); setDragOverTrackId(null); setOrderDirty(true); }} className={`ln-playlist-rack-row flex min-w-0 items-center gap-2 rounded-xl border p-2.5${draggedTrackId === track.id ? " ln-playlist-rack-row--dragging" : ""}${dragOverTrackId === track.id ? " ln-playlist-rack-row--drop-target" : ""}`} style={{ borderColor: "rgba(196,154,40,0.14)", background: "rgba(255,255,255,0.025)" }}><span className="w-5 shrink-0 text-right font-mono text-xs" style={{ color: "var(--ln-gold-dim)" }}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{track.title ?? track.song?.title ?? "Untitled Work"}</span><button type="button" onClick={() => moveTrack(index, -1)} disabled={index === 0} aria-label={`Move ${track.title ?? "track"} up`} className="ln-nav-interactive rounded-md p-2 disabled:opacity-30" style={{ color: "var(--ln-gold)" }}><ArrowUp size={15} /></button><button type="button" onClick={() => moveTrack(index, 1)} disabled={index === trackItems.length - 1} aria-label={`Move ${track.title ?? "track"} down`} className="ln-nav-interactive rounded-md p-2 disabled:opacity-30" style={{ color: "var(--ln-gold)" }}><ArrowDown size={15} /></button><button type="button" onClick={() => selectedPlaylistId && removeTrack.mutate({ playlistTrackId: track.id, playlistId: selectedPlaylistId })} aria-label={`Remove ${track.title ?? "track"}`} className="ln-nav-interactive rounded-md px-2 py-1 text-[11px]" style={{ color: "var(--ln-smoke)" }}>Remove</button></div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs" style={{ color: orderDirty ? "var(--ln-gold)" : "var(--ln-smoke)" }}>{orderDirty ? "Unsaved playlist order" : "Playlist order saved"}</p><button type="button" disabled={!orderDirty || reorder.isPending} onClick={saveOrder} className="ln-nav-interactive inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "rgba(196,154,40,0.35)", color: "var(--ln-gold)" }}><Save size={14} /> {reorder.isPending ? "Saving…" : "Save order"}</button></div></>}</div></div>}
    </section>
  );
}

type ActivityItem = {
  id: string;
  kind: "work" | "release" | "playlist";
  title: string;
  detail: string;
  timestamp: Date | string | null | undefined;
  href?: string;
  workId?: number;
};

function relativeActivityTime(value: ActivityItem["timestamp"]) {
  if (!value) return "Recent";
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Just now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ActivityRow({ item, onSelectWork }: { item: ActivityItem; onSelectWork: (workId: number) => void }) {
  const Icon = item.kind === "work" ? Music2 : item.kind === "release" ? LibraryBig : ListMusic;
  const content = <><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ color: "var(--ln-gold)", background: "rgba(196,154,40,0.09)" }}><Icon size={15} aria-hidden /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{item.title}</span><span className="mt-1 block truncate text-xs" style={{ color: "var(--ln-smoke)" }}>{item.detail}</span></span><span className="shrink-0 text-right text-[11px]" style={{ color: "var(--ln-gold-dim)" }}>{relativeActivityTime(item.timestamp)}</span></>;
  if (item.kind === "work" && item.workId) {
    return <button type="button" onClick={() => onSelectWork(item.workId!)} className="ln-nav-interactive flex min-w-0 w-full items-center gap-3 rounded-xl border p-2.5 text-left focus-visible:outline-none" style={{ borderColor: "rgba(196,154,40,0.16)", background: "rgba(255,255,255,0.025)" }}>{content}</button>;
  }
  return <Link href={item.href ?? "/creator/collections"} className="ln-nav-interactive flex min-w-0 items-center gap-3 rounded-xl border p-2.5 focus-visible:outline-none" style={{ borderColor: "rgba(196,154,40,0.16)", background: "rgba(255,255,255,0.025)" }}>{content}</Link>;
}

export default function WorkDeskPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const { openEditor } = useWorkEditorActions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const worksQuery = trpc.songs.mySongs.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const releasesQuery = trpc.releaseDrafts.listMine.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const playlistsQuery = trpc.playlists.mine.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const albumsQuery = trpc.songs.getMyCollections.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });

  const works = (worksQuery.data ?? []) as Work[];
  const visibleWorks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return works.filter((work) => {
      if (work.status === "Deleted") return false;
      const published = (work.status ?? "Published") === "Published";
      if (filter === "published" && !published) return false;
      if (filter === "draft" && published) return false;
      if (!needle) return true;
      return [work.title, work.genre, work.witnessId, work.id].some((value) => String(value ?? "").toLowerCase().includes(needle));
    });
  }, [filter, search, works]);
  const selected = works.find((work) => work.id === selectedId) ?? visibleWorks[0] ?? null;
  const publishedCount = works.filter((work) => (work.status ?? "Published") === "Published").length;
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const workItems: ActivityItem[] = works
      .filter((work) => work.status !== "Deleted")
      .map((work) => ({
        id: `work-${work.id}`,
        kind: "work",
        title: work.title,
        detail: work.witnessId ?? `WORK-${work.id}`,
        timestamp: work.updatedAt ?? work.createdAt,
        workId: work.id,
      }));
    const releaseItems: ActivityItem[] = (releasesQuery.data ?? []).map((release: any) => ({
      id: `release-${release.id}`,
      kind: "release",
      title: release.title || "Untitled Draft Release",
      detail: `${release.trackCount ?? 0} Works · private draft`,
      timestamp: release.updatedAt ?? release.createdAt,
      href: "/creator/collections",
    }));
    const playlistItems: ActivityItem[] = (playlistsQuery.data ?? []).map((playlist: any) => ({
      id: `playlist-${playlist.id}`,
      kind: "playlist",
      title: playlist.name || "Untitled Playlist",
      detail: playlist.isPublic ? "public listening path" : "private listening path",
      timestamp: playlist.updatedAt ?? playlist.createdAt,
      href: "/profile?tab=collections",
    }));
    return [...workItems, ...releaseItems, ...playlistItems]
      .sort((left, right) => new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime())
      .slice(0, 8);
  }, [playlistsQuery.data, releasesQuery.data, works]);

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--ln-gold)" }} /></main>;
  if (!user) return <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center"><p className="font-display text-xs tracking-[0.22em]" style={{ color: "var(--ln-gold)" }}>WORK DESK</p><h1 className="mt-3 text-3xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Your registered Works, in one place.</h1><p className="mt-4 text-base leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Sign in to open the canonical Work Desk.</p><a href={getLoginUrl("/work-desk")} className="mt-7 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>Sign in</a></main>;

  return (
    <main className="relative min-h-screen overflow-hidden pb-32">
      <Helmet><title>Work Desk — Living Nexus</title></Helmet>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96" style={{ background: "radial-gradient(ellipse 65% 55% at 18% 0%, rgba(196,154,40,0.14), transparent 72%), radial-gradient(ellipse 45% 45% at 90% 8%, rgba(121,73,33,0.12), transparent 72%)" }} />
      <div className="relative mx-auto max-w-[1500px] px-4 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}><Link href="/creator" style={{ color: "var(--ln-gold)" }}>Creator Domain</Link><ChevronRight size={13} aria-hidden /><span>Work Desk</span></nav>
        <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-7" style={{ borderColor: "rgba(196,154,40,0.22)" }}>
          <div className="max-w-3xl"><p className="font-display text-[11px] font-semibold tracking-[0.24em]" style={{ color: "var(--ln-gold)" }}>LIVING NEXUS · CREATOR DOMAIN</p><h1 className="mt-3 text-3xl leading-tight sm:text-5xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Work Desk</h1><p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: "var(--ln-smoke)", fontFamily: "'Cormorant Garamond', serif" }}>One registered Work. Multiple permitted actions. One management surface. Select a Work to open its existing editor or carry the same record into a Draft Release or Playlist.</p></div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full border px-3 py-2" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-bone)" }}>{publishedCount} published Works</span><span className="rounded-full border px-3 py-2" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-bone)" }}>WIDs preserved</span></div>
        </header>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
          <section aria-labelledby="work-desk-library" className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "rgba(196,154,40,0.25)", background: "linear-gradient(145deg, rgba(196,154,40,0.07), rgba(0,0,0,0.2))" }}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-display text-[10px] tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}>01 · CANONICAL INVENTORY</p><h2 id="work-desk-library" className="mt-1 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Registered Works</h2><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>Search once. Arrange without re-uploading.</p></div><span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>{visibleWorks.length} shown</span></div>
            <label className="relative mt-4 block"><Search size={15} className="absolute left-3 top-3.5" style={{ color: "var(--ln-smoke)" }} /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" aria-label="Search registered Works" placeholder="Search title, genre, WID…" className="min-h-11 w-full rounded-lg border bg-black/20 pl-9 pr-3 text-sm outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)" }} /></label>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2"><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter Works" className="min-h-10 max-w-full rounded-lg border bg-black/20 px-3 text-xs outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-parchment)" }}><option value="all">All Works</option><option value="published">Published</option><option value="draft">Private Draft</option></select><Link href="/manage" className="ln-nav-interactive inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg border px-3 text-xs" style={{ borderColor: "rgba(196,154,40,0.24)", color: "var(--ln-gold)" }}><FolderKanban size={13} /> Full manager</Link></div>
            <div className="mt-4 space-y-2" aria-live="polite">{worksQuery.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ln-gold)" }} /></div> : visibleWorks.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>No Works match this view.</p> : visibleWorks.map((work) => <button key={work.id} type="button" onClick={() => setSelectedId(work.id)} className="ln-nav-interactive flex w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left focus-visible:outline-none" style={{ borderColor: selected?.id === work.id ? "var(--ln-gold)" : "rgba(196,154,40,0.16)", background: selected?.id === work.id ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.025)" }}><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: "rgba(196,154,40,0.09)" }}>{work.coverArtUrl ? <img src={work.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <Music2 size={20} style={{ color: "var(--ln-gold)" }} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm" style={{ color: "var(--ln-parchment)" }}>{work.title}</span><span className="mt-1 block truncate font-mono text-[10px]" style={{ color: "rgba(196,154,40,0.65)" }}>{work.witnessId ?? `WORK-${work.id}`} · {work.status ?? "Published"}</span></span><span className="flex shrink-0 gap-1"><span className="sr-only">Select {work.title}</span><Pencil size={14} style={{ color: "var(--ln-gold)" }} /></span></button>)}</div>
          </section>

          <section aria-labelledby="work-desk-inspector" className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "rgba(196,154,40,0.25)", background: "linear-gradient(145deg, rgba(196,154,40,0.07), rgba(0,0,0,0.2))" }}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-display text-[10px] tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}>02 · WORK INSPECTOR</p><h2 id="work-desk-inspector" className="mt-1 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Open the existing editor</h2><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>Presentation changes remain inside the canonical Work editing context.</p></div><span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>Owner-authorized</span></div>
            {!selected ? <div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>Select a registered Work from the inventory to inspect it.</div> : <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(210px,.72fr)]"><div><div className="flex gap-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl" style={{ background: "rgba(196,154,40,0.09)" }}>{selected.coverArtUrl ? <img src={selected.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <Music2 className="m-7" size={38} style={{ color: "var(--ln-gold)" }} />}</div><div className="min-w-0"><h3 className="text-xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{selected.title}</h3><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>{selected.genre ?? "Unassigned medium"}</p><p className="mt-2 text-xs" style={{ color: "var(--ln-smoke)" }}>{selected.status ?? "Published"}</p></div></div><button type="button" onClick={() => openEditor(asEditorWork(selected))} className="ln-nav-interactive mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}><Pencil size={15} /> Open Work Editor</button><Link href={`/song/${selected.id}`} className="ln-nav-interactive ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-gold)" }}>View Work</Link></div><div className="rounded-xl border p-4" style={{ borderColor: "rgba(196,154,40,0.2)", background: "rgba(0,0,0,0.16)" }}><p className="font-display text-[10px] tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>IDENTITY · STABLE</p><p className="mt-2 break-words text-xs font-mono" style={{ color: "var(--ln-parchment)" }}>{selected.witnessId ?? "Witness ID not present"}</p><p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>The Desk does not alter WIDs, origin testimony, media, or sealed history.</p></div></div>}
          </section>
        </div>

        <section aria-labelledby="work-desk-activity" className="mt-4 rounded-2xl border p-4 sm:p-5" style={{ borderColor: "rgba(196,154,40,0.25)", background: "linear-gradient(145deg, rgba(196,154,40,0.06), rgba(0,0,0,0.2))" }}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-display text-[10px] tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}><Activity size={14} /> 03 · RECENT ACTIVITY</p><h2 id="work-desk-activity" className="mt-1 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Latest edited records</h2><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>A quick return to the Works and collections you touched most recently.</p></div><span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>Read-only view</span></div>
          {recentActivity.length === 0 ? <div className="mt-4 rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>Recent edits will appear here as you work on registered Works and collections.</div> : <div className="mt-4 grid gap-2 md:grid-cols-2">{recentActivity.map((item) => <ActivityRow key={item.id} item={item} onSelectWork={setSelectedId} />)}</div>}
        </section>

        <AlbumManagementPanel albums={(albumsQuery.data ?? []) as any[]} drafts={(releasesQuery.data ?? []) as any[]} isAuthenticated={isAuthenticated} />
        <PlaylistRack playlists={(playlistsQuery.data ?? []) as any[]} selectedWork={selected} isAuthenticated={isAuthenticated} />

        <section aria-labelledby="work-desk-relationships" className="mt-4 grid gap-4 md:grid-cols-2"><DeskLink href="/creator/collections" icon={LibraryBig} eyebrow="08 · RELEASE RELATIONSHIPS" title="Draft Releases & Collections" description="Open the existing Collections workspace to create or continue private Draft Releases from registered Works." meta={`${releasesQuery.data?.length ?? 0} draft releases`} /><DeskLink href="/profile?tab=collections" icon={Plus} eyebrow="09 · LISTENING RELATIONSHIPS" title="Named Playlists" description="Manage editable listening paths without duplicating Works or creating new Witness IDs." meta={`${playlistsQuery.data?.length ?? 0} named playlists`} /></section>
        <section className="mt-4 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(196,154,40,0.2)", background: "rgba(196,154,40,0.04)" }}><div><p className="flex items-center gap-2 font-display text-[10px] tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}><ShieldCheck size={14} /> ONE AUTHORITY</p><h2 className="mt-2 text-lg" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>The record stays canonical.</h2><p className="mt-1 text-sm" style={{ color: "var(--ln-smoke)" }}>Legacy Studio, Archive, Collections, and Work routes remain available while this Desk becomes the clearer starting point.</p></div><a href={PROVENANCE_PLAYER_URL} target="_blank" rel="noopener noreferrer" className="ln-nav-interactive inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm" style={{ borderColor: "rgba(196,154,40,0.34)", color: "var(--ln-gold)" }}><Sparkles size={15} /> Companion Player</a></section>
        <p className="mt-5 flex items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}><Archive size={13} /> Existing management pages are preserved during this validation phase.</p>
      </div>
    </main>
  );
}
