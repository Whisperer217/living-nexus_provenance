/**
 * DomainEditor — Self-serve creator domain layout editor.
 *
 * Features:
 *   - Drag-to-reorder blocks via mouse/touch
 *   - Show/hide toggle per block
 *   - Size selector (small / medium / large / full)
 *   - Save layout (creates a versioned manifestation event)
 *   - Version history panel
 *   - Preview mode toggle
 */

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { DEFAULT_DOMAIN_LAYOUT, DOMAIN_BLOCK_TYPES, type DomainBlockType, type DomainBlockSize, type DomainBlockRecord } from "@shared/domainTypes";
import {
  GripVertical, Eye, EyeOff, Save, History, ChevronDown,
  Music, BookOpen, BookMarked, FileText, Package, ShoppingBag,
  User, AlignLeft, Link2, Shield, FileEdit, Minus, Star, LayoutGrid,
  Library, Gamepad2, Loader2, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ── Block metadata ─────────────────────────────────────────────────────────────
const BLOCK_META: Record<DomainBlockType, { label: string; category: string; icon: React.ElementType; description: string }> = {
  hero:               { label: "Hero Banner",       category: "Identity",   icon: User,         description: "Your avatar, name, and origin statement" },
  bio:                { label: "Biography",          category: "Identity",   icon: AlignLeft,    description: "Philosophy, doctrine, and creator story" },
  shelf_music:        { label: "Music Shelf",        category: "Shelf",      icon: Music,        description: "Record rack — your music tracks" },
  shelf_books:        { label: "Book Shelf",         category: "Shelf",      icon: BookOpen,     description: "Library — novels, essays, short stories" },
  shelf_comics:       { label: "Comic Rack",         category: "Shelf",      icon: BookMarked,   description: "Comics and graphic novels" },
  shelf_manuscripts:  { label: "Manuscript Cabinet", category: "Shelf",      icon: FileText,     description: "Academic papers and manuscripts" },
  shelf_artifacts:    { label: "Artifact Case",      category: "Shelf",      icon: Package,      description: "Relics, objects, and visual art" },
  shelf_merch:        { label: "Merch Display",      category: "Shelf",      icon: ShoppingBag,  description: "Physical products and merchandise" },
  shelf_collections:  { label: "Collections Shelf",  category: "Shelf",      icon: Library,      description: "Manifested Collections — curated provenance paths" },
  shelf_games:         { label: "Games Shelf",         category: "Shelf",      icon: Gamepad2,     description: "Game arcade — playable and downloadable games" },
  featured_work:      { label: "Featured Works",     category: "Featured",   icon: Star,         description: "Pinned and highlighted works (up to 6)" },
  distribution_links: { label: "Distribution Links", category: "Commerce",   icon: Link2,        description: "Spotify, Apple Music, Bandcamp, etc." },
  tip_jar:            { label: "Tip Jar",            category: "Commerce",   icon: Package,      description: "Direct support and tipping" },
  provenance_trail:   { label: "Provenance Trail",   category: "Provenance", icon: Shield,       description: "WID timeline and domain version history" },
  field_notes:        { label: "Field Notes",        category: "Community",  icon: FileEdit,     description: "Your field notes feed" },
  community:          { label: "Community",          category: "Community",  icon: LayoutGrid,   description: "Followers and collaborators" },
  divider:            { label: "Divider",            category: "Structure",  icon: Minus,        description: "Visual section separator" },
  custom_text:        { label: "Custom Text",        category: "Structure",  icon: AlignLeft,    description: "Free-form announcement or text block" },
};

const CATEGORY_ORDER = ["Identity", "Shelf", "Featured", "Commerce", "Provenance", "Community", "Structure"];

// ── Editable block row ─────────────────────────────────────────────────────────
interface EditorBlock {
  blockType: DomainBlockType;
  position: number;
  visible: boolean;
  size: DomainBlockSize;
  config: Record<string, unknown>;
  savedId?: number;
}

function BlockRow({
  block,
  index,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleVisible,
  onSizeChange,
}: {
  block: EditorBlock;
  index: number;
  isDragging: boolean;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  onToggleVisible: (i: number) => void;
  onSizeChange: (i: number, size: DomainBlockSize) => void;
}) {
  const meta = BLOCK_META[block.blockType];
  const Icon = meta.icon;
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={onDrop}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-40 scale-95" : "opacity-100"
      } ${!block.visible ? "opacity-50" : ""}`}
      style={{
        background: isDragging ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isDragging ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {/* Grip */}
      <GripVertical className="w-4 h-4 text-white/20 flex-shrink-0" />

      {/* Icon */}
      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(212,175,55,0.08)" }}>
        <Icon className="w-3.5 h-3.5 text-[#D4AF37]/70" />
      </div>

      {/* Label + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 font-medium truncate">{meta.label}</p>
        <p className="text-[10px] text-white/30 truncate">{meta.description}</p>
      </div>

      {/* Category badge */}
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/10 text-white/30 hidden sm:flex">
        {meta.category}
      </Badge>

      {/* Size selector */}
      <div className="relative">
        <button
          onClick={() => setShowSizeMenu((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-white/40 hover:text-white/60 transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {block.size}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
        {showSizeMenu && (
          <div className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden shadow-xl"
            style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", minWidth: 80 }}>
            {(["small", "medium", "large", "full"] as DomainBlockSize[]).map((s) => (
              <button
                key={s}
                onClick={() => { onSizeChange(index, s); setShowSizeMenu(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  block.size === s ? "text-[#D4AF37]" : "text-white/50 hover:text-white/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visibility toggle */}
      <button
        onClick={() => onToggleVisible(index)}
        className={`w-7 h-7 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
          block.visible ? "text-[#D4AF37]/70 hover:text-[#D4AF37]" : "text-white/20 hover:text-white/40"
        }`}
        style={{ background: "rgba(255,255,255,0.05)" }}
        title={block.visible ? "Hide block" : "Show block"}
      >
        {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ── Version history panel ──────────────────────────────────────────────────────
function VersionHistoryPanel({ userId }: { userId: number }) {
  const { data: versions = [] } = trpc.domain.getVersionHistory.useQuery({});

  return (
    <div className="space-y-2">
      <h4 className="text-xs tracking-widest uppercase text-white/30 mb-3"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em" }}>
        Domain Versions
      </h4>
      {versions.length === 0 ? (
        <p className="text-xs text-white/25 italic">No versions saved yet</p>
      ) : (
        versions.map((v: any) => (
          <div key={v.id} className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}>
              <span className="text-[8px] text-[#D4AF37]/70 font-bold">{v.versionNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50">
                v{v.versionNumber}
                {v.changeNote && <span className="text-white/30"> — {v.changeNote}</span>}
              </p>
              <p className="text-[10px] text-white/25">
                {new Date(v.createdAt).toLocaleDateString()} · {(v.layoutSnapshot as any[]).length} blocks
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Add block panel ────────────────────────────────────────────────────────────
function AddBlockPanel({ existingTypes, onAdd }: { existingTypes: Set<DomainBlockType>; onAdd: (t: DomainBlockType) => void }) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    blocks: DOMAIN_BLOCK_TYPES.filter((t) => BLOCK_META[t].category === cat),
  }));

  return (
    <div className="space-y-4">
      {grouped.map(({ category, blocks }) => (
        <div key={category}>
          <h4 className="text-[10px] tracking-widest uppercase text-white/25 mb-2"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em" }}>
            {category}
          </h4>
          <div className="space-y-1">
            {blocks.map((t) => {
              const meta = BLOCK_META[t];
              const Icon = meta.icon;
              const alreadyAdded = existingTypes.has(t);
              return (
                <button
                  key={t}
                  disabled={alreadyAdded}
                  onClick={() => onAdd(t)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors ${
                    alreadyAdded
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-white/5 cursor-pointer"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#D4AF37]/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70">{meta.label}</p>
                    <p className="text-[9px] text-white/30 truncate">{meta.description}</p>
                  </div>
                  {alreadyAdded && <Check className="w-3 h-3 text-white/20" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main DomainEditor ──────────────────────────────────────────────────────────
interface DomainEditorProps {
  userId: number;
  onClose?: () => void;
}

export function DomainEditor({ userId, onClose }: DomainEditorProps) {
  const utils = trpc.useUtils();
  const { data: savedBlocks = [] } = trpc.domain.getLayout.useQuery({ userId });

  // Initialize editor blocks from saved or default
  const initBlocks = useCallback((): EditorBlock[] => {
    if ((savedBlocks as DomainBlockRecord[]).length > 0) {
      return (savedBlocks as DomainBlockRecord[])
        .sort((a, b) => a.position - b.position)
        .map((b) => ({
          blockType: b.blockType,
          position: b.position,
          visible: b.visible,
          size: b.size,
          config: (b.config as Record<string, unknown>) ?? {},
          savedId: b.id,
        }));
    }
    return DEFAULT_DOMAIN_LAYOUT.map((b) => ({ ...b }));
  }, [savedBlocks]);

  const [blocks, setBlocks] = useState<EditorBlock[]>(initBlocks);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [panel, setPanel] = useState<"blocks" | "add" | "history">("blocks");
  const [changeNote, setChangeNote] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const saveLayout = trpc.domain.saveLayout.useMutation({
    onSuccess: () => {
      utils.domain.getLayout.invalidate({ userId });
      utils.domain.getVersionHistory.invalidate({});
      toast.success("Domain layout saved — manifestation recorded");
      setIsDirty(false);
      setChangeNote("");
    },
    onError: () => toast.error("Failed to save layout"),
  });

  // Drag handlers
  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (i: number) => setOverIdx(i);
  const handleDrop = () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...blocks];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(overIdx, 0, moved);
    const reindexed = next.map((b, i) => ({ ...b, position: i }));
    setBlocks(reindexed);
    setDragIdx(null);
    setOverIdx(null);
    setIsDirty(true);
  };

  const handleToggleVisible = (i: number) => {
    setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, visible: !b.visible } : b));
    setIsDirty(true);
  };

  const handleSizeChange = (i: number, size: DomainBlockSize) => {
    setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, size } : b));
    setIsDirty(true);
  };

  const handleAddBlock = (blockType: DomainBlockType) => {
    const newBlock: EditorBlock = {
      blockType,
      position: blocks.length,
      visible: true,
      size: "full",
      config: {},
    };
    setBlocks((prev) => [...prev, newBlock]);
    setPanel("blocks");
    setIsDirty(true);
  };

  const handleRemoveBlock = (i: number) => {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i).map((b, idx) => ({ ...b, position: idx })));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveLayout.mutate({
      blocks: blocks.map((b) => ({
        blockType: b.blockType,
        position: b.position,
        visible: b.visible,
        size: b.size,
        config: b.config,
      })),
      changeNote: changeNote || undefined,
    });
  };

  const existingTypes = new Set(blocks.map((b) => b.blockType));

  return (
    <div className="flex flex-col h-full"
      style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div>
          <h2 className="text-sm font-semibold text-white/80"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}>
            Domain Editor
          </h2>
          <p className="text-[10px] text-white/30">Drag blocks to reorder · Toggle visibility · Save to manifest</p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-[10px] text-[#D4AF37]/60 animate-pulse">Unsaved changes</span>
          )}
          {onClose && (
            <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/8">
        {([
          { key: "blocks", label: "Blocks" },
          { key: "add",    label: "Add Block" },
          { key: "history", label: "History" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPanel(key)}
            className={`flex-1 py-2 text-xs transition-colors ${
              panel === key
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {panel === "blocks" && blocks.map((block, i) => (
          <div key={`${block.blockType}-${i}`} className="relative group">
            <BlockRow
              block={block}
              index={i}
              isDragging={dragIdx === i}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onToggleVisible={handleToggleVisible}
              onSizeChange={handleSizeChange}
            />
            {/* Remove button */}
            <button
              onClick={() => handleRemoveBlock(i)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.15)" }}
              title="Remove block"
            >
              <X className="w-2.5 h-2.5 text-white/50" />
            </button>
          </div>
        ))}

        {panel === "add" && (
          <AddBlockPanel existingTypes={existingTypes} onAdd={handleAddBlock} />
        )}

        {panel === "history" && (
          <VersionHistoryPanel userId={userId} />
        )}
      </div>

      {/* Save footer */}
      {panel === "blocks" && (
        <div className="border-t border-white/8 p-3 space-y-2">
          <input
            type="text"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="Change note (optional)..."
            className="w-full px-3 py-1.5 rounded text-xs text-white/60 placeholder-white/20 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <Button
            onClick={handleSave}
            disabled={!isDirty || saveLayout.isPending}
            className="w-full text-xs h-8"
            style={{
              background: isDirty ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isDirty ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: isDirty ? "#D4AF37" : "rgba(255,255,255,0.3)",
            }}
          >
            {saveLayout.isPending ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Manifesting…</>
            ) : (
              <><Save className="w-3 h-3 mr-1.5" /> Save Domain Layout</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
