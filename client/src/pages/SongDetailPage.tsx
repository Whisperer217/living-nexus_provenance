import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Play, Pause, Heart, Share2, Copy, Twitter, DollarSign, MessageSquare, Shield, Music, ChevronLeft } from "lucide-react";

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const songId = parseInt(id || "0");

  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(() => typeof Audio !== "undefined" ? new Audio() : null);
  const [liked, setLiked] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("5");
  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState(user?.name || "");

  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: !!songId, refetchOnWindowFocus: false }
  );
  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId },
    { enabled: !!songId }
  );

  const playMutation = trpc.songs.play.useMutation();
  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) { window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); } },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { toast.success("Comment added!"); setCommentText(""); refetchComments(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handlePlay = () => {
    if (!songData?.song.fileUrl) { toast.error("No audio available"); return; }
    if (isPlaying) {
      audio?.pause();
      setIsPlaying(false);
    } else {
      if (audio) {
        audio.src = songData.song.fileUrl;
        audio.play().catch(() => toast.error("Could not play audio"));
        audio.onended = () => setIsPlaying(false);
        setIsPlaying(true);
        playMutation.mutate({ songId });
      }
    }
  };

  const handleTip = () => {
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum tip is $1.00"); return; }
    tipMutation.mutate({ songId, amountCents: cents, origin: window.location.origin });
    setTipOpen(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Song link copied to clipboard!");
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Check out "${songData?.song.title}" on Living Nexus`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate({ songId, content: commentText, authorName: authorName || undefined });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "oklch(0.75 0.18 85)", borderTopColor: "transparent" }} />
    </div>
  );

  if (!songData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Song not found.</p>
        <Link href="/"><Button className="mt-4">Back to Discover</Button></Link>
      </div>
    </div>
  );

  const { song, creator } = songData;
  const tipsEnabled = creator?.stripeAccountId && creator?.stripeAccountStatus === "enabled";

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <Link href={creator ? `/creator/${creator.id}` : "/"}>
          <button className="flex items-center gap-1 text-sm mb-6 hover:underline" style={{ color: "oklch(0.55 0.04 280)" }}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        {/* Main Card */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
          {/* Cover Art */}
          <div className="relative h-48 md:h-64 flex items-center justify-center" style={{ background: song.coverArtUrl ? undefined : "linear-gradient(135deg, oklch(0.14 0.04 300), oklch(0.12 0.02 260))" }}>
            {song.coverArtUrl ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" /> : <Music className="w-16 h-16 opacity-20" style={{ color: "oklch(0.75 0.18 85)" }} />}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, oklch(0.11 0.015 280))" }} />
            {/* Play button overlay */}
            <button onClick={handlePlay} className="absolute w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105" style={{ background: "oklch(0.75 0.18 85)", boxShadow: "0 0 30px oklch(0.75 0.18 85 / 0.4)" }}>
              {isPlaying ? <Pause className="w-6 h-6 fill-current" style={{ color: "oklch(0.08 0.015 280)" }} /> : <Play className="w-6 h-6 fill-current" style={{ color: "oklch(0.08 0.015 280)" }} />}
            </button>
          </div>

          <div className="p-6">
            {/* Title & Creator */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>{song.title}</h1>
                {creator && (
                  <Link href={`/creator/${creator.id}`}>
                    <span className="text-sm hover:underline" style={{ color: "oklch(0.65 0.2 300)" }}>{creator.artistHandle || creator.name}</span>
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {song.genre && <Badge style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)" }}>{song.genre}</Badge>}
                {song.witnessId && <Badge style={{ background: "oklch(0.75 0.18 85 / 0.2)", color: "oklch(0.75 0.18 85)" }}><Shield className="w-3 h-3 mr-1" />WID</Badge>}
                {song.aiConsent === "prohibited" && <Badge style={{ background: "oklch(0.65 0.18 25 / 0.2)", color: "oklch(0.65 0.18 25)" }}>AI Prohibited</Badge>}
                {song.aiConsent === "permitted_attribution" && <Badge style={{ background: "oklch(0.65 0.18 85 / 0.2)", color: "oklch(0.65 0.18 85)" }}>AI w/ Attribution</Badge>}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-xs mb-5" style={{ color: "oklch(0.55 0.04 280)" }}>
              {song.bpm && <span>BPM: {song.bpm}</span>}
              {song.keySignature && <span>Key: {song.keySignature}</span>}
              {song.albumName && <span>Album: {song.albumName}</span>}
              {song.releaseDate && <span>Released: {song.releaseDate}</span>}
              {song.isrc && <span>ISRC: {song.isrc}</span>}
              <span>{song.playCount || 0} plays</span>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ background: liked ? "oklch(0.65 0.18 25 / 0.2)" : "oklch(0.16 0.02 280)", color: liked ? "oklch(0.65 0.18 25)" : "oklch(0.6 0.04 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
                <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} /> Like
              </button>
              <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5" style={{ background: "oklch(0.16 0.02 280)", color: "oklch(0.6 0.04 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </button>
              <button onClick={shareTwitter} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5" style={{ background: "oklch(0.16 0.02 280)", color: "oklch(0.6 0.04 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
                <Twitter className="w-3.5 h-3.5" /> Share
              </button>
              {tipsEnabled && (
                <button onClick={() => setTipOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
                  <DollarSign className="w-3.5 h-3.5" /> Tip Artist
                </button>
              )}
            </div>

            {/* Unique URL */}
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
              <span className="text-xs flex-1 truncate font-mono" style={{ color: "oklch(0.5 0.03 280)" }}>{window.location.href}</span>
              <button onClick={copyLink} className="text-xs flex-shrink-0 hover:underline" style={{ color: "oklch(0.65 0.2 300)" }}>Copy</button>
            </div>

            {/* Witness ID */}
            {song.witnessId && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.75 0.18 85 / 0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.18 85)" }} />
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.18 85)", fontFamily: "'Orbitron', monospace" }}>WITNESS ID — PROVENANCE VERIFIED</span>
                </div>
                <p className="text-xs font-mono" style={{ color: "oklch(0.55 0.04 280)" }}>{song.witnessId}</p>
                {song.fileHash && <p className="text-xs font-mono mt-1 truncate" style={{ color: "oklch(0.45 0.03 280)" }}>SHA-256: {song.fileHash}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-4 h-4" style={{ color: "oklch(0.65 0.2 300)" }} />
            <h2 className="font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Comments ({comments?.length ?? 0})</h2>
          </div>

          {/* Add Comment */}
          <div className="mb-6 space-y-2">
            <Input
              placeholder="Your name (optional)"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)" }}
            />
            <Textarea
              placeholder="Leave a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={3}
              style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.9 0.01 280)", resize: "none" }}
            />
            <Button size="sm" onClick={handleComment} disabled={!commentText.trim() || commentMutation.isPending} style={{ background: "oklch(0.65 0.2 300)", color: "white" }}>
              {commentMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>

          {/* Comment List */}
          {!comments?.length ? (
            <p className="text-sm text-center py-6" style={{ color: "oklch(0.45 0.03 280)" }}>No comments yet. Be the first to leave one.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <div key={c.id} className="p-3 rounded-xl" style={{ background: "oklch(0.13 0.015 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.18 85)" }}>{c.authorName || "Anonymous"}</span>
                    <span className="text-xs" style={{ color: "oklch(0.45 0.03 280)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm" style={{ color: "oklch(0.75 0.04 280)" }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tip Modal */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              Tip {creator?.artistHandle || creator?.name || "the Artist"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "oklch(0.6 0.04 280)" }}>Support this creator directly. 90% goes to the artist, 10% supports the platform.</p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button key={amt} onClick={() => setTipAmount(amt)} className="py-2 rounded-lg text-sm font-medium transition-all" style={{ background: tipAmount === amt ? "oklch(0.75 0.18 85)" : "oklch(0.16 0.02 280)", color: tipAmount === amt ? "oklch(0.08 0.015 280)" : "oklch(0.7 0.04 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
                  ${amt}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Custom amount ($)"
              value={tipAmount}
              onChange={e => setTipAmount(e.target.value)}
              min="1"
              step="0.01"
              style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", color: "oklch(0.9 0.01 280)" }}
            />
            <Button className="w-full" onClick={handleTip} disabled={tipMutation.isPending} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Tip`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
