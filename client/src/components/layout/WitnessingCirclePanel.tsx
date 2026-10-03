import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpDown, Ban, Check, ExternalLink, Heart, MessageCircle, Search, Send, Settings2, ShieldAlert, X, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { WitnessSigil } from "@/components/icons/WitnessSigil";
import { SupportCreatorDrawer, type SupportTarget } from "@/components/SupportCreatorDrawer";

type WitnessedCreator = {
  creatorId: number;
  name: string | null;
  artistHandle: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  tier: "witness" | "reserve" | "steward";
  witnessedAt: Date | string;
  updatedAt: Date | string;
  latestPublishedAt: Date | string | null;
  latestSupportWorkId: number | null;
  latestSupportWorkTitle: string | null;
  latestSupportWorkCoverArtUrl: string | null;
};

type CircleOrder = "recent" | "name";
type CircleMode = "circle" | "correspondence";
type ContactPolicy = "none" | "mutual_witnesses" | "witnesses";

function tierLabel(tier: WitnessedCreator["tier"]) {
  if (tier === "reserve") return "Reserve witness";
  if (tier === "steward") return "Steward witness";
  return "Witness";
}

function hasRecentPublication(publishedAt: WitnessedCreator["latestPublishedAt"]) {
  if (!publishedAt) return false;
  const publishedTime = new Date(publishedAt).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return Number.isFinite(publishedTime) && publishedTime >= Date.now() - fourteenDays;
}

function correspondenceIdentity(thread: any) {
  return thread.counterpartHandle || thread.counterpartName || "Creator";
}

export function WitnessingCirclePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<CircleOrder>("recent");
  const [mode, setMode] = useState<CircleMode>("circle");
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [supportTarget, setSupportTarget] = useState<SupportTarget | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [contactPolicy, setContactPolicy] = useState<ContactPolicy>("witnesses");
  const [allowWorkContext, setAllowWorkContext] = useState(true);
  const { data: witnessedCreators = [], isLoading } = trpc.witnessSubscription.myWitnessing.useQuery(undefined, {
    enabled: open,
    staleTime: 30_000,
  });
  const threadsQuery = trpc.correspondence.listThreads.useQuery(undefined, { enabled: open, staleTime: 10_000 });
  const settingsQuery = trpc.correspondence.settings.useQuery(undefined, { enabled: open && mode === "correspondence" });
  const selectedThreadQuery = trpc.correspondence.getThread.useQuery(
    { threadId: selectedThreadId ?? 0 },
    { enabled: open && mode === "correspondence" && selectedThreadId !== null },
  );
  const invalidateCorrespondence = () => {
    void utils.correspondence.listThreads.invalidate();
    if (selectedThreadId) void utils.correspondence.getThread.invalidate({ threadId: selectedThreadId });
  };
  const requestMutation = trpc.correspondence.request.useMutation({ onSuccess: invalidateCorrespondence });
  const respondMutation = trpc.correspondence.respond.useMutation({ onSuccess: invalidateCorrespondence });
  const sendMutation = trpc.correspondence.send.useMutation({
    onSuccess: () => { setMessageBody(""); invalidateCorrespondence(); },
  });
  const readMutation = trpc.correspondence.markRead.useMutation();
  const blockMutation = trpc.correspondence.block.useMutation({
    onSuccess: () => { setSelectedThreadId(null); invalidateCorrespondence(); },
  });
  const reportMutation = trpc.correspondence.report.useMutation();
  const updateSettingsMutation = trpc.correspondence.updateSettings.useMutation({
    onSuccess: () => { setShowSettings(false); void utils.correspondence.settings.invalidate(); },
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedThreadId) setSelectedThreadId(null);
        else if (mode === "correspondence") setMode("circle");
        else onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose, open, selectedThreadId]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedThreadId(null);
      setMode("circle");
      setShowSettings(false);
    }
  }, [open]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setContactPolicy(settingsQuery.data.incomingPolicy as ContactPolicy);
    setAllowWorkContext(settingsQuery.data.allowWorkContext);
  }, [settingsQuery.data]);

  const selectedThread = selectedThreadQuery.data;
  const lastMessage = selectedThread?.messages.at(-1);
  useEffect(() => {
    if (!selectedThreadId || !lastMessage || readMutation.isPending) return;
    readMutation.mutate({ threadId: selectedThreadId, messageId: lastMessage.id });
    // Deliberately records only the final observed message; read state is server-verified.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage?.id, selectedThreadId]);

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const rows = (witnessedCreators as WitnessedCreator[]).filter((creator) => {
      if (!normalizedQuery) return true;
      return [creator.artistHandle, creator.name, creator.bio]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
    });
    return rows.sort((a, b) => {
      if (order === "name") return (a.artistHandle || a.name || "").localeCompare(b.artistHandle || b.name || "");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [order, query, witnessedCreators]);

  const threadsByCounterpart = useMemo(() => new Map((threadsQuery.data ?? []).map((thread: any) => [thread.counterpartId, thread])), [threadsQuery.data]);
  const openCreator = (creator: WitnessedCreator) => {
    navigate(`/creator/${creator.artistHandle || creator.creatorId}`);
    onClose();
  };
  const openCorrespondence = (threadId: number) => {
    setMode("correspondence");
    setSelectedThreadId(threadId);
  };
  const requestCorrespondence = (creatorId: number) => {
    requestMutation.mutate({ recipientId: creatorId });
  };
  const sendMessage = () => {
    const body = messageBody.trim();
    if (!selectedThreadId || !body) return;
    const clientMessageId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `circle-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    sendMutation.mutate({ threadId: selectedThreadId, body, clientMessageId });
  };
  const saveSettings = () => updateSettingsMutation.mutate({ incomingPolicy: contactPolicy, allowWorkContext });
  const incomingRequests = (threadsQuery.data ?? []).filter((thread: any) => thread.selfRole === "recipient" && thread.selfState === "requested");

  const renderCreatorAction = (creator: WitnessedCreator) => {
    const thread = threadsByCounterpart.get(creator.creatorId) as any;
    if (thread?.selfState === "accepted" && thread?.counterpartState === "accepted") {
      return <button type="button" className="ln-witnessing-circle__correspond" onClick={() => openCorrespondence(thread.threadId)}><MessageCircle size={12} aria-hidden="true" /> Correspond</button>;
    }
    if (thread?.selfRole === "initiator" && thread?.selfState === "requested") {
      return <span className="ln-witnessing-circle__request-state">Request pending</span>;
    }
    if (thread?.selfRole === "recipient" && thread?.selfState === "requested") {
      return <button type="button" className="ln-witnessing-circle__correspond" onClick={() => openCorrespondence(thread.threadId)}><MessageCircle size={12} aria-hidden="true" /> Review request</button>;
    }
    return (
      <button
        type="button"
        className="ln-witnessing-circle__correspond"
        disabled={requestMutation.isPending}
        onClick={() => requestCorrespondence(creator.creatorId)}
        title="Requests require the creator’s consent before a private conversation can open."
      >
        <MessageCircle size={12} aria-hidden="true" /> Request correspondence
      </button>
    );
  };

  const correspondencePane = () => {
    if (selectedThreadId && selectedThread) {
      const accepted = selectedThread.thread.selfState === "accepted" && selectedThread.thread.counterpartState === "accepted" && !selectedThread.thread.closedAt;
      const counterpart = (threadsQuery.data ?? []).find((thread: any) => thread.threadId === selectedThreadId);
      const identity = counterpart ? correspondenceIdentity(counterpart) : "Creator";
      const isRecipientRequest = selectedThread.thread.selfRole === "recipient" && selectedThread.thread.selfState === "requested";
      return (
        <div className="ln-correspondence-thread">
          <div className="ln-correspondence-thread__header">
            <button type="button" className="ln-witnessing-circle__back" onClick={() => setSelectedThreadId(null)} aria-label="Return to correspondence inbox"><ArrowLeft size={16} /></button>
            <div className="min-w-0 flex-1"><p className="ln-overline !mb-0 !text-[var(--ln-gold-hot)]">Private creator correspondence</p><h3>{identity}</h3></div>
          </div>
          {isRecipientRequest && (
            <div className="ln-correspondence-consent">
              <ShieldAlert size={18} aria-hidden="true" />
              <p><strong>Consent required.</strong> This creator witnesses your work and has requested a private correspondence. Accepting opens a server-stored conversation for both participants; it is not end-to-end encrypted.</p>
              <span>
                <button type="button" className="ln-witnessing-circle__visit" disabled={respondMutation.isPending} onClick={() => respondMutation.mutate({ threadId: selectedThreadId, action: "decline" })}><XCircle size={12} aria-hidden="true" /> Decline</button>
                <button type="button" className="ln-witnessing-circle__correspond" disabled={respondMutation.isPending} onClick={() => respondMutation.mutate({ threadId: selectedThreadId, action: "accept" })}><Check size={12} aria-hidden="true" /> Accept</button>
              </span>
            </div>
          )}
          {accepted ? (
            <>
              <div className="ln-correspondence-thread__messages" aria-live="polite">
                {selectedThread.messages.length === 0 ? <p className="ln-correspondence-thread__empty">This private correspondence is open. Begin thoughtfully; messages are visible only to accepted participants and are server-stored.</p> : selectedThread.messages.map((message: any) => (
                  <article key={message.id} className={`ln-correspondence-message${message.senderId === selectedThread.thread.counterpartId ? "" : " ln-correspondence-message--self"}`}>
                    <strong>{message.senderHandle || message.senderName || "Creator"}</strong>
                    <p>{message.body}</p>
                    <time dateTime={new Date(message.createdAt).toISOString()}>{relativeTime(message.createdAt)}</time>
                  </article>
                ))}
              </div>
              <div className="ln-correspondence-thread__composer">
                <label className="sr-only" htmlFor="correspondence-message">Write private correspondence</label>
                <textarea id="correspondence-message" value={messageBody} maxLength={2000} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write a thoughtful private correspondence…" />
                <button type="button" className="ln-witnessing-circle__correspond" disabled={!messageBody.trim() || sendMutation.isPending} onClick={sendMessage}>{sendMutation.isPending ? <LoaderDot /> : <Send size={13} aria-hidden="true" />} Send</button>
              </div>
              <div className="ln-correspondence-thread__safety">
                <button type="button" onClick={() => reportMutation.mutate({ threadId: selectedThreadId, reason: "other" })} disabled={reportMutation.isPending}>Report correspondence</button>
                <button type="button" onClick={() => { if (counterpart?.counterpartId) blockMutation.mutate({ blockedUserId: counterpart.counterpartId }); }} disabled={blockMutation.isPending}><Ban size={12} aria-hidden="true" /> Block creator</button>
              </div>
            </>
          ) : !isRecipientRequest ? (
            <div className="ln-correspondence-consent"><ShieldAlert size={18} aria-hidden="true" /><p>This request is awaiting the other creator’s explicit consent. Messaging remains unavailable until they accept.</p></div>
          ) : null}
        </div>
      );
    }

    return (
      <>
        <div className="ln-correspondence-toolbar">
          <p>Requests begin only from an existing Witnessing relationship. Private correspondence opens after consent.</p>
          <button type="button" onClick={() => setShowSettings((visible) => !visible)}><Settings2 size={14} aria-hidden="true" /> Contact settings</button>
        </div>
        {showSettings && (
          <section className="ln-correspondence-settings" aria-label="Correspondence contact settings">
            <label>Incoming correspondence requests
              <select value={contactPolicy} onChange={(event) => setContactPolicy(event.target.value as ContactPolicy)}>
                <option value="witnesses">Creators who witness me</option>
                <option value="mutual_witnesses">Mutual witnessing only</option>
                <option value="none">Do not receive requests</option>
              </select>
            </label>
            <label className="ln-correspondence-settings__check"><input type="checkbox" checked={allowWorkContext} onChange={(event) => setAllowWorkContext(event.target.checked)} /> Permit a published Work as request context</label>
            <button type="button" className="ln-witnessing-circle__correspond" disabled={updateSettingsMutation.isPending} onClick={saveSettings}>Save contact settings</button>
          </section>
        )}
        <div className="ln-correspondence-inbox" aria-live="polite">
          {threadsQuery.isLoading ? [0, 1].map((index) => <div key={index} className="ln-witnessing-circle__skeleton" />) : (threadsQuery.data ?? []).length === 0 ? (
            <div className="ln-witnessing-circle__empty"><MessageCircle size={26} /><p>No private correspondence is open. You can request a conversation from a creator you witness; they always choose whether to accept.</p></div>
          ) : (threadsQuery.data ?? []).map((thread: any) => {
            const isRequest = thread.selfRole === "recipient" && thread.selfState === "requested";
            const accepted = thread.selfState === "accepted" && thread.counterpartState === "accepted" && !thread.closedAt;
            return <article key={thread.threadId} className="ln-correspondence-inbox__row">
              <button type="button" onClick={() => setSelectedThreadId(thread.threadId)} className="ln-correspondence-inbox__main">
                <span className="ln-witnessing-circle__avatar">{thread.counterpartAvatarUrl ? <img src={thread.counterpartAvatarUrl} alt="" /> : correspondenceIdentity(thread).slice(0, 1).toUpperCase()}</span>
                <span><strong>{correspondenceIdentity(thread)}</strong><small>{isRequest ? "Consent requested" : accepted ? thread.lastMessagePreview || "Private correspondence open" : "Correspondence pending"}</small></span>
                {Number(thread.unreadCount) > 0 && <em>{thread.unreadCount}</em>}
              </button>
              {isRequest ? <span className="ln-correspondence-inbox__actions"><button type="button" onClick={() => respondMutation.mutate({ threadId: thread.threadId, action: "decline" })} aria-label={`Decline correspondence from ${correspondenceIdentity(thread)}`}><X size={13} /></button><button type="button" onClick={() => respondMutation.mutate({ threadId: thread.threadId, action: "accept" })} aria-label={`Accept correspondence from ${correspondenceIdentity(thread)}`}><Check size={13} /></button></span> : null}
            </article>;
          })}
        </div>
      </>
    );
  };

  return (
    <>
      <button type="button" className={`ln-witnessing-circle-backdrop ${open ? "ln-witnessing-circle-backdrop--open" : ""}`} onClick={onClose} aria-label="Close Witnessing Circle" tabIndex={open ? 0 : -1} />
      <aside id="witnessing-circle-panel" className={`ln-witnessing-circle ${open ? "ln-witnessing-circle--open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="witnessing-circle-title" aria-hidden={!open}>
        <header className="ln-witnessing-circle__header">
          <div className="flex min-w-0 items-center gap-3">
            <span className="ln-witnessing-circle__sigil" aria-hidden="true"><WitnessSigil size={19} /></span>
            <div className="min-w-0"><p className="ln-overline !mb-0 !text-[var(--ln-gold-hot)]">Creator relationships</p><h2 id="witnessing-circle-title" className="ln-section-header !mt-0 !text-[var(--ln-parchment)]">{mode === "circle" ? "Witnessing Circle" : "Correspondence"}</h2></div>
          </div>
          <button type="button" onClick={onClose} className="ln-witnessing-circle__close" aria-label="Close Witnessing Circle"><X size={18} /></button>
        </header>

        <div className="ln-witnessing-circle__tabs" role="tablist" aria-label="Witnessing Circle views">
          <button type="button" role="tab" aria-selected={mode === "circle"} className={mode === "circle" ? "is-active" : ""} onClick={() => { setMode("circle"); setSelectedThreadId(null); }}><WitnessSigil size={14} /> Circle</button>
          <button type="button" role="tab" aria-selected={mode === "correspondence"} className={mode === "correspondence" ? "is-active" : ""} onClick={() => { setMode("correspondence"); setSelectedThreadId(null); }}><MessageCircle size={14} /> Correspondence{incomingRequests.length > 0 && <span>{incomingRequests.length}</span>}</button>
        </div>

        {mode === "correspondence" ? <div className="ln-witnessing-circle__results">{correspondencePane()}</div> : <>
          <p className="ln-witnessing-circle__intro">Creators whose future registered manifestations you have chosen to witness.</p>
          <div className="ln-witnessing-circle__filters">
            <label className="ln-dimensional-field ln-witnessing-circle__search"><Search size={15} aria-hidden="true" /><span className="sr-only">Search witnessed creators</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a creator" autoComplete="off" /></label>
            <label className="ln-witnessing-circle__order"><ArrowUpDown size={14} aria-hidden="true" /><span className="sr-only">Order witnessed creators</span><select value={order} onChange={(event) => setOrder(event.target.value as CircleOrder)}><option value="recent">Recently witnessed</option><option value="name">Creator name</option></select></label>
          </div>
          {requestMutation.error && <p className="ln-correspondence-notice" role="status">Correspondence is not available for this creator.</p>}
          <div className="ln-witnessing-circle__results" aria-live="polite">
            {isLoading ? [0, 1, 2].map((index) => <div key={index} className="ln-witnessing-circle__skeleton" />) : visibleCreators.length === 0 ? <div className="ln-witnessing-circle__empty"><WitnessSigil size={26} /><p>{query ? "No witnessed creators match that search." : "Your Witnessing Circle is ready to receive the creators you choose to witness."}</p>{!query && <button type="button" onClick={() => { navigate("/explore?view=creators"); onClose(); }}>Explore creators</button>}</div> : visibleCreators.map((creator) => {
              const identity = creator.artistHandle || creator.name || "Creator";
              const recentlyPublished = hasRecentPublication(creator.latestPublishedAt);
              const canSupport = Number.isInteger(creator.latestSupportWorkId) && !!creator.latestSupportWorkTitle;
              return <article key={creator.creatorId} className="ln-witnessing-circle__creator">
                <button type="button" className="ln-witnessing-circle__creator-main" onClick={() => openCreator(creator)}><span className="ln-witnessing-circle__avatar">{creator.profilePhotoUrl ? <img src={creator.profilePhotoUrl} alt="" /> : identity.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1 text-left"><span className="ln-witnessing-circle__identity-row"><span className="ln-witnessing-circle__identity">{identity}</span>{recentlyPublished && <span className="ln-witnessing-circle__publication" aria-label={`${identity} has published recently`}><span aria-hidden="true" />New work</span>}</span>{creator.artistHandle && creator.name && creator.artistHandle !== creator.name && <span className="ln-witnessing-circle__name">{creator.name}</span>}<span className="ln-witnessing-circle__bio">{creator.bio || "Creator domain witnessed through the Living Nexus Registry."}</span></span><ExternalLink size={14} className="shrink-0" aria-hidden="true" /></button>
                <div className="ln-witnessing-circle__creator-actions"><span className="ln-witnessing-circle__meta">{tierLabel(creator.tier)} · established {new Date(creator.witnessedAt).toLocaleDateString()}</span><span className="ln-witnessing-circle__action-group">{canSupport && <button type="button" className="ln-witnessing-circle__support" onClick={() => setSupportTarget({ songId: creator.latestSupportWorkId!, songTitle: creator.latestSupportWorkTitle!, creatorId: creator.creatorId, creatorName: creator.name || identity, creatorHandle: creator.artistHandle, coverArtUrl: creator.latestSupportWorkCoverArtUrl })}><Heart size={12} aria-hidden="true" /> Support</button>}{renderCreatorAction(creator)}<button type="button" className="ln-witnessing-circle__visit" onClick={() => openCreator(creator)}>Domain</button></span></div>
              </article>;
            })}
          </div>
        </>}
        <footer className="ln-witnessing-circle__footer"><span>{mode === "circle" ? (isLoading ? "" : `${witnessedCreators.length} witnessed creator${witnessedCreators.length === 1 ? "" : "s"}`) : `${(threadsQuery.data ?? []).length} correspondence thread${(threadsQuery.data ?? []).length === 1 ? "" : "s"}`}</span>{mode === "circle" && <button type="button" onClick={() => { navigate("/profile?tab=witnessing"); onClose(); }}>Open full directory</button>}</footer>
      </aside>
      <SupportCreatorDrawer target={supportTarget} onClose={() => setSupportTarget(null)} />
    </>
  );
}

function relativeTime(value: Date | string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Recorded date unavailable";
}

function LoaderDot() {
  return <span className="ln-correspondence-loader" aria-label="Sending" />;
}
