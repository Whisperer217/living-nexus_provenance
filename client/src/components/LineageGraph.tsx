import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GitBranch, Plus, ChevronDown, ChevronUp, Loader2, ArrowRight, ArrowLeft, Link2
} from "lucide-react";
import { Link } from "wouter";

const RELATIONSHIP_LABELS: Record<string, { label: string; color: string }> = {
  version:     { label: "Version",     color: "text-blue-400 bg-blue-900/20 border-blue-800/40" },
  remix:       { label: "Remix",       color: "text-purple-400 bg-purple-900/20 border-purple-800/40" },
  remaster:    { label: "Remaster",    color: "text-cyan-400 bg-cyan-900/20 border-cyan-800/40" },
  sample:      { label: "Sample",      color: "text-orange-400 bg-orange-900/20 border-orange-800/40" },
  derivative:  { label: "Derivative",  color: "text-pink-400 bg-pink-900/20 border-pink-800/40" },
  translation: { label: "Translation", color: "text-green-400 bg-green-900/20 border-green-800/40" },
};

// ─── Add Lineage Dialog ───────────────────────────────────────────────────────
interface AddLineageDialogProps {
  songId: number;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

function AddLineageDialog({ songId, open, onClose, onAdded }: AddLineageDialogProps) {
  const [direction, setDirection] = useState<"parent" | "child">("parent");
  const [otherSongId, setOtherSongId] = useState("");
  const [relationshipType, setRelationshipType] = useState("version");
  const [versionLabel, setVersionLabel] = useState("");
  const [notes, setNotes] = useState("");

  const addLineage = trpc.provenance.addLineage.useMutation({
    onSuccess: () => { onAdded(); onClose(); setOtherSongId(""); setVersionLabel(""); setNotes(""); },
  });

  const handleSubmit = () => {
    const otherId = parseInt(otherSongId, 10);
    if (isNaN(otherId)) return;
    addLineage.mutate({
      parentSongId: direction === "parent" ? otherId : songId,
      childSongId:  direction === "parent" ? songId  : otherId,
      relationshipType: relationshipType as any,
      versionLabel: versionLabel || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d1117] border border-amber-900/30 text-stone-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-amber-400 tracking-widest uppercase text-sm">
            Link Lineage Relationship
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">This work is a…</Label>
            <Select value={direction} onValueChange={v => setDirection(v as any)}>
              <SelectTrigger className="bg-[#1a1f2e] border-amber-900/30 text-stone-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-amber-900/30">
                <SelectItem value="child" className="text-stone-200 focus:bg-amber-900/20">Child of another work (derived from)</SelectItem>
                <SelectItem value="parent" className="text-stone-200 focus:bg-amber-900/20">Parent of another work (source of)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">
              {direction === "child" ? "Parent Work ID" : "Child Work ID"}
            </Label>
            <Input
              value={otherSongId}
              onChange={e => setOtherSongId(e.target.value)}
              placeholder="Enter the work's numeric ID"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Relationship Type</Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger className="bg-[#1a1f2e] border-amber-900/30 text-stone-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-amber-900/30">
                {Object.entries(RELATIONSHIP_LABELS).map(([v, { label }]) => (
                  <SelectItem key={v} value={v} className="text-stone-200 focus:bg-amber-900/20">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Version Label (optional)</Label>
            <Input
              value={versionLabel}
              onChange={e => setVersionLabel(e.target.value)}
              placeholder="e.g. v2.0, Deluxe Edition, Radio Edit"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the relationship…"
              rows={2}
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-400 hover:text-stone-200">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={addLineage.isPending || !otherSongId}
            className="bg-amber-600 hover:bg-amber-500 text-black font-mono uppercase tracking-widest text-xs"
          >
            {addLineage.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            Link Works
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Work Node ────────────────────────────────────────────────────────────────
function WorkNode({ id, title, artistHandle, relationshipType, versionLabel, direction }: {
  id: number;
  title: string;
  artistHandle?: string | null;
  relationshipType: string;
  versionLabel?: string | null;
  direction: "parent" | "child";
}) {
  const rel = RELATIONSHIP_LABELS[relationshipType] ?? RELATIONSHIP_LABELS.version;
  return (
    <div className="flex items-center gap-3">
      {direction === "child" && (
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-amber-900/30" />
          <ArrowRight size={12} className="text-amber-700 rotate-90" />
        </div>
      )}
      <Link href={`/song/${id}`} className="flex-1 group">
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-900/20 bg-[#0d1117] hover:border-amber-700/40 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="text-stone-200 text-xs font-medium truncate group-hover:text-amber-300 transition-colors">
              {title}
            </div>
            {artistHandle && (
              <div className="text-stone-600 text-[10px] font-mono truncate">@{artistHandle}</div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {versionLabel && (
              <span className="text-[10px] font-mono text-stone-500 bg-stone-800/50 px-1.5 py-0.5 rounded">
                {versionLabel}
              </span>
            )}
            <Badge className={`text-[10px] font-mono border px-1.5 py-0 ${rel.color}`}>
              {rel.label}
            </Badge>
          </div>
        </div>
      </Link>
      {direction === "parent" && (
        <div className="flex flex-col items-center">
          <ArrowLeft size={12} className="text-amber-700 rotate-90" />
          <div className="w-px h-4 bg-amber-900/30" />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface LineageGraphProps {
  songId: number;
  ownerId: number;
  songTitle: string;
  className?: string;
}

export function LineageGraph({ songId, ownerId, songTitle, className = "" }: LineageGraphProps) {
  const { user } = useAuth();
  const isOwner = user?.id === ownerId;
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const { data: lineage, refetch, isLoading } = trpc.provenance.getLineage.useQuery({ songId });

  type ParentRow = NonNullable<typeof lineage>['parents'][number];
  type ChildRow = NonNullable<typeof lineage>['children'][number];
  const parents = lineage?.parents ?? [] as ParentRow[];
  const children = lineage?.children ?? [] as ChildRow[];
  const hasAny = parents.length > 0 || children.length > 0;

  return (
    <div className={`rounded-xl border border-amber-900/20 bg-[#0d1117] overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <GitBranch size={15} className="text-amber-500" />
          <span className="font-mono text-amber-400 text-xs uppercase tracking-widest">Lineage Graph</span>
          {hasAny && (
            <Badge className="bg-amber-900/30 text-amber-400 border-0 text-[10px] font-mono">
              {parents.length + children.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && expanded && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-amber-500 hover:text-amber-300 hover:bg-amber-900/20"
              onClick={e => { e.stopPropagation(); setAddOpen(true); }}
            >
              <Link2 size={13} className="mr-1" /> Link Work
            </Button>
          )}
          {expanded ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
        </div>
      </div>

      {/* Graph body */}
      {expanded && (
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-4">
              <Loader2 size={13} className="animate-spin" /> Loading lineage…
            </div>
          ) : !hasAny ? (
            <div className="text-stone-600 text-xs font-mono py-4 text-center">
              No lineage relationships recorded.
              {isOwner && <span className="block mt-1 text-amber-700">Link this work to a parent or child to build the lineage graph.</span>}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Parents */}
              {parents.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-stone-600 uppercase tracking-widest mb-2">
                    Derived From
                  </div>
                  <div className="space-y-2">
                    {parents.map((p: ParentRow) => (
                      <WorkNode
                        key={p.id}
                        id={p.parentSongId}
                        title={p.parentTitle ?? `Work #${p.parentSongId}`}
                        artistHandle={p.parentArtistHandle}
                        relationshipType={p.relationshipType}
                        versionLabel={p.versionLabel}
                        direction="parent"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Current work node */}
              {hasAny && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-900/10">
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="text-amber-300 text-xs font-mono font-semibold truncate">{songTitle}</span>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-mono ml-auto flex-shrink-0">
                    This Work
                  </Badge>
                </div>
              )}

              {/* Children */}
              {children.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-stone-600 uppercase tracking-widest mb-2">
                    Derived Works
                  </div>
                  <div className="space-y-2">
                    {children.map((c: ChildRow) => (
                      <WorkNode
                        key={c.id}
                        id={c.childSongId}
                        title={c.childTitle ?? `Work #${c.childSongId}`}
                        artistHandle={c.childArtistHandle}
                        relationshipType={c.relationshipType}
                        versionLabel={c.versionLabel}
                        direction="child"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AddLineageDialog
        songId={songId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => refetch()}
      />
    </div>
  );
}
