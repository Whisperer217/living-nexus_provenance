import { useState } from "react";
import { CornerDownRight, Loader2, MessageSquare, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function relativeVoiceTime(value: Date | string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recorded date unavailable";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 45) return "just now";

  const units = [
    [365 * 24 * 60 * 60, "year"],
    [30 * 24 * 60 * 60, "month"],
    [7 * 24 * 60 * 60, "week"],
    [24 * 60 * 60, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ] as const;

  for (const [seconds, label] of units) {
    if (elapsedSeconds >= seconds) {
      const amount = Math.floor(elapsedSeconds / seconds);
      return `${amount} ${label}${amount === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}

function VoiceAvatar({ avatarUrl, authorName, compact = false }: { avatarUrl?: string | null; authorName?: string | null; compact?: boolean }) {
  const sizeClass = compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className={`ln-voice-comment__avatar ${sizeClass} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span>{(authorName || "A").charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

function VoiceRecord({ voice, onReply }: { voice: any; onReply: (voice: any) => void }) {
  return (
    <article className="ln-dimensional-card ln-voice-comment rounded-2xl p-4 sm:p-5">
      <div className="flex gap-3">
        <VoiceAvatar avatarUrl={voice.avatarUrl} authorName={voice.authorName} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-[var(--ln-parchment)]">{voice.authorName || "Anonymous"}</span>
            <time
              className="ml-auto flex-shrink-0 text-xs text-[var(--ln-smoke)]"
              dateTime={new Date(voice.createdAt).toISOString()}
              title={new Date(voice.createdAt).toLocaleString()}
            >
              {relativeVoiceTime(voice.createdAt)}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ln-bone)]">{voice.content}</p>
          <button
            type="button"
            onClick={() => onReply(voice)}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[var(--ln-gold-hot)] transition-colors hover:bg-[var(--ln-gold)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ln-gold)]/60"
          >
            <CornerDownRight size={13} aria-hidden="true" /> Reply
          </button>
        </div>
      </div>

      {voice.replies?.length > 0 && (
        <div className="ml-5 mt-3 space-y-3 border-l border-[var(--ln-gold)]/20 pl-4 sm:ml-11">
          {voice.replies.map((reply: any) => (
            <div key={reply.id} className="flex gap-2.5">
              <VoiceAvatar avatarUrl={reply.avatarUrl} authorName={reply.authorName} compact />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-[var(--ln-parchment)]">{reply.authorName || "Anonymous"}</span>
                  <time
                    className="ml-auto flex-shrink-0 text-[11px] text-[var(--ln-smoke)]"
                    dateTime={new Date(reply.createdAt).toISOString()}
                    title={new Date(reply.createdAt).toLocaleString()}
                  >
                    {relativeVoiceTime(reply.createdAt)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ln-smoke)]">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function WorkVoices({ songId }: { songId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const commentsQuery = trpc.comments.list.useQuery({ songId }, { enabled: songId > 0 });

  const refresh = () => utils.comments.list.invalidate({ songId });
  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      void refresh();
    },
  });
  const replyMutation = trpc.comments.addReply.useMutation({
    onSuccess: () => {
      setReplyText("");
      setReplyingTo(null);
      void refresh();
    },
  });

  const comments = commentsQuery.data ?? [];
  const requestSignIn = () => { window.location.assign(getLoginUrl()); };
  const postComment = () => {
    if (!user) return requestSignIn();
    const content = commentText.trim();
    if (content) commentMutation.mutate({ songId, content });
  };
  const postReply = () => {
    if (!user) return requestSignIn();
    const content = replyText.trim();
    if (content && replyingTo) replyMutation.mutate({ songId, parentId: replyingTo.id, content });
  };

  return (
    <section id="voices" className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6">
      <div className="ln-breath-accent-line mb-7" aria-hidden="true" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-[var(--ln-gold-hot)]">Living record</p>
            <h2 className="mt-2 font-heading text-3xl text-[var(--ln-parchment)] sm:text-4xl">Voices</h2>
            <p className="mt-2 max-w-xl font-body text-base leading-relaxed text-[var(--ln-bone)]">A visible conversation around this Work. Voices remain distinct from its creator-declared testimony and registry record.</p>
          </div>
          <span className="ln-mono rounded-full border border-[var(--ln-gold)]/30 bg-[var(--ln-gold)]/10 px-3 py-1.5 !text-[var(--ln-gold-hot)]">{comments.length} {comments.length === 1 ? "voice" : "voices"}</span>
        </div>

        <div className="ln-dimensional-card rounded-2xl p-4 sm:p-5">
          <div className="flex gap-3">
            <VoiceAvatar authorName={user?.name || "?"} />
            <div className="min-w-0 flex-1">
              <label className="ln-overline !text-[var(--ln-gold-hot)]" htmlFor="voice-comment">Add your voice</label>
              <textarea
                id="voice-comment"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onFocus={() => { if (!user) requestSignIn(); }}
                placeholder={user ? "Share a thoughtful response to this Work…" : "Sign in to add your voice"}
                className="ln-dimensional-field mt-2 min-h-24 w-full resize-y bg-[var(--ln-coal)] px-3 py-2.5 text-sm text-[var(--ln-parchment)] placeholder:text-[var(--ln-smoke)]"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={postComment}
                  disabled={commentMutation.isPending || (!commentText.trim() && !!user)}
                  className="ln-dimensional-action inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--ln-gold)]/15 px-4 text-sm font-medium text-[var(--ln-parchment)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {commentMutation.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                  {user ? "Add voice" : "Sign in to speak"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {replyingTo && (
          <div className="ln-dimensional-card mt-4 rounded-2xl border border-[var(--ln-gold)]/30 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--ln-bone)]">Replying to <span className="font-medium text-[var(--ln-parchment)]">{replyingTo.authorName || "Anonymous"}</span></p>
              <button type="button" onClick={() => { setReplyingTo(null); setReplyText(""); }} className="min-h-9 rounded-lg px-2.5 text-xs text-[var(--ln-smoke)] hover:text-[var(--ln-parchment)]">Cancel</button>
            </div>
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              onFocus={() => { if (!user) requestSignIn(); }}
              placeholder={user ? "Write a reply…" : "Sign in to reply"}
              className="ln-dimensional-field mt-3 min-h-20 w-full resize-y bg-[var(--ln-coal)] px-3 py-2.5 text-sm text-[var(--ln-parchment)] placeholder:text-[var(--ln-smoke)]"
            />
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={postReply} disabled={replyMutation.isPending || (!replyText.trim() && !!user)} className="ln-dimensional-action inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--ln-gold)]/15 px-4 text-sm font-medium text-[var(--ln-parchment)] disabled:cursor-not-allowed disabled:opacity-50">
                {replyMutation.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CornerDownRight size={15} aria-hidden="true" />}
                Reply
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4" aria-live="polite">
          {commentsQuery.isLoading ? (
            [0, 1].map((index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--ln-gold)]/10 bg-[var(--ln-coal)]" />)
          ) : comments.length > 0 ? (
            comments.map((voice: any) => <VoiceRecord key={voice.id} voice={voice} onReply={setReplyingTo} />)
          ) : (
            <div className="ln-dimensional-card rounded-2xl border border-dashed border-[var(--ln-gold)]/30 px-6 py-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-6 w-6 text-[var(--ln-gold-hot)]" aria-hidden="true" />
              <h3 className="font-heading text-lg text-[var(--ln-parchment)]">No voices recorded yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--ln-bone)]">Begin a thoughtful conversation around this Work. Commentary stays visible, while the creator’s testimony remains its own record.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
