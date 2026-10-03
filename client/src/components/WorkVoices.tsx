import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, AtSign, CornerDownRight, Loader2, MessageSquare, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SignalOrder = "recent" | "first";
type Mention = { userId: number; handle: string; name: string | null };
type MentionToken = { query: string; start: number; end: number };

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

function mentionAtCaret(value: string, caret: number): MentionToken | null {
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(/(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_.-]{1,64})$/);
  if (!match || !match[1]) return null;
  return { query: match[1], start: caret - match[1].length - 1, end: caret };
}

function mentionPieces(content: string, mentions: Mention[] | undefined) {
  const lookup = new Map((mentions ?? []).map((mention) => [mention.handle.toLocaleLowerCase(), mention]));
  return content.split(/(@[A-Za-z0-9][A-Za-z0-9_.-]{0,63})/g).map((piece, index) => {
    const handle = piece.startsWith("@") ? piece.slice(1) : "";
    const mention = lookup.get(handle.toLocaleLowerCase());
    if (!mention) return <span key={`${piece}-${index}`}>{piece}</span>;
    return (
      <a
        key={`${mention.userId}-${index}`}
        href={`/creator/${mention.handle}`}
        className="ln-signal-reference"
        aria-label={`View ${mention.handle}'s creator domain`}
      >
        @{mention.handle}
      </a>
    );
  });
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
    <article className="ln-dimensional-card ln-voice-comment ln-signal-card rounded-2xl p-4 sm:p-5">
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
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ln-bone)]">{mentionPieces(voice.content, voice.mentions)}</p>
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
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ln-smoke)]">{mentionPieces(reply.content, reply.mentions)}</p>
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
  const [commentCaret, setCommentCaret] = useState(0);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [replyCaret, setReplyCaret] = useState(0);
  const [signalOrder, setSignalOrder] = useState<SignalOrder>("recent");
  const [isReordering, setIsReordering] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const reorderTimer = useRef<number | undefined>(undefined);
  const commentsQuery = trpc.comments.list.useQuery({ songId }, { enabled: songId > 0 });

  const commentMention = useMemo(() => mentionAtCaret(commentText, commentCaret), [commentCaret, commentText]);
  const replyMention = useMemo(() => mentionAtCaret(replyText, replyCaret), [replyCaret, replyText]);
  const activeMention = replyingTo ? replyMention : commentMention;
  const mentionCandidatesQuery = trpc.comments.mentionCandidates.useQuery(
    { query: activeMention?.query || "_" },
    { enabled: Boolean(user && activeMention?.query), staleTime: 20_000 },
  );
  const mentionCandidates = mentionCandidatesQuery.data ?? [];

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [activeMention?.query]);

  useEffect(() => () => {
    if (reorderTimer.current) window.clearTimeout(reorderTimer.current);
  }, []);

  const refresh = () => utils.comments.list.invalidate({ songId });
  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      setCommentCaret(0);
      void refresh();
    },
  });
  const replyMutation = trpc.comments.addReply.useMutation({
    onSuccess: () => {
      setReplyText("");
      setReplyCaret(0);
      setReplyingTo(null);
      void refresh();
    },
  });

  const comments = commentsQuery.data ?? [];
  const orderedComments = useMemo(() => [...comments].sort((left: any, right: any) => {
    const difference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return signalOrder === "recent" ? difference : -difference;
  }), [comments, signalOrder]);
  const requestSignIn = () => { window.location.assign(getLoginUrl()); };

  const updateSignalOrder = (nextOrder: SignalOrder) => {
    if (nextOrder === signalOrder) return;
    setIsReordering(false);
    setSignalOrder(nextOrder);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsReordering(true));
    });
    if (reorderTimer.current) window.clearTimeout(reorderTimer.current);
    reorderTimer.current = window.setTimeout(() => setIsReordering(false), 260);
  };

  const replaceMention = (candidate: any) => {
    const targetIsReply = Boolean(replyingTo);
    const value = targetIsReply ? replyText : commentText;
    const token = targetIsReply ? replyMention : commentMention;
    const ref = targetIsReply ? replyTextareaRef : commentTextareaRef;
    if (!token) return;
    const replacement = `@${candidate.artistHandle} `;
    const nextValue = `${value.slice(0, token.start)}${replacement}${value.slice(token.end)}`;
    const nextCaret = token.start + replacement.length;
    if (targetIsReply) {
      setReplyText(nextValue);
      setReplyCaret(nextCaret);
    } else {
      setCommentText(nextValue);
      setCommentCaret(nextCaret);
    }
    window.requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleMentionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeMention || mentionCandidates.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % mentionCandidates.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index - 1 + mentionCandidates.length) % mentionCandidates.length);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      replaceMention(mentionCandidates[activeSuggestionIndex] ?? mentionCandidates[0]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (replyingTo) setReplyCaret(0); else setCommentCaret(0);
    }
  };

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

  const mentionList = activeMention && mentionCandidates.length > 0 && (
    <div className="ln-signal-mention-menu" role="listbox" aria-label="Creator reference suggestions">
      <p><AtSign size={13} aria-hidden="true" /> Reference a creator publicly</p>
      {mentionCandidates.map((candidate: any, index: number) => (
        <button
          key={candidate.id}
          type="button"
          role="option"
          aria-selected={index === activeSuggestionIndex}
          className={index === activeSuggestionIndex ? "is-active" : ""}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => replaceMention(candidate)}
        >
          <span className="ln-signal-mention-menu__avatar" aria-hidden="true">
            {candidate.profilePhotoUrl ? <img src={candidate.profilePhotoUrl} alt="" /> : (candidate.artistHandle || "C").slice(0, 1).toUpperCase()}
          </span>
          <span><strong>@{candidate.artistHandle}</strong>{candidate.name && candidate.name !== candidate.artistHandle ? <small>{candidate.name}</small> : null}</span>
        </button>
      ))}
    </div>
  );

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

        {comments.length > 1 && (
          <label className="ln-signal-order mb-5">
            <ArrowDownUp size={14} aria-hidden="true" />
            <span>Signal order</span>
            <select value={signalOrder} onChange={(event) => updateSignalOrder(event.target.value as SignalOrder)} aria-label="Signal order">
              <option value="recent">Most recent</option>
              <option value="first">First signals</option>
            </select>
          </label>
        )}
        <p className="sr-only" aria-live="polite">Signals ordered by {signalOrder === "recent" ? "most recent" : "first signals"}.</p>

        <div className="ln-dimensional-card rounded-2xl p-4 sm:p-5">
          <div className="flex gap-3">
            <VoiceAvatar authorName={user?.name || "?"} />
            <div className="min-w-0 flex-1">
              <label className="ln-overline !text-[var(--ln-gold-hot)]" htmlFor="voice-comment">Signal this Work</label>
              <textarea
                ref={commentTextareaRef}
                id="voice-comment"
                value={commentText}
                onChange={(event) => { setCommentText(event.target.value); setCommentCaret(event.target.selectionStart ?? event.target.value.length); }}
                onSelect={(event) => setCommentCaret(event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                onKeyDown={handleMentionKeyDown}
                onFocus={() => { if (!user) requestSignIn(); }}
                aria-autocomplete="list"
                aria-controls={activeMention ? "signal-mention-suggestions" : undefined}
                aria-expanded={Boolean(commentMention && mentionCandidates.length)}
                placeholder={user ? "Send a thoughtful signal to this Work… Type @ to reference a creator." : "Sign in to send a signal"}
                className="ln-dimensional-field mt-2 min-h-24 w-full resize-y bg-[var(--ln-coal)] px-3 py-2.5 text-sm text-[var(--ln-parchment)] placeholder:text-[var(--ln-smoke)]"
              />
              {mentionList && <div id="signal-mention-suggestions">{mentionList}</div>}
              <p className="mt-2 text-xs leading-relaxed text-[var(--ln-smoke)]">Referencing a creator with <span className="text-[var(--ln-gold-hot)]">@handle</span> creates a public Signal reference and alerts them. It does not change this Work’s authorship, participation, or registry record.</p>
              <div className="mt-3 flex justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={postComment}
                      disabled={commentMutation.isPending || (!commentText.trim() && !!user)}
                      className="ln-dimensional-action inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--ln-gold)]/15 px-4 text-sm font-medium text-[var(--ln-parchment)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commentMutation.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                      {user ? "Signal this Work" : "Sign in to signal"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="max-w-64 border border-[var(--ln-gold)]/35 bg-[var(--ln-coal)] text-[var(--ln-parchment)] shadow-xl">
                    A Signal adds your attributed voice to this Work’s visible living record and alerts its creator.
                  </TooltipContent>
                </Tooltip>
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
              ref={replyTextareaRef}
              value={replyText}
              onChange={(event) => { setReplyText(event.target.value); setReplyCaret(event.target.selectionStart ?? event.target.value.length); }}
              onSelect={(event) => setReplyCaret(event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
              onKeyDown={handleMentionKeyDown}
              onFocus={() => { if (!user) requestSignIn(); }}
              aria-autocomplete="list"
              aria-controls={replyMention ? "signal-mention-suggestions" : undefined}
              aria-expanded={Boolean(replyMention && mentionCandidates.length)}
              placeholder={user ? "Write a reply… Type @ to reference a creator." : "Sign in to reply"}
              className="ln-dimensional-field mt-3 min-h-20 w-full resize-y bg-[var(--ln-coal)] px-3 py-2.5 text-sm text-[var(--ln-parchment)] placeholder:text-[var(--ln-smoke)]"
            />
            {mentionList && <div id="signal-mention-suggestions">{mentionList}</div>}
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={postReply} disabled={replyMutation.isPending || (!replyText.trim() && !!user)} className="ln-dimensional-action inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--ln-gold)]/15 px-4 text-sm font-medium text-[var(--ln-parchment)] disabled:cursor-not-allowed disabled:opacity-50">
                {replyMutation.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CornerDownRight size={15} aria-hidden="true" />}
                Reply
              </button>
            </div>
          </div>
        )}

        <div className={`ln-signal-list mt-5 space-y-4${isReordering ? " ln-signal-list--reordered" : ""}`}>
          {commentsQuery.isLoading ? (
            [0, 1].map((index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--ln-gold)]/10 bg-[var(--ln-coal)]" />)
          ) : comments.length > 0 ? (
            orderedComments.map((voice: any) => <div key={voice.id} className="ln-signal-list__item"><VoiceRecord voice={voice} onReply={setReplyingTo} /></div>)
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
