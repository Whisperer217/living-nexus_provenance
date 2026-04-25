import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, Copy, ExternalLink, Sparkles, Music, FileText, Layers, Image, Newspaper, Lock, User } from "lucide-react";
import { toast } from "sonner";

const PROMPT_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  style_prompt: { label: "Style Prompt — AI Music", icon: <Music className="w-4 h-4" />, color: "rgba(167,139,250,0.8)" },
  lyric_brief: { label: "Lyric Writing Brief", icon: <FileText className="w-4 h-4" />, color: "rgba(96,165,250,0.8)" },
  composer_blueprint: { label: "Composer's Workflow Blueprint", icon: <Layers className="w-4 h-4" />, color: "rgba(52,211,153,0.8)" },
  visual_direction: { label: "Visual / Cover Art Direction", icon: <Image className="w-4 h-4" />, color: "rgba(251,191,36,0.8)" },
  press_bio: { label: "Press Bio Draft", icon: <Newspaper className="w-4 h-4" />, color: "rgba(251,113,133,0.8)" },
};

export default function SharedPromptPage() {
  const { token } = useParams<{ token: string }>();

  const { data: draft, isLoading, error } = trpc.promptStudio.getSharedPrompt.useQuery(
    { shareToken: token ?? "" },
    { enabled: !!token, staleTime: 60_000 }
  );

  // Build the provenance watermark footer that is always appended to any copy action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildProvenanceFooter = (d: any) => {
    const lines = [
      ``,
      `─────────────────────────────────────────`,
      `PROVENANCE RECORD — Living Nexus`,
      `Creator: ${d.creatorName ?? "Unknown Creator"}${d.creatorHandle ? ` (@${d.creatorHandle})` : ""}`,
      d.expressionId ? `Expression ID: ${d.expressionId}` : null,
      `Prompt Type: ${PROMPT_TYPE_LABELS[d.promptType]?.label ?? d.promptType}`,
      `Generated: ${new Date(d.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `Source: livingnexus.org`,
      `─────────────────────────────────────────`,
      `This prompt was generated from the creator's registered works and expression identity.`,
      `Reuse without attribution violates the creator's provenance rights.`,
    ].filter(Boolean).join("\n");
    return lines;
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const copyWithProvenance = (text: string, label: string) => {
    if (!draft) return;
    const withWatermark = text + buildProvenanceFooter(draft);
    navigator.clipboard.writeText(withWatermark);
    toast.success(`${label} copied with provenance record`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a12" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(139,92,246,0.6)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#0a0a12" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <Lock className="w-7 h-7" style={{ color: "rgba(139,92,246,0.5)" }} />
        </div>
        <h1 className="text-xl font-heading" style={{ color: "rgba(229,231,235,0.7)" }}>Prompt Not Available</h1>
        <p className="text-sm text-center max-w-xs" style={{ color: "rgba(156,163,175,0.5)" }}>
          This prompt is private or the share link has been revoked by the creator. Provenance prompts are profile-locked and shared only by explicit creator action.
        </p>
        <Link href="/">
          <a className="mt-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "rgba(139,92,246,0.15)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(139,92,246,0.25)" }}>
            Return to Living Nexus
          </a>
        </Link>
      </div>
    );
  }

  const typeInfo = PROMPT_TYPE_LABELS[draft.promptType] ?? { label: draft.promptType, icon: <Sparkles className="w-4 h-4" />, color: "rgba(167,139,250,0.8)" };
  const styleTags = draft.styleTags ? draft.styleTags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
  const inputBlocks: Array<{ label: string; content: string }> = Array.isArray(draft.userInputBlocks) ? draft.userInputBlocks : [];
  const creatorName = (draft as any).creatorName ?? "Unknown Creator";
  const creatorHandle = (draft as any).creatorHandle;
  const creatorId = (draft as any).creatorId;

  return (
    <div className="min-h-screen px-4 py-10 flex flex-col items-center" style={{ background: "#0a0a12" }}>
      {/* Header */}
      <div className="w-full max-w-xl mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5" style={{ color: "rgba(139,92,246,0.7)" }} />
          <span className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "rgba(139,92,246,0.5)" }}>Living Nexus</span>
        </div>
        <h1 className="text-2xl font-heading mb-1" style={{ color: "rgba(229,231,235,0.9)" }}>Provenance Prompt</h1>
        <p className="text-sm" style={{ color: "rgba(156,163,175,0.5)" }}>A creator-grounded prompt generated from registered works and expression identity</p>
      </div>

      {/* ── Creator Identity Badge (watermark) ─────────────────────────── */}
      <div className="w-full max-w-xl mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <User className="w-4 h-4" style={{ color: "rgba(167,139,250,0.8)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-heading tracking-widest uppercase mb-0.5" style={{ color: "rgba(139,92,246,0.5)" }}>Shared by Creator</p>
          <div className="flex items-center gap-2 flex-wrap">
            {creatorId ? (
              <Link href={`/creator/${creatorId}`}>
                <a className="text-sm font-semibold hover:underline" style={{ color: "rgba(167,139,250,0.9)" }}>
                  {creatorName}
                </a>
              </Link>
            ) : (
              <span className="text-sm font-semibold" style={{ color: "rgba(167,139,250,0.9)" }}>{creatorName}</span>
            )}
            {creatorHandle && (
              <span className="text-[10px]" style={{ color: "rgba(156,163,175,0.45)" }}>@{creatorHandle}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
          <Shield className="w-3 h-3" style={{ color: "rgba(52,211,153,0.6)" }} />
          <span className="text-[9px] font-mono" style={{ color: "rgba(52,211,153,0.6)" }}>SHARED</span>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.2)" }}>
        {/* Prompt type badge */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ color: typeInfo.color }}>{typeInfo.icon}</span>
          <span className="text-sm font-medium" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
          {draft.targetPlatform && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(156,163,175,0.5)" }}>
              {draft.targetPlatform}
            </span>
          )}
        </div>

        {/* Draft name */}
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-lg font-heading" style={{ color: "rgba(229,231,235,0.85)" }}>{draft.name}</h2>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(156,163,175,0.35)" }}>
            {new Date(draft.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* EID */}
        {draft.expressionId && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(139,92,246,0.5)" }} />
            <span className="text-[10px] font-mono" style={{ color: "rgba(167,139,250,0.6)" }}>EXPRESSION ID</span>
            <span className="font-mono text-xs font-bold ml-1" style={{ color: "#a78bfa" }}>{draft.expressionId}</span>
          </div>
        )}

        {/* Main prompt */}
        <div className="mx-5 mb-4 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-heading tracking-widest uppercase" style={{ color: "rgba(156,163,175,0.4)" }}>Expression Prompt</span>
            <button
              onClick={() => copyWithProvenance(draft.prompt, "Prompt")}
              className="flex items-center gap-1 text-[9px] px-2 py-1 rounded"
              style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.7)" }}
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(229,231,235,0.85)" }}>{draft.prompt}</p>
        </div>

        {/* Style tags */}
        {styleTags.length > 0 && (
          <div className="mx-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-heading tracking-widest uppercase" style={{ color: "rgba(156,163,175,0.4)" }}>Style Tags</span>
              <button
                onClick={() => copyWithProvenance(styleTags.join(", "), "Style tags")}
                className="flex items-center gap-1 text-[9px] px-2 py-1 rounded"
                style={{ background: "rgba(96,165,250,0.08)", color: "rgba(96,165,250,0.6)" }}
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {styleTags.map((tag: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.08)", color: "rgba(96,165,250,0.7)", border: "1px solid rgba(96,165,250,0.15)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Composer note */}
        {draft.composerNote && (
          <div className="mx-5 mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.1)" }}>
            <span className="text-[9px] font-heading tracking-widest uppercase block mb-1" style={{ color: "rgba(52,211,153,0.4)" }}>Composer's Note</span>
            <p className="text-xs italic" style={{ color: "rgba(229,231,235,0.6)" }}>{draft.composerNote}</p>
          </div>
        )}

        {/* Creator input blocks */}
        {inputBlocks.length > 0 && (
          <div className="mx-5 mb-4">
            <span className="text-[9px] font-heading tracking-widest uppercase block mb-2" style={{ color: "rgba(156,163,175,0.35)" }}>Creator Inspiration Blocks</span>
            <div className="space-y-2">
              {inputBlocks.map((block: { label: string; content: string }, i: number) => (
                <div key={i} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {block.label && <p className="text-[9px] font-medium mb-0.5" style={{ color: "rgba(156,163,175,0.5)" }}>{block.label}</p>}
                  <p className="text-[11px]" style={{ color: "rgba(229,231,235,0.6)" }}>{block.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Copy all button — always appends provenance watermark */}
        <div className="px-5 pb-5">
          <button
            onClick={() => {
              const full = [
                draft.prompt,
                styleTags.length > 0 ? `\nStyle Tags: ${styleTags.join(", ")}` : "",
                draft.composerNote ? `\nComposer's Note: ${draft.composerNote}` : "",
                draft.expressionId ? `\nExpression ID: ${draft.expressionId}` : "",
              ].filter(Boolean).join("\n");
              copyWithProvenance(full, "Full output");
            }}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: "rgba(139,92,246,0.15)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <Copy className="w-4 h-4" /> Copy Full Output
          </button>
          <p className="text-[9px] text-center mt-2" style={{ color: "rgba(156,163,175,0.3)" }}>
            Provenance record is automatically appended to all copied text
          </p>
        </div>
      </div>

      {/* Provenance notice */}
      <div className="w-full max-w-xl mt-4 rounded-xl px-4 py-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(139,92,246,0.4)" }} />
          <p className="text-[10px] leading-relaxed" style={{ color: "rgba(156,163,175,0.4)" }}>
            This prompt was generated from <strong style={{ color: "rgba(167,139,250,0.6)" }}>{creatorName}</strong>'s registered works and expression identity on Living Nexus. It is profile-locked — the generator can only be used by the creator themselves. Copying this prompt without attribution violates the creator's provenance rights.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(156,163,175,0.35)" }}>
          Register your own creative works and generate your Expression Identity on Living Nexus.
        </p>
        <Link href="/">
          <a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "rgba(139,92,246,0.12)", color: "rgba(167,139,250,0.8)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <ExternalLink className="w-3.5 h-3.5" /> Explore Living Nexus
          </a>
        </Link>
      </div>
    </div>
  );
}
