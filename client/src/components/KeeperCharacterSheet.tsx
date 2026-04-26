import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Save, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SheetAttributes = {
  tone: string;
  voice: string;
  frameworks: string[];
  restrictions: string[];
  customNotes: string;
};

type MediumContext = {
  music: string;
  lyrics: string;
  book: string;
  comic: string;
  video: string;
  general: string;
};

type Sheet = {
  presetId: string;
  name: string;
  persona: string;
  attributes: SheetAttributes;
  mediumContext: MediumContext;
};

const MEDIUM_LABELS: Record<keyof MediumContext, string> = {
  music: "Music",
  lyrics: "Lyrics",
  book: "Book",
  comic: "Comic",
  video: "Video",
  general: "General",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function KeeperCharacterSheet({ onClose }: { onClose?: () => void }) {
  const presetsQuery = trpc.keeper.listPresets.useQuery();
  const sheetQuery = trpc.keeper.getActiveSheet.useQuery();
  const saveMutation = trpc.keeper.saveSheet.useMutation();
  const utils = trpc.useUtils();

  const [selectedPresetId, setSelectedPresetId] = useState<string>("the-witness");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [activeMedium, setActiveMedium] = useState<keyof MediumContext>("music");
  const [expandedSection, setExpandedSection] = useState<string>("persona");
  const [newFramework, setNewFramework] = useState("");
  const [newRestriction, setNewRestriction] = useState("");
  const [dirty, setDirty] = useState(false);

  const presets = presetsQuery.data ?? [];

  // Initialize sheet from DB or preset
  useEffect(() => {
    if (sheetQuery.data && !dirty) {
      const s = sheetQuery.data;
      setSelectedPresetId(s.presetId);
      setSheet({
        presetId: s.presetId,
        name: s.name,
        persona: s.persona,
        attributes: s.attributes as SheetAttributes,
        mediumContext: s.mediumContext as MediumContext,
      });
    }
  }, [sheetQuery.data]);

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setSheet({
      presetId: preset.id,
      name: preset.name,
      persona: preset.persona,
      attributes: preset.attributes as SheetAttributes,
      mediumContext: preset.mediumContext as MediumContext,
    });
    setDirty(true);
  };

  const updateAttr = (key: keyof SheetAttributes, value: any) => {
    if (!sheet) return;
    setSheet({ ...sheet, attributes: { ...sheet.attributes, [key]: value } });
    setDirty(true);
  };

  const updateMedium = (key: keyof MediumContext, value: string) => {
    if (!sheet) return;
    setSheet({ ...sheet, mediumContext: { ...sheet.mediumContext, [key]: value } });
    setDirty(true);
  };

  const addFramework = () => {
    if (!sheet || !newFramework.trim()) return;
    updateAttr("frameworks", [...sheet.attributes.frameworks, newFramework.trim()]);
    setNewFramework("");
  };

  const removeFramework = (i: number) => {
    if (!sheet) return;
    updateAttr("frameworks", sheet.attributes.frameworks.filter((_, idx) => idx !== i));
  };

  const addRestriction = () => {
    if (!sheet || !newRestriction.trim()) return;
    updateAttr("restrictions", [...sheet.attributes.restrictions, newRestriction.trim()]);
    setNewRestriction("");
  };

  const removeRestriction = (i: number) => {
    if (!sheet) return;
    updateAttr("restrictions", sheet.attributes.restrictions.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!sheet) return;
    try {
      await saveMutation.mutateAsync(sheet);
      utils.keeper.getActiveSheet.invalidate();
      setDirty(false);
      toast.success("Character sheet saved.");
    } catch {
      toast.error("Failed to save character sheet.");
    }
  };

  if (sheetQuery.isLoading || presetsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  if (!sheet) return null;

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? "" : s);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "var(--ln-obsidian)", color: "var(--ln-parchment)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--ln-panel-border)" }}
      >
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-gold)", letterSpacing: "0.1em" }}>
          ◈ CHARACTER SHEET
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all hover:opacity-80"
              style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)", color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            >
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              SAVE
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" style={{ color: "var(--ln-smoke)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Preset Selector */}
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)", letterSpacing: "0.08em", marginBottom: 8 }}>
            PRESET
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => loadPreset(p.id)}
                className="py-2 px-2 rounded text-left transition-all hover:opacity-90"
                style={{
                  background: selectedPresetId === p.id ? "rgba(201,168,76,0.12)" : "var(--ln-panel)",
                  border: `1px solid ${selectedPresetId === p.id ? "rgba(201,168,76,0.5)" : "var(--ln-panel-border)"}`,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.58rem",
                  color: selectedPresetId === p.id ? "var(--ln-gold)" : "var(--ln-smoke)",
                  letterSpacing: "0.06em",
                }}
              >
                {p.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Persona */}
        <div style={{ border: "1px solid var(--ln-panel-border)", borderRadius: 4, overflow: "hidden" }}>
          <button
            className="w-full flex items-center justify-between px-3 py-2 transition-opacity hover:opacity-80"
            style={{ background: "var(--ln-panel)" }}
            onClick={() => toggle("persona")}
          >
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)", letterSpacing: "0.08em" }}>PERSONA</span>
            {expandedSection === "persona" ? <ChevronUp className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} />}
          </button>
          {expandedSection === "persona" && (
            <div className="p-3">
              <textarea
                value={sheet.persona}
                onChange={e => { setSheet({ ...sheet, persona: e.target.value }); setDirty(true); }}
                rows={6}
                className="w-full rounded p-2 text-xs resize-none focus:outline-none"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid var(--ln-panel-border)",
                  color: "var(--ln-parchment)",
                  fontFamily: "inherit",
                  fontSize: "0.72rem",
                  lineHeight: 1.6,
                }}
                placeholder="Describe who the Keeper is, how it speaks, and what it knows..."
              />
            </div>
          )}
        </div>

        {/* Attributes */}
        <div style={{ border: "1px solid var(--ln-panel-border)", borderRadius: 4, overflow: "hidden" }}>
          <button
            className="w-full flex items-center justify-between px-3 py-2 transition-opacity hover:opacity-80"
            style={{ background: "var(--ln-panel)" }}
            onClick={() => toggle("attributes")}
          >
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)", letterSpacing: "0.08em" }}>ATTRIBUTES</span>
            {expandedSection === "attributes" ? <ChevronUp className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} />}
          </button>
          {expandedSection === "attributes" && (
            <div className="p-3 space-y-3">
              {/* Tone */}
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "var(--ln-smoke)", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>TONE</label>
                <input
                  value={sheet.attributes.tone}
                  onChange={e => updateAttr("tone", e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-xs focus:outline-none"
                  style={{ background: "#0a0a0a", border: "1px solid var(--ln-panel-border)", color: "var(--ln-parchment)", fontSize: "0.72rem" }}
                  placeholder="e.g. Quiet authority, poetic, reflective"
                />
              </div>
              {/* Voice */}
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "var(--ln-smoke)", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>VOICE</label>
                <input
                  value={sheet.attributes.voice}
                  onChange={e => updateAttr("voice", e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-xs focus:outline-none"
                  style={{ background: "#0a0a0a", border: "1px solid var(--ln-panel-border)", color: "var(--ln-parchment)", fontSize: "0.72rem" }}
                  placeholder="e.g. First-person witness, speaks as a trusted companion"
                />
              </div>
              {/* Frameworks */}
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "var(--ln-smoke)", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>FRAMEWORKS</label>
                <div className="space-y-1 mb-2">
                  {sheet.attributes.frameworks.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span style={{ flex: 1, fontSize: "0.68rem", color: "var(--ln-parchment)" }}>{f}</span>
                      <button onClick={() => removeFramework(i)} className="opacity-50 hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newFramework}
                    onChange={e => setNewFramework(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFramework(); } }}
                    className="flex-1 rounded px-2 py-1 text-xs focus:outline-none"
                    style={{ background: "#0a0a0a", border: "1px solid var(--ln-panel-border)", color: "var(--ln-parchment)", fontSize: "0.68rem" }}
                    placeholder="Add framework..."
                  />
                  <button onClick={addFramework} className="px-2 rounded hover:opacity-80 transition-opacity" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
                    <Plus className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                  </button>
                </div>
              </div>
              {/* Restrictions */}
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "var(--ln-smoke)", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>RESTRICTIONS</label>
                <div className="space-y-1 mb-2">
                  {sheet.attributes.restrictions.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span style={{ flex: 1, fontSize: "0.68rem", color: "var(--ln-parchment)" }}>{r}</span>
                      <button onClick={() => removeRestriction(i)} className="opacity-50 hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newRestriction}
                    onChange={e => setNewRestriction(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRestriction(); } }}
                    className="flex-1 rounded px-2 py-1 text-xs focus:outline-none"
                    style={{ background: "#0a0a0a", border: "1px solid var(--ln-panel-border)", color: "var(--ln-parchment)", fontSize: "0.68rem" }}
                    placeholder="Add restriction..."
                  />
                  <button onClick={addRestriction} className="px-2 rounded hover:opacity-80 transition-opacity" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
                    <Plus className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                  </button>
                </div>
              </div>
              {/* Custom Notes */}
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "var(--ln-smoke)", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>CUSTOM NOTES</label>
                <textarea
                  value={sheet.attributes.customNotes}
                  onChange={e => updateAttr("customNotes", e.target.value)}
                  rows={3}
                  className="w-full rounded px-2 py-1.5 text-xs resize-none focus:outline-none"
                  style={{ background: "#0a0a0a", border: "1px solid var(--ln-panel-border)", color: "var(--ln-parchment)", fontSize: "0.72rem", lineHeight: 1.6 }}
                  placeholder="Any additional context for this Keeper persona..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Medium Context */}
        <div style={{ border: "1px solid var(--ln-panel-border)", borderRadius: 4, overflow: "hidden" }}>
          <button
            className="w-full flex items-center justify-between px-3 py-2 transition-opacity hover:opacity-80"
            style={{ background: "var(--ln-panel)" }}
            onClick={() => toggle("medium")}
          >
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)", letterSpacing: "0.08em" }}>MEDIUM CONTEXT</span>
            {expandedSection === "medium" ? <ChevronUp className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--ln-smoke)" }} />}
          </button>
          {expandedSection === "medium" && (
            <div className="p-3">
              {/* Medium tabs */}
              <div className="flex flex-wrap gap-1 mb-3">
                {(Object.keys(MEDIUM_LABELS) as (keyof MediumContext)[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setActiveMedium(m)}
                    className="px-2 py-1 rounded text-xs transition-all"
                    style={{
                      background: activeMedium === m ? "rgba(201,168,76,0.15)" : "transparent",
                      border: `1px solid ${activeMedium === m ? "rgba(201,168,76,0.5)" : "var(--ln-panel-border)"}`,
                      color: activeMedium === m ? "var(--ln-gold)" : "var(--ln-smoke)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.58rem",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {MEDIUM_LABELS[m].toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                value={sheet.mediumContext[activeMedium]}
                onChange={e => updateMedium(activeMedium, e.target.value)}
                rows={5}
                className="w-full rounded p-2 text-xs resize-none focus:outline-none"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid var(--ln-panel-border)",
                  color: "var(--ln-parchment)",
                  fontFamily: "inherit",
                  fontSize: "0.72rem",
                  lineHeight: 1.6,
                }}
                placeholder={`How the Keeper behaves when working in ${MEDIUM_LABELS[activeMedium]} context...`}
              />
            </div>
          )}
        </div>

        {/* Save button (bottom) */}
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full py-2.5 rounded text-xs transition-all hover:opacity-80"
            style={{
              background: "rgba(201,168,76,0.15)",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "var(--ln-gold)",
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
            }}
          >
            {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline mr-2" /> : <Save className="w-3 h-3 inline mr-2" />}
            SAVE CHARACTER SHEET
          </button>
        )}
      </div>
    </div>
  );
}
