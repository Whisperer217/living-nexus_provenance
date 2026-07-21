/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ReferenceCitePanel
   Shows citations made to a work by other creators.
   Allows logged-in users to cite/reference this work with context.
   Divine Noir aesthetic — Cinzel, gold palette.
═══════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link2, ChevronDown, ChevronUp, Quote, Plus, Loader2, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ReferenceCitePanelProps {
  songId: number;
  songTitle: string;
}

export function ReferenceCitePanel({ songId, songTitle }: ReferenceCitePanelProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [context, setContext] = useState("");

  const { data: references = [], isLoading, refetch } = trpc.reference.forSong.useQuery(
    { songId },
    { enabled: expanded, staleTime: 60_000 }
  );

  const createRef = trpc.reference.create.useMutation({
    onSuccess: () => {
      toast.success("Citation recorded");
      setContext("");
      setShowForm(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCite = () => {
    if (!user) {
      toast.error("Sign in to cite this work");
      return;
    }
    createRef.mutate({ toSongId: songId, context: context.trim() || undefined });
  };

  const refCount = (references as any[]).length;

  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.25)" }}
    >
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            References &amp; Citations
          </span>
          {refCount > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{
                background: "rgba(196,154,40,0.10)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.25)",
              }}
            >
              {refCount}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: "var(--ln-smoke)" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "var(--ln-smoke)" }} />}
      </button>

      {/* Body — only when expanded */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Description */}
          <p className="text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
            A citation records that another creator's work was influenced by, derived from, or
            references <span style={{ color: "var(--ln-parchment)" }}>"{songTitle}"</span>.
            Citations are permanently attached to the provenance record.
          </p>

          {/* Reference list */}
          {isLoading && (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--ln-gold)" }} />
              <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Loading citations…</span>
            </div>
          )}

          {!isLoading && (references as any[]).length === 0 && !showForm && (
            <p className="text-xs py-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              No citations yet. Be the first to acknowledge this work.
            </p>
          )}

          {!isLoading && (references as any[]).length > 0 && (
            <div className="space-y-3">
              {(references as any[]).map((ref: any) => (
                <div
                  key={ref.id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    background: "rgba(196,154,40,0.04)",
                    border: "1px solid rgba(196,154,40,0.10)",
                  }}
                >
                  {/* Avatar */}
                  {ref.fromUser?.profilePhotoUrl ? (
                    <img
                      src={ref.fromUser.profilePhotoUrl}
                      alt={ref.fromUser.name || "Creator"}
                      className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(196,154,40,0.12)", color: "var(--ln-gold)" }}
                    >
                      {(ref.fromUser?.name || ref.fromUser?.artistHandle || "?")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-xs font-semibold"
                        style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                      >
                        {ref.fromUser?.name || ref.fromUser?.artistHandle || "Unknown Creator"}
                      </span>
                      {ref.fromUser?.artistHandle && ref.fromUser.name && (
                        <span className="text-[10px] font-mono" style={{ color: "var(--ln-iron)" }}>
                          @{ref.fromUser.artistHandle}
                        </span>
                      )}
                      <span className="text-[10px] ml-auto" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {ref.createdAt
                          ? new Date(ref.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    {ref.context && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <Quote className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "rgba(196,154,40,0.4)" }} />
                        <p className="text-xs leading-relaxed italic" style={{ color: "var(--ln-smoke)" }}>
                          {ref.context}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cite button / form */}
          {user && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--ln-gold)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Cite this work
            </button>
          )}

          {user && showForm && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(196,154,40,0.18)" }}
            >
              <p className="text-xs font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Record your citation
              </p>
              <Textarea
                placeholder="Optional: describe how this work influenced yours, or what you derived from it…"
                value={context}
                onChange={e => setContext(e.target.value)}
                maxLength={500}
                rows={3}
                className="text-xs resize-none"
                style={{
                  background: "rgba(196,154,40,0.04)",
                  border: "1px solid rgba(196,154,40,0.18)",
                  color: "var(--ln-parchment)",
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {context.length}/500
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setContext(""); }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--ln-smoke)", background: "transparent" }}
                  >
                    Cancel
                  </button>
                  <Button
                    size="sm"
                    onClick={handleCite}
                    disabled={createRef.isPending}
                    className="text-xs"
                    style={{
                      background: "rgba(196,154,40,0.18)",
                      color: "var(--ln-gold)",
                      border: "1px solid rgba(196,154,40,0.35)",
                    }}
                  >
                    {createRef.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Record Citation"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!user && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Sign in to cite this work.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
