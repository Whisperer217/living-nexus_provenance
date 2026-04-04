import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Shield, Copy, ExternalLink, Sparkles, Music, FileText, Layers, Image, Newspaper } from "lucide-react";
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

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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
        <Shield className="w-12 h-12" style={{ color: "rgba(139,92,246,0.3)" }} />
        <h1 className="text-xl font-heading" style={{ color: "rgba(229,231,235,0.7)" }}>Prompt Not Found</h1>
        <p className="text-sm text-center max-w-xs" style={{ color: "rgba(156,163,175,0.5)" }}>
          This shared prompt link may have expired or been removed by the creator.
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
              onClick={() => copyText(draft.prompt, "Prompt")}
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
                onClick={() => copyText(styleTags.join(", "), "Style tags")}
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

        {/* Copy all button */}
        <div className="px-5 pb-5">
          <button
            onClick={() => {
              const full = [
                draft.prompt,
                styleTags.length > 0 ? `\nStyle Tags: ${styleTags.join(", ")}` : "",
                draft.composerNote ? `\nComposer's Note: ${draft.composerNote}` : "",
                draft.expressionId ? `\nExpression ID: ${draft.expressionId}` : "",
              ].filter(Boolean).join("\n");
              copyText(full, "Full output");
            }}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: "rgba(139,92,246,0.15)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <Copy className="w-4 h-4" /> Copy Full Output
          </button>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center">
        <p className="text-xs mb-3" style={{ color: "rgba(156,163,175,0.35)" }}>
          This prompt was generated and registered on Living Nexus — the provenance layer for creative work.
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
