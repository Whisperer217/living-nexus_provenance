/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TrackPage
   Divine Noir: Individual song page with unique URL, comments,
   tip jar, sharing, and full playback controls
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { usePlayer, DEMO_TRACKS, Comment } from "@/contexts/PlayerContext";
import {
  Play, Pause, Heart, Share2, Copy, Link2, MessageCircle,
  DollarSign, ArrowLeft, Twitter, Facebook, Send, Check,
  Music, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

const TIP_AMOUNTS = [1, 3, 5, 10, 25];

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const {
    state, allTracks, playTrack, togglePlay, toggleLike,
    addTrackTip, addComment, incrementShare,
  } = usePlayer();

  const tracks = allTracks();
  const trackIdx = tracks.findIndex(t => t.id === id);
  const track = tracks[trackIdx];

  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState(state.profileName || "Anonymous");
  const [tipSelected, setTipSelected] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPlaying = state.isPlaying && state.currentIdx === trackIdx;
  const isLiked = track ? state.liked.has(track.id) : false;
  const comments = track ? (state.trackComments[track.id] || []) : [];
  const tipTotal = track ? (state.trackTips[track.id] || 0) : 0;
  const trackUrl = `${window.location.origin}/track/${id}`;

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Music size={40} className="text-white/15" />
        <p className="text-white/30 font-body text-[14px]">Track not found</p>
        <button onClick={() => navigate("/")} className="text-[#A78BFA] text-[13px] hover:underline">
          ← Back to Home
        </button>
      </div>
    );
  }

  const handlePlay = () => {
    if (state.currentIdx === trackIdx) {
      togglePlay();
    } else {
      playTrack(trackIdx);
    }
  };

  const handleLike = () => {
    toggleLike(track.id);
    toast.success(isLiked ? "Removed from liked" : "Added to liked ♥");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(trackUrl).then(() => {
      setCopied(true);
      toast.success("Track link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`🎵 Listening to "${track.title}" by ${track.artist} on Living Nexus`);
    const url = encodeURIComponent(trackUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    incrementShare(track.id);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: track.title, text: `Listen to "${track.title}" by ${track.artist}`, url: trackUrl });
      incrementShare(track.id);
    } else {
      copyLink();
    }
  };

  const submitComment = () => {
    if (!commentText.trim()) { toast.error("Write something first"); return; }
    const comment: Comment = {
      id: nanoid(),
      author: authorName || "Anonymous",
      text: commentText.trim(),
      timestamp: Date.now(),
    };
    addComment(track.id, comment);
    setCommentText("");
    toast.success("Comment posted ✦");
  };

  const sendTip = () => {
    const amt = tipSelected ?? parseFloat(customTip);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    addTrackTip(track.id, amt);
    toast.success(`💛 $${amt} tip sent to ${track.artist}!`);
    setTipSelected(null);
    setCustomTip("");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fade-up">
      {/* ── Back button ── */}
      <button
        onClick={() => navigate(-1 as any)}
        className="flex items-center gap-1.5 text-[12px] font-body text-white/30 hover:text-white/60 mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* ── Track Hero ── */}
      <div className="rounded-2xl overflow-hidden border border-white/[0.08] mb-5">
        {/* Art */}
        <div className="relative h-[220px] flex items-center justify-center"
          style={{ background: track.bg || "linear-gradient(135deg, oklch(0.10 0.025 265), oklch(0.13 0.028 270))" }}>
          {track.artUrl ? (
            <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <span className="text-7xl select-none">{track.emoji || "🎵"}</span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Play button overlay */}
          <button
            onClick={handlePlay}
            className="absolute bottom-4 left-4 w-12 h-12 rounded-full flex items-center justify-center
              bg-[#E8C547] hover:bg-[#E8C547]/90 active:scale-95 transition-all shadow-lg shadow-[#E8C547]/20"
          >
            {isPlaying
              ? <Pause size={20} className="text-black" />
              : <Play size={20} className="text-black ml-0.5" />
            }
          </button>

          {/* Genre badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-heading tracking-wider
            bg-black/50 backdrop-blur-sm border border-white/10 text-white/60">
            {track.genre}
          </div>
        </div>

        {/* Track info */}
        <div className="p-4 bg-[oklch(0.12_0.012_280)]">
          <h1 className="font-heading text-[20px] text-white/95 mb-1">{track.title}</h1>
          <p className="text-[13px] font-body text-white/45 mb-3">{track.artist}</p>

          {track.desc && (
            <p className="text-[13px] font-body text-white/50 mb-4 leading-relaxed">{track.desc}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-[12px] text-white/30 font-body">
              <TrendingUp size={12} />
              <span>{(track.plays || 0).toLocaleString()} plays</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-white/30 font-body">
              <MessageCircle size={12} />
              <span>{comments.length} comments</span>
            </div>
            {tipTotal > 0 && (
              <div className="flex items-center gap-1.5 text-[12px] text-[#4ade80]/60 font-body">
                <DollarSign size={12} />
                <span>${tipTotal} tipped</span>
              </div>
            )}
            {track.dur && (
              <div className="text-[12px] text-white/25 font-body ml-auto">{track.dur}</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-body transition-all border
                ${isLiked
                  ? "bg-[#f87171]/10 border-[#f87171]/30 text-[#f87171]"
                  : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:border-[#f87171]/30 hover:text-[#f87171]"
                }`}
            >
              <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
              {isLiked ? "Liked" : "Like"}
            </button>

            <div className="relative">
              <button
                onClick={() => setShareOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-body transition-all border
                  bg-white/[0.04] border-white/[0.08] text-white/40 hover:border-[#A78BFA]/30 hover:text-[#A78BFA]"
              >
                <Share2 size={13} /> Share
              </button>
              {shareOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-white/[0.1]
                  bg-[oklch(0.14_0.013_280)] shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] font-body text-white/60
                      hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    {copied ? <Check size={13} className="text-[#4ade80]" /> : <Copy size={13} />}
                    Copy Link
                  </button>
                  <button
                    onClick={shareToTwitter}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] font-body text-white/60
                      hover:bg-white/[0.06] hover:text-[#1DA1F2] transition-all"
                  >
                    <Twitter size={13} /> Share on Twitter
                  </button>
                  <button
                    onClick={shareNative}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] font-body text-white/60
                      hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    <Send size={13} /> More Options
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-body transition-all border
                bg-white/[0.04] border-white/[0.08] text-white/40 hover:border-[#E8C547]/30 hover:text-[#E8C547]"
            >
              <Link2 size={13} /> Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* ── Unique Track URL ── */}
      <div className="rounded-xl border border-white/[0.07] bg-[oklch(0.12_0.012_280)] p-3 mb-5 flex items-center gap-3">
        <Link2 size={14} className="text-[#A78BFA]/60 flex-shrink-0" />
        <span className="flex-1 text-[11px] font-body text-white/30 truncate">{trackUrl}</span>
        <button
          onClick={copyLink}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-body transition-all
            bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA] hover:bg-[#A78BFA]/20"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* ── Tip Jar ── */}
      <div className="rounded-2xl border border-[#E8C547]/20 bg-[oklch(0.11_0.012_280)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={15} className="text-[#E8C547]" />
          <span className="font-heading text-[13px] tracking-wider text-[#E8C547]">Tip the Artist</span>
          {tipTotal > 0 && (
            <span className="ml-auto text-[11px] font-body text-[#4ade80]/70">${tipTotal} raised</span>
          )}
        </div>
        <p className="text-[12px] text-white/35 font-body mb-4">
          Love this track? Show {track.artist} some love directly.
        </p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {TIP_AMOUNTS.map(amt => (
            <button
              key={amt}
              onClick={() => { setTipSelected(amt); setCustomTip(""); }}
              className={`py-2 rounded-xl text-[12px] font-heading transition-all border
                ${tipSelected === amt
                  ? "bg-[#E8C547]/15 border-[#E8C547] text-[#E8C547]"
                  : "bg-[oklch(0.14_0.013_280)] border-white/[0.08] text-white/45 hover:border-[#E8C547]/40 hover:text-[#E8C547]"
                }`}
            >
              ${amt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Custom $"
            value={customTip}
            onChange={e => { setCustomTip(e.target.value); setTipSelected(null); }}
            className="flex-1 px-3 py-2 rounded-xl text-[12px] font-body text-white/70
              bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
              focus:border-[#E8C547]/50 placeholder:text-white/20"
          />
          <button
            onClick={sendTip}
            className="px-4 py-2 rounded-xl font-heading text-[12px] tracking-wider transition-all
              bg-[#E8C547]/10 border border-[#E8C547]/30 text-[#E8C547]
              hover:bg-[#E8C547]/20 hover:border-[#E8C547]/60 active:scale-[0.98]"
          >
            Send ✦
          </button>
        </div>
      </div>

      {/* ── Comments ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[oklch(0.12_0.012_280)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={15} className="text-[#A78BFA]" />
          <span className="font-heading text-[13px] tracking-wider text-white/70">
            Comments <span className="text-white/25">({comments.length})</span>
          </span>
        </div>

        {/* Comment input */}
        <div className="mb-5 space-y-2">
          <input
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 rounded-xl text-[12px] font-body text-white/70
              bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
              focus:border-[#A78BFA]/50 placeholder:text-white/20"
          />
          <div className="flex gap-2">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Share your thoughts on this track…"
              rows={2}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) submitComment(); }}
              className="flex-1 px-3 py-2 rounded-xl text-[12px] font-body text-white/70
                bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none resize-none
                focus:border-[#A78BFA]/50 placeholder:text-white/20"
            />
            <button
              onClick={submitComment}
              className="px-3 py-2 rounded-xl font-heading text-[12px] tracking-wider transition-all self-end
                bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[#A78BFA]
                hover:bg-[#A78BFA]/20 hover:border-[#A78BFA]/60 active:scale-[0.98]"
            >
              Post
            </button>
          </div>
          <p className="text-[10px] text-white/20 font-body">⌘ + Enter to post</p>
        </div>

        {/* Comment list */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-white/20 font-body text-[12px]">
            Be the first to comment on this track ✦
          </div>
        ) : (
          <div className="space-y-3">
            {[...comments].reverse().map(c => (
              <div key={c.id} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                  bg-[oklch(0.18_0.014_280)] border border-white/[0.08] text-[13px]">
                  {c.author.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[12px] font-body text-white/70">{c.author}</span>
                    <span className="text-[10px] font-body text-white/20">{timeAgo(c.timestamp)}</span>
                  </div>
                  <p className="text-[13px] font-body text-white/55 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
