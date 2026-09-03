import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, PencilLine, Sparkles, X } from "lucide-react";
import type { CathedralSuggestionPatch, CathedralSuggestionResult } from "@shared/creativeCathedral";

type SuggestionField = keyof CathedralSuggestionPatch;

export function CathedralSuggestionCard({
  suggestion,
  status,
  busy,
  onApply,
  onEditFirst,
  onDismiss,
}: {
  suggestion: CathedralSuggestionResult;
  status: string;
  busy: boolean;
  onApply: (patch?: CathedralSuggestionPatch) => void;
  onEditFirst: () => void;
  onDismiss: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedPatch, setEditedPatch] = useState<CathedralSuggestionPatch>(suggestion.patch);
  const fields = useMemo(() => Object.entries(suggestion.patch) as Array<[SuggestionField, CathedralSuggestionPatch[SuggestionField]]>, [suggestion.patch]);
  const evidenceByField = useMemo(() => new Map<SuggestionField, CathedralSuggestionResult["evidence"][number]>(suggestion.evidence.map((item) => [item.field, item])), [suggestion.evidence]);
  const [selectedFields, setSelectedFields] = useState<SuggestionField[]>([]);
  const resolved = status !== "proposed";
  const selectedPatch = useMemo(() => Object.fromEntries(
    (Object.entries(editedPatch) as Array<[SuggestionField, CathedralSuggestionPatch[SuggestionField]]>)
      .filter(([field]) => selectedFields.includes(field)),
  ) as CathedralSuggestionPatch, [editedPatch, selectedFields]);

  const fieldLabel = (field: SuggestionField) => ({
    title: "Title",
    genre: "Genres",
    bpm: "BPM",
    keySignature: "Key",
    moodTags: "Moods",
    caption: "Caption",
    creationDate: "Creation Date",
    originalReleaseDate: "Original Release Date",
    participationMusic: "Music participation",
    participationLyrics: "Lyrics participation",
    participationVoice: "Voice participation",
  } as Record<string, string>)[field] ?? field;

  const renderEditor = (field: SuggestionField) => {
    const value = (editedPatch as any)[field];
    if (field.startsWith("participation")) {
      return (
        <select
          value={String(value ?? "")}
          onChange={(event) => setEditedPatch((previous) => ({ ...previous, [field]: event.target.value }))}
          className="h-10 rounded-sm border border-amber-700/40 bg-black/55 px-3 text-sm"
          style={{ color: "var(--ln-parchment)" }}
        >
          {(["Human", "AI", "Both"] as const).map((option) => <option key={option} value={option} style={{ color: "#000" }}>{option}</option>)}
        </select>
      );
    }
    return (
      <Input
        type={field === "creationDate" || field === "originalReleaseDate" ? "date" : "text"}
        value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
        onChange={(event) => {
          const raw = event.target.value;
          setEditedPatch((previous) => ({
            ...previous,
            [field]: field === "moodTags"
              ? raw.split(",").map((item) => item.trim()).filter(Boolean)
              : field === "bpm"
                ? (raw ? Number(raw) : null)
                : raw,
          }));
        }}
        className="h-10 bg-black/55 text-sm"
      />
    );
  };

  return (
    <article className="space-y-4 rounded-md p-4" style={{ border: "1px solid rgba(196,154,40,0.34)", background: "rgba(12,10,6,0.96)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} aria-hidden style={{ color: "var(--ln-gold)" }} />
          <div>
            <p className="text-base font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-parchment)" }}>Media-facts proposal</p>
            <p className="text-xs" style={{ color: "rgba(245,237,216,0.68)" }}>Private · non-binding</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs uppercase tracking-wider">{status.replaceAll("_", " ")}</Badge>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "rgba(245,237,216,0.86)" }}>{suggestion.summary}</p>

      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-sm italic" style={{ color: "rgba(245,237,216,0.68)" }}>No safe field proposals were found.</p>
        ) : fields.map(([field, value]) => (
          <div key={field} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2 rounded-sm border border-amber-800/15 p-2">
            <Checkbox
              checked={selectedFields.includes(field)}
              disabled={resolved}
              onCheckedChange={(checked) => setSelectedFields((previous) => checked === true
                ? (previous.includes(field) ? previous : [...previous, field])
                : previous.filter((item) => item !== field))}
              aria-label={`Select ${fieldLabel(field)} suggestion`}
            />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ln-gold)" }}>{fieldLabel(field)}</span>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {evidenceByField.get(field)?.confidence ?? "low"} confidence
                </Badge>
              </div>
              {editing ? renderEditor(field) : (
                <span className="block min-w-0 break-words text-base" style={{ color: "var(--ln-parchment)" }}>
                  {Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                </span>
              )}
              {evidenceByField.get(field)?.note && (
                <p className="text-sm leading-relaxed" style={{ color: "rgba(245,237,216,0.72)" }}>{evidenceByField.get(field)?.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {suggestion.evidence.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer" style={{ color: "var(--ln-gold)" }}>Why these fields?</summary>
          <div className="mt-2 space-y-2 leading-relaxed" style={{ color: "rgba(245,237,216,0.76)" }}>
            {suggestion.evidence.map((item, index) => <p key={`${item.field}-${index}`}><strong>{fieldLabel(item.field)} · {item.confidence}:</strong> {item.note}</p>)}
          </div>
        </details>
      )}

      {!resolved && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={busy || selectedFields.length === 0} onClick={() => onApply(selectedPatch)} className="gap-1" style={{ background: "var(--ln-gold)", color: "#000" }}>
            <Check size={13} /> Apply selected
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { setEditing(true); onEditFirst(); }} className="gap-1">
            <PencilLine size={13} /> Edit first
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss} className="gap-1">
            <X size={13} /> Dismiss
          </Button>
        </div>
      )}
    </article>
  );
}
