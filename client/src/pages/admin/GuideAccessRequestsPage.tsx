/**
 * @page   Admin / Guide Access Requests
 * @desc   Manage pending, approved, and denied access requests for guides.
 *         Guide owners see only their own guides' requests; admins see all.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Shield, Clock, CheckCircle2, XCircle,
  Filter, RefreshCw, User, BookOpen
} from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "denied";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  denied: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle2 className="w-3 h-3" />,
  denied: <XCircle className="w-3 h-3" />,
};

export default function GuideAccessRequestsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: requests, isLoading, refetch } = trpc.guides.listAccessRequests.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const reviewMutation = trpc.guides.reviewAccessRequest.useMutation({
    onSuccess: (result) => {
      toast.success(`Request ${result.decision === 'approved' ? 'approved' : 'denied'} successfully.`);
      setReviewingId(null);
      setReviewNote("");
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Review failed."),
  });

  const handleReview = (requestId: number, decision: "approved" | "denied") => {
    reviewMutation.mutate({ requestId, decision, reviewNote: reviewNote || undefined });
  };

  if (!user || (user.role !== "admin" && user.role !== "founder")) {
    return (
      <div className="min-h-screen bg-[#080600] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-[#2a2010] mx-auto mb-4" />
          <p className="text-[#6b5f3e]">Access restricted to guide owners and admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080600] text-[#e8d5a3]">
      {/* Header */}
      <div className="border-b border-[#1e1a0e] bg-[#0a0800]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-[#6b5f3e] hover:text-[#C9A84C] text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                  Guide Access Requests
                </h1>
              </div>
              <p className="text-[#6b5f3e] text-sm">
                Review and manage access requests for your published guides.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#2a2010] text-[#a89060] hover:bg-[#1a1508] gap-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 mt-6">
            {(["pending", "approved", "denied", "all"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-colors ${
                  statusFilter === s
                    ? "bg-[#C9A84C] text-black"
                    : "bg-[#1a1508] border border-[#2a2010] text-[#6b5f3e] hover:border-[#C9A84C]/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Request list */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {isLoading && (
          <div className="text-center py-16 text-[#6b5f3e]">Loading requests…</div>
        )}

        {!isLoading && (!requests || requests.length === 0) && (
          <div className="text-center py-16">
            <Filter className="w-10 h-10 text-[#2a2010] mx-auto mb-3" />
            <p className="text-[#6b5f3e]">No {statusFilter === "all" ? "" : statusFilter} requests found.</p>
          </div>
        )}

        {requests?.map((req: {
          id: number;
          guideId: number;
          userId: number;
          status: string;
          requestNote: string | null;
          reviewNote: string | null;
          reviewedAt: Date | null;
          createdAt: Date;
          guideName: string | null;
          requesterName: string | null;
          requesterHandle: string | null;
        }) => (
          <div
            key={req.id}
            className="bg-[#0a0800] border border-[#1e1a0e] rounded-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs border ${STATUS_COLORS[req.status]} flex items-center gap-1`}>
                    {STATUS_ICONS[req.status]}
                    {req.status.toUpperCase()}
                  </Badge>
                  <span className="text-[#C9A84C] text-xs font-bold tracking-wider">
                    {req.guideName ?? `Guide #${req.guideId}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#a89060]">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>{req.requesterHandle ? `@${req.requesterHandle}` : req.requesterName ?? `User #${req.userId}`}</span>
                  <span className="text-[#3a3020]">·</span>
                  <span className="text-[#6b5f3e] text-xs">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {req.requestNote && (
                  <p className="text-sm text-[#e8d5a3]/70 bg-[#111008] border border-[#2a2010] rounded-lg px-3 py-2 mt-2">
                    "{req.requestNote}"
                  </p>
                )}
                {req.reviewNote && (
                  <p className="text-xs text-[#6b5f3e] mt-1">
                    Review note: {req.reviewNote}
                  </p>
                )}
              </div>

              {/* Action buttons for pending requests */}
              {req.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-600 text-white gap-1.5 text-xs"
                    onClick={() => {
                      setReviewingId(req.id);
                    }}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-900/50 text-red-400 hover:bg-red-950/30 gap-1.5 text-xs"
                    onClick={() => handleReview(req.id, "denied")}
                    disabled={reviewMutation.isPending}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Deny
                  </Button>
                </div>
              )}
            </div>

            {/* Approve with optional note */}
            {reviewingId === req.id && (
              <div className="bg-[#0d0b06] border border-[#2a2010] rounded-lg p-4 space-y-3">
                <div className="text-[#C9A84C] text-xs font-bold tracking-wider">APPROVE WITH NOTE (OPTIONAL)</div>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Add a note for the requester (optional)…"
                  rows={2}
                  maxLength={500}
                  className="w-full bg-[#111008] border border-[#2a2010] rounded-lg px-3 py-2 text-sm text-[#e8d5a3] placeholder:text-[#4a4030] resize-none focus:outline-none focus:border-[#C9A84C]/60"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-600 text-white"
                    onClick={() => handleReview(req.id, "approved")}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending ? "Approving…" : "Confirm Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#2a2010] text-[#6b5f3e]"
                    onClick={() => { setReviewingId(null); setReviewNote(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
