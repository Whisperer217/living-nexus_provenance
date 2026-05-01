import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { MessageCircle, Flag, Trash2, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate Speech",
  misinformation: "Misinformation",
  other: "Other",
};

const REASON_COLORS: Record<string, string> = {
  hate_speech: "bg-red-900/80 text-red-200 border-red-700",
  harassment: "bg-orange-900/60 text-orange-200 border-orange-700",
  misinformation: "bg-yellow-900/40 text-yellow-200 border-yellow-700",
  spam: "bg-zinc-800 text-zinc-300 border-zinc-700",
  other: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

export default function CommentModerationPage() {
  const { user } = useAuth();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: flagged = [], refetch, isLoading } = trpc.comments.getFlagged.useQuery();

  const moderateMutation = trpc.comments.moderate.useMutation({
    onSuccess: (_: unknown, vars: { reportId: number; action: "dismiss" | "delete" }) => {
      const label = vars.action === "delete" ? "Comment deleted" : "Report dismissed";
      toast.success(`${label} successfully.`);
      setProcessingId(null);
      refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setProcessingId(null);
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <p className="text-zinc-400">Admin access required.</p>
      </div>
    );
  }

  const handleAction = (reportId: number, action: "dismiss" | "delete") => {
    setProcessingId(reportId);
    moderateMutation.mutate({ reportId, action });
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <Flag size={18} style={{ color: "#D4AF37" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Comment Moderation</h1>
          <p className="text-sm text-zinc-400">{flagged.length} pending report{flagged.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="ml-auto">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="text-zinc-400 border-zinc-700">
              ← Admin
            </Button>
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && flagged.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <CheckCircle size={48} className="text-emerald-500 opacity-60" />
          <p className="text-zinc-400 text-lg">No pending reports</p>
          <p className="text-zinc-600 text-sm">All comments are clear.</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-yellow-500 animate-spin" />
        </div>
      )}

      {/* Report list */}
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {(flagged as Array<{
          reportId: number;
          commentId: number;
          reason: string;
          notes: string | null;
          status: string;
          reportedAt: Date;
          reporterId: number;
          commentContent: string;
          commentCreatedAt: Date;
          commentUserId: number | null;
          commentAuthorName: string | null;
          songId: number;
        }>).map((report) => (
          <div
            key={report.reportId}
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Top row: reason badge + song link */}
            <div className="flex items-center gap-3">
              <Badge
                className={`text-xs border ${REASON_COLORS[report.reason] ?? REASON_COLORS.other}`}
              >
                {REASON_LABELS[report.reason] ?? report.reason}
              </Badge>
              <Link href={`/song/${report.songId}`}>
                <span className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer">
                  Song #{report.songId} <ExternalLink size={10} />
                </span>
              </Link>
              <span className="ml-auto text-xs text-zinc-600">
                {new Date(report.reportedAt).toLocaleString()}
              </span>
            </div>

            {/* Comment content */}
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle size={12} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">
                  {report.commentAuthorName ?? `User #${report.commentUserId ?? "anon"}`}
                  {" · "}
                  {new Date(report.commentCreatedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">{report.commentContent}</p>
            </div>

            {/* Reporter notes */}
            {report.notes && (
              <p className="text-xs text-zinc-500 italic">Reporter note: "{report.notes}"</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-zinc-400 border-zinc-700 hover:border-zinc-500"
                disabled={processingId === report.reportId}
                onClick={() => handleAction(report.reportId, "dismiss")}
              >
                <CheckCircle size={13} className="mr-1.5" />
                Dismiss
              </Button>
              <Button
                size="sm"
                className="bg-red-900/60 hover:bg-red-900 text-red-200 border border-red-800"
                disabled={processingId === report.reportId}
                onClick={() => handleAction(report.reportId, "delete")}
              >
                <Trash2 size={13} className="mr-1.5" />
                Delete Comment
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
