import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Lock, Upload, Check, Loader2, Zap, BookOpen, Trash2, RotateCcw, X, Tag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { SKIN_IMAGES } from "@/components/FloatingAvatar";

// ─── Skin catalogue ───────────────────────────────────────────────────────────

const SKINS: Array<{
  id: string;
  name: string;
  cost: number;
  label: string;
  unlocks: string[];
  color: string;
  isUpload?: boolean;
}> = [
  {
    id: "hooded-scholar",
    name: "Hooded Scholar",
    cost: 0,
    label: "DEFAULT",
    unlocks: ["Guide mode", "Custodian mode", "Basic PPG"],
    color: "#C9A84C",
  },
  {
    id: "conductor",
    name: "The Conductor",
    cost: 50,
    label: "50 ◈",
    unlocks: ["Arrangement analysis", "Structural critique", "Beat mapping"],
    color: "#7B9EA6",
  },
  {
    id: "witness",
    name: "The Witness",
    cost: 75,
    label: "75 ◈",
    unlocks: ["Testimonial mode", "Emotional range analysis", "Corpus deep-read"],
    color: "#C9A84C",
  },
  {
    id: "archivist",
    name: "The Archivist",
    cost: 100,
    label: "100 ◈",
    unlocks: ["Provenance graph", "Fork lineage mapping", "WID cross-reference"],
    color: "#8B7355",
  },
  {
    id: "cipher",
    name: "The Cipher",
    cost: 150,
    label: "150 ◈",
    unlocks: ["Advanced signing", "Multi-sig events", "Key ceremony tools"],
    color: "#9B9BAA",
  },
  {
    id: "custom",
    name: "Custom Upload",
    cost: 200,
    label: "200 ◈",
    unlocks: ["Your face, your Keeper", "Custom name", "All modes unlocked"],
    color: "#C9A84C",
    isUpload: true,
  },
];

const MODES = ["Guide", "Conductor", "Witness", "Custodian", "Archivist", "Image"] as const;
type AgentMode = typeof MODES[number];

const MODE_COLORS: Record<AgentMode, string> = {
  Guide:     "#C9A84C",
  Conductor: "#7B9EA6",
  Witness:   "#D4956A",
  Custodian: "#7BA67B",
  Archivist: "#9B7B55",
  Image:     "#8B5CF6",
};

const MODE_CAPABILITY: Record<AgentMode, string> = {
  Guide:     "Direction · Inspiration · Voice",
  Conductor: "Structure · Arrangement · Flow",
  Witness:   "Testimony · Emotional Truth · Depth",
  Custodian: "Provenance · Archive · Legacy",
  Archivist: "Semantics · Pattern · Corpus",
  Image:     "Vision · Generate · Manifest",
};

// ─── Archetype base attribute profiles ───────────────────────────────────────
// (canonical definitions live in KeeperAttrsContext; imported below)
import { useKeeperAttrs, ARCHETYPE_BASES, type AttrKey, type AttrState } from "@/contexts/KeeperAttrsContext";

const STAT_LABELS: Array<{ key: AttrKey; label: string; isCount: boolean }> = [
  { key: "voiceDepth",       label: "Voice Depth",       isCount: false },
  { key: "lyricalDensity",   label: "Lyrical Density",   isCount: false },
  { key: "structuralLogic",  label: "Structural Logic",  isCount: false },
  { key: "emotionalRange",   label: "Emotional Range",   isCount: false },
  { key: "provenanceDepth",  label: "Provenance Depth",  isCount: false },
  { key: "corpusSize",       label: "Corpus Size",        isCount: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Keeper() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [selectedSkin, setSelectedSkin] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [reloadingNoteId, setReloadingNoteId] = useState<number | null>(null);

  // Per-archetype attribute state — shared via KeeperAttrsContext
  // activeMode is from context so ACTIVE MODE buttons update the attributes panel correctly
  const { activeMode, archetypeAttrs, setArchetypeAttrs, attrs, handleAttrChange, handleModeChange } = useKeeperAttrs();

  const profileQuery = trpc.keeper.getProfile.useQuery(undefined, { enabled: !!user });
  const notesQuery = trpc.keeper.listNotes.useQuery(undefined, { enabled: !!user && notesOpen });
  const deleteNoteMutation = trpc.keeper.deleteNote.useMutation({
    onSuccess: () => utils.keeper.listNotes.invalidate(),
    onError: () => toast.error("Failed to delete note."),
  });
  const unlockMutation = trpc.keeper.unlockSkin.useMutation();
  const setActiveMutation = trpc.keeper.setActiveSkin.useMutation();
  const uploadMutation = trpc.keeper.uploadCustomPortrait.useMutation();
  const utils = trpc.useUtils();

  /** Reload a saved note into the Keeper chat by navigating to the Keeper chat page with the note pre-filled */
  const handleReloadNote = (content: string, noteId: number) => {
    setReloadingNoteId(noteId);
    // Copy to clipboard so user can paste into chat, and show a toast
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Note copied to clipboard — paste it into the Keeper chat.", { duration: 4000 });
    }).catch(() => {
      toast.info("Note ready — paste into the Keeper chat.");
    });
    setReloadingNoteId(null);
    setNotesOpen(false);
    navigate("/keeper-compose");
  };

  const profile = profileQuery.data;
  const ownedSkins = new Set(profile?.ownedSkins ?? []);
  const activeSkinId = profile?.activeSkinId ?? "hooded-scholar";
  const stats = profile?.stats;

  const activeSkin = SKINS.find(s => s.id === activeSkinId) ?? SKINS[0];
  const activeSkinImg = activeSkinId === "custom" && profile?.customImageUrl
    ? profile.customImageUrl
    : SKIN_IMAGES[activeSkinId] ?? SKIN_IMAGES["hooded-scholar"];

  const handleSelectSkin = async (skinId: string, cost: number) => {
    if (!ownedSkins.has(skinId) && skinId !== "hooded-scholar") {
      // Mock unlock (future: Stripe)
      try {
        await unlockMutation.mutateAsync({ skinId: skinId as "hooded-scholar" | "conductor" | "witness" | "archivist" | "cipher" | "custom", creditsPaid: cost });
        toast.success(`${SKINS.find(s => s.id === skinId)?.name} unlocked!`);
        utils.keeper.getProfile.invalidate();
      } catch {
        toast.error("Failed to unlock skin.");
        return;
      }
    }
    await setActiveMutation.mutateAsync({ skinId });
    utils.keeper.getProfile.invalidate();
    toast.success("Keeper skin activated.");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      try {
        await uploadMutation.mutateAsync({ imageBase64: base64, mimeType });
        await setActiveMutation.mutateAsync({ skinId: "custom" });
        utils.keeper.getProfile.invalidate();
        toast.success("Custom portrait uploaded and activated.");
      } catch {
        toast.error("Upload failed.");
      }
    };
    reader.readAsDataURL(file);
  };

  if (authLoading || profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-obsidian)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--ln-obsidian)",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,158,166,0.04) 0%, transparent 60%)",
      }}
    >
      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--ln-smoke)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem" }}>BACK TO SURFACE</span>
        </button>
        <div className="flex-1" />
        {/* Notes button */}
        <button
          onClick={() => setNotesOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80 relative"
          style={{
            background: "var(--ln-gold)18",
            border: "1px solid var(--ln-gold)44",
            color: "var(--ln-gold)",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
          }}
        >
          <BookOpen className="w-3 h-3" />
          NOTES
          {notesQuery.data && notesQuery.data.length > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs"
              style={{ background: "var(--ln-gold)", color: "#0a0a0a", fontSize: "0.5rem", fontFamily: "'Space Mono', monospace" }}
            >
              {notesQuery.data.length > 99 ? "99+" : notesQuery.data.length}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate("/keeper-compose")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80"
          style={{
            background: "var(--ln-gold)22",
            border: "1px solid var(--ln-gold)66",
            color: "var(--ln-gold)",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
          }}
        >
          <Zap className="w-3 h-3" />
          COMPOSE
        </button>
        <div className="ln-wid-badge">KEEPER SCREEN</div>
      </header>

      {/* ── Notes Drawer ─────────────────────────────────────────────────── */}
      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0"
          style={{ background: "var(--ln-panel)", borderLeft: "1px solid var(--ln-panel-border)" }}
        >
          <SheetHeader className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--ln-panel-border)" }}>
            <div className="flex items-center justify-between">
              <SheetTitle
                className="flex items-center gap-2"
                style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", letterSpacing: "0.1em" }}
              >
                <BookOpen className="w-4 h-4" />
                KEEPER NOTES
              </SheetTitle>
              <button
                onClick={() => setNotesOpen(false)}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: "var(--ln-smoke)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SheetDescription style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.06em", marginTop: 4 }}>
              SAVED FROM KEEPER CHAT · CLICK TO RELOAD
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {notesQuery.isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--ln-gold)" }} />
              </div>
            )}
            {!notesQuery.isLoading && (!notesQuery.data || notesQuery.data.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <BookOpen className="w-8 h-8 opacity-30" style={{ color: "var(--ln-gold)" }} />
                <p style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em", textAlign: "center" }}>
                  NO NOTES SAVED YET<br />
                  <span style={{ opacity: 0.6 }}>USE THE KEEPER CHAT TO SAVE IDEAS,<br />LYRICS, AND INSPIRATIONS.</span>
                </p>
              </div>
            )}
            {notesQuery.data?.map((note: import('@/../../drizzle/schema').KeeperNote) => (
              <div
                key={note.id}
                className="rounded p-3 flex flex-col gap-2 group"
                style={{ background: "var(--ln-obsidian)", border: "1px solid var(--ln-panel-border)" }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold truncate"
                      style={{ color: "var(--ln-parchment)", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
                    >
                      {note.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.5rem" }}>
                        {note.personaId.toUpperCase()} · {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      {note.tag && (
                        <Badge
                          variant="outline"
                          className="h-3.5 px-1 text-xs"
                          style={{ color: "var(--ln-gold)", borderColor: "var(--ln-gold)44", fontFamily: "'Space Mono', monospace", fontSize: "0.45rem" }}
                        >
                          <Tag className="w-2 h-2 mr-0.5" />
                          {note.tag}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleReloadNote(note.content, note.id)}
                      disabled={reloadingNoteId === note.id}
                      className="p-1.5 rounded transition-all hover:opacity-80"
                      style={{ background: "var(--ln-gold)18", border: "1px solid var(--ln-gold)44", color: "var(--ln-gold)" }}
                      title="Copy to clipboard and open Keeper chat"
                    >
                      {reloadingNoteId === note.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RotateCcw className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => deleteNoteMutation.mutate({ id: note.id })}
                      disabled={deleteNoteMutation.isPending}
                      className="p-1.5 rounded transition-all hover:opacity-80"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {/* Preview */}
                <p
                  className="line-clamp-3 text-xs leading-relaxed"
                  style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.58rem" }}
                >
                  {note.content}
                </p>
                {note.imageUrl && (
                  <img
                    src={note.imageUrl}
                    alt="Note attachment"
                    className="w-full max-h-32 object-cover rounded"
                    style={{ border: "1px solid var(--ln-panel-border)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main layout — single column on mobile, 3-col on desktop */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* ── Left: Active Keeper portrait + stats ─────────────────────────── */}
        <div
          className="w-full md:w-80 flex-shrink-0 flex flex-col md:border-r border-b md:border-b-0 overflow-y-auto"
          style={{ borderColor: "var(--ln-panel-border)" }}
        >
          {/* Portrait */}
          <div className="relative p-6 flex flex-col items-center">
            {/* SC-style corner brackets */}
            <div className="relative">
              <div
                className="absolute top-0 left-0 w-4 h-4"
                style={{ borderTop: `2px solid ${activeSkin.color}`, borderLeft: `2px solid ${activeSkin.color}` }}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4"
                style={{ borderTop: `2px solid ${activeSkin.color}`, borderRight: `2px solid ${activeSkin.color}` }}
              />
              <div
                className="absolute bottom-0 left-0 w-4 h-4"
                style={{ borderBottom: `2px solid ${activeSkin.color}`, borderLeft: `2px solid ${activeSkin.color}` }}
              />
              <div
                className="absolute bottom-0 right-0 w-4 h-4"
                style={{ borderBottom: `2px solid ${activeSkin.color}`, borderRight: `2px solid ${activeSkin.color}` }}
              />
              <img
                src={activeSkinImg}
                alt={activeSkin.name}
                className="w-48 h-64 object-cover object-top"
                style={{ display: "block" }}
              />
            </div>

            {/* Name plate */}
            <div
              className="mt-3 px-4 py-1.5 text-center"
              style={{
                background: `${activeSkin.color}18`,
                border: `1px solid ${activeSkin.color}55`,
                borderRadius: 2,
              }}
            >
              <div
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: activeSkin.color, fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
              >
                {activeSkin.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)", fontSize: "0.6rem" }}>
                {user?.name ?? "Creator"}
              </div>
            </div>

            {/* Active mode badge */}
            <div
              className="mt-2 px-3 py-1 text-xs"
              style={{
                background: `${MODE_COLORS[activeMode]}18`,
                border: `1px solid ${MODE_COLORS[activeMode]}44`,
                color: MODE_COLORS[activeMode],
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.55rem",
                letterSpacing: "0.1em",
                borderRadius: 2,
              }}
            >
              MODE: {activeMode.toUpperCase()}
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 pb-4 space-y-2">
            <div
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            >
              Keeper Attributes
            </div>
            {STAT_LABELS.map(({ key, label, isCount }) => {
              const val = attrs[key];
              const max = isCount ? 1000 : 100;
              const pct = isCount ? Math.min(100, (val / max) * 100) : val;
              const base = ARCHETYPE_BASES[activeMode][key];
              const boosted = val > base;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-0.5">
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: boosted ? MODE_COLORS[activeMode] : "var(--ln-smoke)" }}>
                      {label}{boosted ? " ▲" : ""}
                    </span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)" }}>
                      {isCount ? `${val}` : `${val}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={max}
                    step={isCount ? 50 : 1}
                    value={val}
                    onChange={e => handleAttrChange(key, Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(90deg, ${MODE_COLORS[activeMode]} ${pct}%, var(--ln-panel-border) ${pct}%)`,
                      accentColor: MODE_COLORS[activeMode],
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Mode selector */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div
                className="text-xs uppercase tracking-widest"
                style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
              >
                Active Mode
              </div>
              <button
                onClick={() => setArchetypeAttrs(prev => ({ ...prev, [activeMode]: ARCHETYPE_BASES[activeMode] }))}
                className="text-xs px-2 py-0.5 rounded transition-all hover:opacity-80"
                style={{
                  border: `1px solid var(--ln-panel-border)`,
                  color: "var(--ln-smoke)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.5rem",
                  letterSpacing: "0.06em",
                }}
                title="Reset sliders to archetype base values"
              >
                RESET
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {MODES.map(m => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className="py-2 rounded text-xs transition-all"
                  style={{
                    background: activeMode === m ? `${MODE_COLORS[m]}22` : "transparent",
                    border: `1px solid ${activeMode === m ? MODE_COLORS[m] : "var(--ln-panel-border)"}`,
                    color: activeMode === m ? MODE_COLORS[m] : "var(--ln-smoke)",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.6rem",
                    letterSpacing: "0.08em",
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Capability label */}
            <div
              className="text-center py-1 px-2 rounded"
              style={{
                background: `${MODE_COLORS[activeMode]}10`,
                border: `1px solid ${MODE_COLORS[activeMode]}30`,
                color: MODE_COLORS[activeMode],
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.5rem",
                letterSpacing: "0.06em",
              }}
            >
              {MODE_CAPABILITY[activeMode]}
            </div>
          </div>
        </div>

        {/* ── Center: Skin selection grid ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div
            className="text-sm uppercase tracking-widest mb-6"
            style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
          >
            Choose Your Keeper — Skin Armory
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {SKINS.map(skin => {
              const owned = skin.id === "hooded-scholar" || ownedSkins.has(skin.id);
              const isActive = activeSkinId === skin.id;
              const skinImg = skin.id === "custom" && (uploadPreview || profile?.customImageUrl)
                ? (uploadPreview ?? profile?.customImageUrl ?? SKIN_IMAGES["upload-slot"])
                : SKIN_IMAGES[skin.id] ?? SKIN_IMAGES["upload-slot"];
              const isSelected = selectedSkin === skin.id;

              return (
                <div
                  key={skin.id}
                  className="relative flex flex-col cursor-pointer transition-all duration-200"
                  style={{
                    border: `1px solid ${isActive ? skin.color : isSelected ? `${skin.color}66` : "var(--ln-panel-border)"}`,
                    borderRadius: 4,
                    background: isActive ? `${skin.color}0A` : "var(--ln-panel)",
                    boxShadow: isActive ? `0 0 16px ${skin.color}33` : "none",
                  }}
                  onClick={() => setSelectedSkin(isSelected ? null : skin.id)}
                >
                  {/* Portrait */}
                  <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                    <img
                      src={skinImg}
                      alt={skin.name}
                      className="w-full h-full object-cover object-top"
                      style={{ filter: !owned ? "brightness(0.4) grayscale(0.5)" : "none" }}
                    />
                    {/* Lock overlay */}
                    {!owned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock style={{ width: 24, height: 24, color: skin.color, opacity: 0.8 }} />
                      </div>
                    )}
                    {/* Active check */}
                    {isActive && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: skin.color }}
                      >
                        <Check style={{ width: 12, height: 12, color: "#0a0a0a" }} />
                      </div>
                    )}
                    {/* SC corner brackets */}
                    <div className="absolute top-1 left-1 w-3 h-3" style={{ borderTop: `1.5px solid ${skin.color}88`, borderLeft: `1.5px solid ${skin.color}88` }} />
                    <div className="absolute top-1 right-1 w-3 h-3" style={{ borderTop: `1.5px solid ${skin.color}88`, borderRight: `1.5px solid ${skin.color}88` }} />
                    <div className="absolute bottom-1 left-1 w-3 h-3" style={{ borderBottom: `1.5px solid ${skin.color}88`, borderLeft: `1.5px solid ${skin.color}88` }} />
                    <div className="absolute bottom-1 right-1 w-3 h-3" style={{ borderBottom: `1.5px solid ${skin.color}88`, borderRight: `1.5px solid ${skin.color}88` }} />
                  </div>

                  {/* Name plate */}
                  <div className="p-2">
                    <div
                      className="text-xs font-semibold truncate"
                      style={{ color: skin.color, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
                    >
                      {skin.name}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
                    >
                      {skin.label}
                    </div>
                  </div>

                  {/* Expanded detail on selection */}
                  {isSelected && (
                    <div
                      className="px-2 pb-2 space-y-1"
                      style={{ borderTop: `1px solid ${skin.color}33` }}
                    >
                      <div
                        className="text-xs mt-1.5 mb-1"
                        style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
                      >
                        Unlocks:
                      </div>
                      {skin.unlocks.map(u => (
                        <div key={u} className="flex items-center gap-1">
                          <Zap style={{ width: 8, height: 8, color: skin.color, flexShrink: 0 }} />
                          <span style={{ fontSize: "0.6rem", color: "var(--ln-parchment)" }}>{u}</span>
                        </div>
                      ))}

                      {/* Action button */}
                      <div className="mt-2">
                        {skin.isUpload ? (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            <button
                              className="w-full py-1.5 rounded text-xs transition-all hover:opacity-80"
                              style={{
                                background: `${skin.color}22`,
                                border: `1px solid ${skin.color}66`,
                                color: skin.color,
                                fontFamily: "'Space Mono', monospace",
                                fontSize: "0.6rem",
                              }}
                              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                              disabled={uploadMutation.isPending}
                            >
                              {uploadMutation.isPending
                                ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                                : <Upload className="w-3 h-3 inline mr-1" />}
                              {owned ? "Change Image" : "Upload & Unlock"}
                            </button>
                          </>
                        ) : isActive ? (
                          <div
                            className="w-full py-1.5 rounded text-xs text-center"
                            style={{
                              background: `${skin.color}22`,
                              border: `1px solid ${skin.color}66`,
                              color: skin.color,
                              fontFamily: "'Space Mono', monospace",
                              fontSize: "0.6rem",
                            }}
                          >
                            ✓ Active
                          </div>
                        ) : owned ? (
                          <button
                            className="w-full py-1.5 rounded text-xs transition-all hover:opacity-80"
                            style={{
                              background: `${skin.color}22`,
                              border: `1px solid ${skin.color}66`,
                              color: skin.color,
                              fontFamily: "'Space Mono', monospace",
                              fontSize: "0.6rem",
                            }}
                            onClick={(e) => { e.stopPropagation(); handleSelectSkin(skin.id, skin.cost); }}
                            disabled={setActiveMutation.isPending}
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            className="w-full py-1.5 rounded text-xs transition-all hover:opacity-80"
                            style={{
                              background: `${skin.color}22`,
                              border: `1px solid ${skin.color}66`,
                              color: skin.color,
                              fontFamily: "'Space Mono', monospace",
                              fontSize: "0.6rem",
                            }}
                            onClick={(e) => { e.stopPropagation(); handleSelectSkin(skin.id, skin.cost); }}
                            disabled={unlockMutation.isPending}
                          >
                            {unlockMutation.isPending
                              ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                              : null}
                            Unlock · {skin.label}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loadout slots */}
          <div className="mt-8">
            <div
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
            >
              Keeper Loadout
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { slot: "Appearance", value: activeSkin.name },
                { slot: "Voice Style", value: "Default Cadence" },
                { slot: "Response Tone", value: activeMode },
                { slot: "Anchor Seal", value: "Hexagonal WID" },
                { slot: "Background Aura", value: "Obsidian Void" },
              ].map(({ slot, value }) => (
                <div
                  key={slot}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)" }}
                >
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-smoke)" }}>
                    {slot}
                  </span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
