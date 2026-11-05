import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlayer } from "@/contexts/PlayerContext";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PlayerDevicePreview } from "@/components/PlayerDevicePreview";
import {
  PLAYER_DISPLAY_CONSENT,
  PLAYER_DISPLAY_TERMS_VERSION,
  estimateMusicBytes,
} from "@shared/playerCollections";

export default function PlayerCollectionsPage() {
  const { user, isAuthenticated } = useAuth();
  const { state, currentTrackId, addAndPlay, togglePlay } = usePlayer();
  const utils = trpc.useUtils();
  const [editionId, setEditionId] = useState<number>(0);
  const [workId, setWorkId] = useState("");
  const [kind, setKind] = useState<"music" | "audiobook">("music");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [tab, setTab] = useState<"selected" | "submitted">("selected");
  const [editionTitle, setEditionTitle] = useState(
    "Living Nexus · First Collection"
  );
  const [editionDescription, setEditionDescription] = useState(
    "Christian music and spoken works, selected individually for this edition. Submissions are not yet approved for a device."
  );
  const [terms, setTerms] = useState<Record<number, string>>({});
  const [slots, setSlots] = useState<Record<number, string>>({});
  const [rights, setRights] = useState<Record<number, boolean>>({});
  const editions = trpc.playerCollections.editions.useQuery(undefined, {
    retry: false,
  });
  useEffect(() => {
    if (!editionId && editions.data?.length) setEditionId(editions.data[0].id);
  }, [editionId, editions.data]);
  const edition = editions.data?.find(e => e.id === editionId);
  const list = trpc.playerCollections.list.useQuery(
    { editionId },
    { enabled: !!editionId, retry: false, refetchInterval: 30000 }
  );
  const mine = trpc.playerCollections.mine.useQuery(
    { editionId },
    { enabled: !!editionId && isAuthenticated, retry: false }
  );
  const works = trpc.songs.mySongs.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const refresh = () => {
    void utils.playerCollections.invalidate();
  };
  const fail = (e: { message: string }) => toast.error(e.message);
  const submit = trpc.playerCollections.submit.useMutation({
    onSuccess: () => {
      refresh();
      setConsent(false);
      setWorkId("");
      setNotes("");
      setTab("submitted");
      toast.success(
        "Submitted. Your work is now listed publicly for consideration."
      );
    },
    onError: fail,
  });
  const withdraw = trpc.playerCollections.withdraw.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const create = trpc.playerCollections.createEdition.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const offer = trpc.playerCollections.offerTerms.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const accept = trpc.playerCollections.acceptTerms.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const select = trpc.playerCollections.select.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Added to the player collection.");
    },
    onError: fail,
  });
  const exportManifest = trpc.playerCollections.exportManifest.useMutation({
    onError: fail,
    onSuccess: data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `living-nexus-edition-${data.editionId}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  const rows = list.data ?? [];
  const selected = rows.filter(r => r.status === "selected");
  const visible =
    tab === "selected" ? selected : rows.filter(r => r.status !== "selected");
  const active =
    rows.find(r => currentTrackId === String(r.songId)) ?? selected[0];
  const ownWorks = (
    (works.data ?? []) as Array<{
      id: number;
      title: string;
      status: string;
      contentType: string;
      fileUrl: string | null;
    }>
  ).filter(
    w => w.status === "Published" && w.contentType === "audio" && w.fileUrl
  );
  const admin = user?.role === "admin";
  const play = (row: (typeof rows)[number]) => {
    if (currentTrackId === String(row.songId)) {
      togglePlay();
      return;
    }
    if (!row.audioUrl) return;
    addAndPlay({
      id: String(row.songId),
      title: row.title,
      artist: row.artist || row.name || "Creator",
      genre: "",
      audioUrl: row.audioUrl,
      artUrl: row.artwork || undefined,
      creatorId: row.creatorId,
      creatorHandle: row.artist || undefined,
      witnessId: row.witnessId || undefined,
    });
  };
  return (
    <main className="player-collections-page ln-edition-cabinet">
      <Helmet>
        <title>Player Collections · Living Nexus</title>
        <meta
          name="description"
          content="Follow and submit to curated Living Nexus player collections. Music, audiobooks, and the creators behind them."
        />
      </Helmet>
      <header className="player-cabinet-hero">
        <p className="player-eyebrow">Living Nexus · Creator editions</p>
        <h1>
          From your work
          <br />
          to someone's player.
        </h1>
        <p>
          Submit music or audiobook audio. Watch the collection take shape.
          Every selected work keeps its creator credit.
        </p>
      </header>
      {editions.isLoading && <p role="status">Loading collections…</p>}
      {editions.isError && (
        <div role="alert">
          Collections could not be loaded.{" "}
          <button onClick={() => void editions.refetch()}>Try again</button>
        </div>
      )}
      {!editions.isLoading && !editions.isError && !edition && (
        <p>
          No edition is open yet. The first collection will appear here when
          submissions open.
        </p>
      )}
      {admin && (
        <details className="player-panel player-cabinet-admin">
          <summary>Create an edition</summary>
          <label>
            Edition title
            <input
              value={editionTitle}
              onChange={e => setEditionTitle(e.target.value)}
              maxLength={200}
            />
          </label>
          <label>
            Description
            <textarea
              value={editionDescription}
              onChange={e => setEditionDescription(e.target.value)}
              maxLength={4000}
            />
          </label>
          <button
            className="player-action"
            disabled={
              create.isPending ||
              !editionTitle.trim() ||
              !editionDescription.trim()
            }
            onClick={() =>
              create.mutate({
                title: editionTitle,
                description: editionDescription,
                targetTracks: 50,
                capacityBytes: null,
              })
            }
          >
            Open submissions
          </button>
        </details>
      )}
      {edition && (
        <>
          <label className="player-edition-select player-cabinet-selector">
            Edition
            <select
              value={editionId}
              onChange={e => setEditionId(Number(e.target.value))}
            >
              {editions.data?.map(e => (
                <option value={e.id} key={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <div className="player-curation-grid">
            <aside className="player-panel player-device-panel player-cabinet-case">
              <PlayerDevicePreview
                title={active?.title}
                artist={active?.artist || active?.name || undefined}
                count={selected.length}
              />
              <p className="player-cabinet-overline">Edition cabinet</p>
              <h2 className="player-cabinet-title">{edition.title}</h2>
              <p className="player-cabinet-description">
                {edition.description}
              </p>
              <p>
                <strong className="player-cabinet-stat">
                  {selected.length} / {edition.targetTracks}
                </strong>{" "}
                tracks selected
              </p>
              <progress
                aria-label="Selected tracks"
                max={edition.targetTracks}
                value={selected.length}
              />
              <details className="player-technical-details">
                <summary>Technical notes and export</summary>
                <p className="player-muted">
                  50 four-minute MP3s at 320 kbps ≈{" "}
                  {(estimateMusicBytes(50) / 1e9).toFixed(2)} GB. Estimate only;
                  actual files and audiobooks vary. Device capacity has not been
                  verified.
                </p>
                <p className="player-muted">
                  Previewing plays through the existing site player. This
                  illustration does not write to a physical device.
                </p>
                <a href="/models/living-nexus-player-concept.3mf" download>
                  Download illustrative 3MF model
                </a>
                {admin && (
                  <button
                    className="player-action"
                    disabled={!selected.length || exportManifest.isPending}
                    onClick={() => exportManifest.mutate({ editionId })}
                  >
                    Export loading manifest
                  </button>
                )}
              </details>
            </aside>
            <section
              className="player-panel player-cabinet-works"
              aria-label="Vertical curation list"
            >
              <div className="player-list-tabs">
                <button
                  aria-pressed={tab === "selected"}
                  onClick={() => setTab("selected")}
                >
                  Edition selection ({selected.length})
                </button>
                <button
                  aria-pressed={tab === "submitted"}
                  onClick={() => setTab("submitted")}
                >
                  Submitted ({rows.length - selected.length})
                </button>
              </div>
              {list.isLoading && <p role="status">Loading works…</p>}
              {list.isError && (
                <p role="alert">
                  Could not load submissions.{" "}
                  <button onClick={() => void list.refetch()}>Retry</button>
                </p>
              )}
              {!list.isLoading && !list.isError && !visible.length && (
                <p>
                  {tab === "selected"
                    ? "No tracks selected yet. Explore submissions while creators and the curator prepare this edition."
                    : "No public submissions yet. Submit one of your published audio works below."}
                </p>
              )}
              <ol className="player-track-list">
                {visible.map(row => (
                  <li
                    key={row.id}
                    className={`player-artifact-card ${currentTrackId === String(row.songId) ? "is-active" : ""}`}
                  >
                    <div className="player-track-main">
                      <span className="player-slot player-artifact-slot">
                        {row.status === "selected"
                          ? String(row.position).padStart(2, "0")
                          : "·"}
                      </span>
                      {row.artwork && (
                        <img
                          className="player-artifact-art"
                          src={row.artwork}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      <div className="player-track-copy">
                        <Link
                          className="player-artifact-title"
                          href={`/song/${row.songId}`}
                        >
                          {row.title}
                        </Link>
                        <Link
                          className="player-muted"
                          href={`/creator/${row.artist || row.creatorId}`}
                        >
                          {row.artist || row.name || "Creator"}
                        </Link>
                        <small>
                          {row.kind === "audiobook"
                            ? "Audiobook audio"
                            : "Music"}{" "}
                          · {row.status} ·{" "}
                          {row.duration
                            ? `${Math.floor(row.duration / 60)}:${String(Math.floor(row.duration % 60)).padStart(2, "0")}`
                            : "Duration unavailable"}{" "}
                          ·{" "}
                          {row.lyrics
                            ? "Lyrics available"
                            : "No lyrics supplied"}
                        </small>
                        <span className="player-artifact-state">
                          {currentTrackId === String(row.songId)
                            ? state.isPlaying
                              ? "Listening now"
                              : "Paused in player"
                            : "Available to preview"}
                        </span>
                      </div>
                      <button
                        aria-label={`${currentTrackId === String(row.songId) && state.isPlaying ? "Pause" : "Preview"} ${row.title}`}
                        disabled={!row.audioUrl}
                        onClick={() => play(row)}
                      >
                        {currentTrackId === String(row.songId) &&
                        state.isPlaying
                          ? "Pause"
                          : "Preview"}
                      </button>
                    </div>
                    <p className="player-muted">{row.audienceNotes}</p>
                    {admin && (
                      <details>
                        <summary>Curate this work</summary>
                        <label>
                          Edition-specific permission and payment terms
                          <textarea
                            placeholder="Specify recordings, unit limit or term, credits, payment, and withdrawal treatment. Creator must accept before selection."
                            value={terms[row.id] ?? ""}
                            onChange={e =>
                              setTerms({ ...terms, [row.id]: e.target.value })
                            }
                            maxLength={10000}
                          />
                        </label>
                        <button
                          disabled={
                            offer.isPending ||
                            (terms[row.id]?.trim().length ?? 0) < 20
                          }
                          onClick={() =>
                            offer.mutate({
                              submissionId: row.id,
                              terms: terms[row.id],
                            })
                          }
                        >
                          Send terms for acceptance
                        </button>
                        <label>
                          Player slot (1–{edition.targetTracks})
                          <input
                            type="number"
                            min={1}
                            max={edition.targetTracks}
                            value={slots[row.id] ?? ""}
                            onChange={e =>
                              setSlots({ ...slots, [row.id]: e.target.value })
                            }
                          />
                        </label>
                        <button
                          disabled={select.isPending || !slots[row.id]}
                          onClick={() =>
                            select.mutate({
                              submissionId: row.id,
                              position: Number(slots[row.id]),
                            })
                          }
                        >
                          Select after creator acceptance
                        </button>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <section id="submit" className="player-panel">
            <p className="player-eyebrow">Creator opt-in · offer a work</p>
            <h2 className="player-cabinet-title">Submit to this collection</h2>
            <p>
              Submitting makes your work's listing public here. Product
              inclusion is a separate agreement. No AI access is granted by
              submission.
            </p>
            {!isAuthenticated ? (
              <a
                className="player-action"
                href={getLoginUrl("/player-collections#submit")}
              >
                Sign in to submit
              </a>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (consent && workId)
                    submit.mutate({
                      editionId,
                      songId: Number(workId),
                      kind,
                      audienceNotes: notes,
                      publicConsent: true,
                      displayTermsVersion: PLAYER_DISPLAY_TERMS_VERSION,
                    });
                }}
              >
                {works.isLoading && <p role="status">Loading your works…</p>}
                {works.isError && (
                  <p role="alert">
                    Could not load your archive.{" "}
                    <button type="button" onClick={() => void works.refetch()}>
                      Retry
                    </button>
                  </p>
                )}
                <label>
                  Your published audio work
                  <select
                    required
                    value={workId}
                    onChange={e => setWorkId(e.target.value)}
                  >
                    <option value="">Choose from your archive</option>
                    {ownWorks.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  <Link href="/manifest">Upload music or audiobook audio</Link>{" "}
                  through the existing archive workflow first. For books, submit
                  chapter audio in order; ebook conversion and narration are not
                  automatic.
                </p>
                <label>
                  Type
                  <select
                    value={kind}
                    onChange={e => setKind(e.target.value as typeof kind)}
                  >
                    <option value="music">Music</option>
                    <option value="audiobook">Audiobook / chapter</option>
                  </select>
                </label>
                <label>
                  Audience and content notes
                  <textarea
                    required
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    maxLength={1000}
                    placeholder="Themes, mature language, intended audience; for chapters include author, narrator, book title and chapter number."
                  />
                </label>
                <label className="player-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    required
                  />
                  {PLAYER_DISPLAY_CONSENT}
                </label>
                <button
                  className="player-action"
                  disabled={
                    !consent ||
                    !workId ||
                    !notes.trim() ||
                    submit.isPending ||
                    edition.status !== "open"
                  }
                >
                  Submit and display publicly
                </button>
              </form>
            )}
          </section>
          {isAuthenticated && (
            <section className="player-panel player-cabinet-ledger">
              <p className="player-cabinet-overline">Stewardship ledger</p>
              <h2 className="player-cabinet-title">
                My submissions and agreements
              </h2>
              {mine.isError && (
                <p role="alert">
                  Could not load your submission agreements.{" "}
                  <button onClick={() => void mine.refetch()}>Retry</button>
                </p>
              )}
              {mine.data?.map(row => (
                <article key={row.id}>
                  <h3>
                    {ownWorks.find(w => w.id === row.songId)?.title ||
                      `Work ${row.songId}`}{" "}
                    · {row.status}
                  </h3>
                  {row.productTerms && (
                    <>
                      <pre className="player-terms">{row.productTerms}</pre>
                      {row.acceptedTerms === row.productTerms ? (
                        <p>Current terms accepted.</p>
                      ) : (
                        row.status !== "withdrawn" && (
                          <>
                            <label className="player-consent">
                              <input
                                type="checkbox"
                                checked={rights[row.id] ?? false}
                                onChange={e =>
                                  setRights({
                                    ...rights,
                                    [row.id]: e.target.checked,
                                  })
                                }
                              />
                              I accept these exact product terms and confirm I
                              have permission from the relevant rights holders,
                              including author and narrator where applicable, to
                              authorize this use.
                            </label>
                            <button
                              disabled={!rights[row.id] || accept.isPending}
                              onClick={() =>
                                accept.mutate({
                                  submissionId: row.id,
                                  terms: row.productTerms!,
                                  rightsConfirmed: true,
                                })
                              }
                            >
                              Accept product terms
                            </button>
                          </>
                        )
                      )}
                    </>
                  )}
                  {row.status !== "withdrawn" && (
                    <button
                      disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate({ submissionId: row.id })}
                    >
                      Withdraw from display and future exports
                    </button>
                  )}
                </article>
              ))}
              <p className="player-muted">
                Withdrawal prevents future exports through this workflow. It
                cannot recall devices already shipped; the product agreement
                governs existing units.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
