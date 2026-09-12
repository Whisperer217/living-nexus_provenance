import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusMark({ value }: { value: string }) {
  const tone = value === "inspection_ready" || value === "confirmed" || value === "private_review"
    ? "var(--ln-gold)"
    : value === "failed" || value === "expired" || value === "dismissed"
      ? "var(--ln-smoke)"
      : "var(--ln-bone)";
  return <span className="inline-flex rounded-full border px-2.5 py-1 text-xs tracking-[0.12em] uppercase" style={{ borderColor: "rgba(196,154,40,0.28)", color: tone }}>{value.replaceAll("_", " ")}</span>;
}

/**
 * I2 creator-private review surface. This page never writes a canonical Work,
 * WID, provenance event, publication status, PNA record, or provider request.
 */
export default function CoreIngestionReviewPage() {
  const [commissionId, setCommissionId] = useState("");
  const [submittedCommissionId, setSubmittedCommissionId] = useState("");
  const [confirmation, setConfirmation] = useState<{ id: string; token: string; expiresAt: Date | string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const isValidCommissionId = UUID_PATTERN.test(submittedCommissionId);
  const commissionQuery = trpc.coreIngestion.get.useQuery(
    { commissionId: submittedCommissionId },
    { enabled: isValidCommissionId, retry: false },
  );
  const offerProposal = trpc.coreIngestion.offerPrivateDraftProposal.useMutation({
    onSuccess: async () => {
      setNotice("A private technical proposal is ready for your review. Nothing has been registered or published.");
      await utils.coreIngestion.get.invalidate({ commissionId: submittedCommissionId });
    },
  });
  const issueConfirmation = trpc.coreIngestion.issuePrivateDraftConfirmation.useMutation({
    onSuccess: (result) => {
      setConfirmation({ id: result.confirmationId, token: result.confirmationToken, expiresAt: result.expiresAt });
      setNotice("Your one-time confirmation is ready in this browser session. Review the proposal, then explicitly create the private Commission Draft.");
    },
  });
  const confirmDraft = trpc.coreIngestion.confirmPrivateDraft.useMutation({
    onSuccess: async () => {
      setConfirmation(null);
      setNotice("Private Commission Draft created. It is not a Work, has no WID, and has not been published.");
      await utils.coreIngestion.get.invalidate({ commissionId: submittedCommissionId });
    },
  });
  const dismissProposal = trpc.coreIngestion.dismissPrivateDraftProposal.useMutation({
    onSuccess: async () => {
      setConfirmation(null);
      setNotice("The proposal was dismissed. No Work or provenance record was changed.");
      await utils.coreIngestion.get.invalidate({ commissionId: submittedCommissionId });
    },
  });

  const detail = commissionQuery.data;
  const proposal = detail?.proposals[0] ?? null;
  const receipt = detail?.receipts[0] ?? null;
  const technicalFacts = useMemo(() => receipt?.measuredFacts ?? null, [receipt]);
  const actionBusy = offerProposal.isPending || issueConfirmation.isPending || confirmDraft.isPending || dismissProposal.isPending;

  function loadCommission(event: FormEvent) {
    event.preventDefault();
    setConfirmation(null);
    setNotice(null);
    setSubmittedCommissionId(commissionId.trim());
  }

  const actionError = offerProposal.error ?? issueConfirmation.error ?? confirmDraft.error ?? dismissProposal.error;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-14" aria-labelledby="ingestion-review-title">
      <div className="mb-8 border-b pb-6" style={{ borderColor: "rgba(196,154,40,0.18)" }}>
        <p className="text-xs tracking-[0.20em] uppercase" style={{ color: "rgba(196,154,40,0.62)", fontFamily: "var(--font-display)" }}>Creator-private intake</p>
        <h1 id="ingestion-review-title" className="mt-3 text-[length:var(--text-h2)]" style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-display)" }}>Ingestion Commission Review</h1>
        <p className="mt-3 max-w-2xl text-[length:var(--text-base)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>
          Review a storage-verified technical receipt, then decide whether to create a private Commission Draft. This does not register a Work, issue a Witness ID, publish, or provide AI context.
        </p>
      </div>

      <section className="museum-card p-5 sm:p-6" aria-labelledby="commission-lookup-title">
        <h2 id="commission-lookup-title" className="text-[length:var(--text-h4)]" style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-editorial)" }}>Open a Commission</h2>
        <form onSubmit={loadCommission} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="commission-id">Commission ID</label>
          <input
            id="commission-id"
            value={commissionId}
            onChange={(event) => setCommissionId(event.target.value)}
            placeholder="Paste your private Commission ID"
            className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 font-mono text-sm outline-none focus:ring-2"
            style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-parchment)", boxShadow: "none" }}
            autoComplete="off"
          />
          <button type="submit" className="rounded-md border px-4 py-2 text-sm tracking-[0.12em] uppercase transition-colors hover:bg-[rgba(196,154,40,0.12)] disabled:opacity-50" style={{ borderColor: "var(--ln-gold)", color: "var(--ln-gold)", fontFamily: "var(--font-display)" }} disabled={!UUID_PATTERN.test(commissionId.trim())}>
            Review
          </button>
        </form>
        {submittedCommissionId && !isValidCommissionId && <p className="mt-3 text-sm" style={{ color: "var(--ln-smoke)" }}>Enter a valid Commission ID to load a creator-owned record.</p>}
        {commissionQuery.isLoading && <p className="mt-3 text-sm" style={{ color: "var(--ln-smoke)" }}>Opening your private Commission…</p>}
        {commissionQuery.error && <p className="mt-3 text-sm" role="alert" style={{ color: "var(--ln-gold-hot)" }}>{commissionQuery.error.message}</p>}
      </section>

      {detail && (
        <div className="mt-6 space-y-6">
          <section className="museum-card p-5 sm:p-6" aria-labelledby="inspection-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.20em] uppercase" style={{ color: "rgba(196,154,40,0.62)", fontFamily: "var(--font-display)" }}>Commission state</p>
                <h2 id="inspection-title" className="mt-2 text-[length:var(--text-h4)]" style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-editorial)" }}>Technical inspection</h2>
              </div>
              <StatusMark value={detail.commission.status} />
            </div>
            {receipt ? (
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt style={{ color: "var(--ln-smoke)" }}>Root asset hash</dt><dd className="mt-1 break-all font-mono" style={{ color: "var(--ln-bone)" }}>{receipt.rootAssetHash}</dd></div>
                <div><dt style={{ color: "var(--ln-smoke)" }}>Receipt hash</dt><dd className="mt-1 break-all font-mono" style={{ color: "var(--ln-bone)" }}>{receipt.receiptHash}</dd></div>
                <div><dt style={{ color: "var(--ln-smoke)" }}>Inspection version</dt><dd className="mt-1" style={{ color: "var(--ln-bone)" }}>{receipt.inspectionVersion}</dd></div>
                <div><dt style={{ color: "var(--ln-smoke)" }}>Receipt created</dt><dd className="mt-1" style={{ color: "var(--ln-bone)" }}>{displayDate(receipt.createdAt)}</dd></div>
                <div className="sm:col-span-2"><dt style={{ color: "var(--ln-smoke)" }}>Measured technical facts</dt><dd className="mt-2 overflow-x-auto rounded border p-3 font-mono text-xs" style={{ borderColor: "rgba(196,154,40,0.14)", color: "var(--ln-bone)", background: "rgba(0,0,0,0.18)" }}><pre>{JSON.stringify(technicalFacts, null, 2)}</pre></dd></div>
              </dl>
            ) : (
              <p className="mt-4 text-sm" style={{ color: "var(--ln-smoke)" }}>No successful receipt exists yet. The worker schedule remains inactive until separately authorized.</p>
            )}
          </section>

          <section className="museum-card p-5 sm:p-6" aria-labelledby="private-draft-title">
            <p className="text-xs tracking-[0.20em] uppercase" style={{ color: "rgba(196,154,40,0.62)", fontFamily: "var(--font-display)" }}>Creator decision</p>
            <h2 id="private-draft-title" className="mt-2 text-[length:var(--text-h4)]" style={{ color: "var(--ln-parchment)", fontFamily: "var(--font-editorial)" }}>Private Commission Draft</h2>
            {detail.privateDraft ? (
              <div className="mt-4 rounded border p-4" style={{ borderColor: "rgba(196,154,40,0.28)", background: "rgba(196,154,40,0.06)" }}>
                <div className="flex flex-wrap items-center justify-between gap-3"><StatusMark value={detail.privateDraft.draftState} /><span className="font-mono text-xs" style={{ color: "var(--ln-smoke)" }}>{detail.privateDraft.privateDraftId}</span></div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>This is creator-private working state. It is not a canonical Work, has not issued a WID, and has not been published.</p>
              </div>
            ) : detail.commission.status !== "inspection_ready" || !receipt ? (
              <p className="mt-4 text-sm" style={{ color: "var(--ln-smoke)" }}>A completed deterministic inspection is required before you may review a private Draft proposal.</p>
            ) : !proposal || proposal.status === "expired" || proposal.status === "dismissed" ? (
              <div className="mt-4"><p className="text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>Prepare a bounded proposal from the current receipt. It contains technical facts only and remains private to your Creator Domain.</p><button onClick={() => offerProposal.mutate({ commissionId: detail.commission.commissionId })} disabled={actionBusy} className="mt-4 rounded-md border px-4 py-2 text-sm tracking-[0.12em] uppercase disabled:opacity-50" style={{ borderColor: "var(--ln-gold)", color: "var(--ln-gold)", fontFamily: "var(--font-display)" }}>Prepare private proposal</button></div>
            ) : proposal.status === "offered" ? (
              <div className="mt-4 rounded border p-4" style={{ borderColor: "rgba(196,154,40,0.20)", background: "rgba(0,0,0,0.16)" }}>
                <div className="flex flex-wrap items-center justify-between gap-3"><StatusMark value={proposal.status} /><span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Review expires {displayDate(proposal.expiresAt)}</span></div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>By confirming, you create only a private Commission Draft bound to this exact proposal, receipt, and asset hash. You may still choose later whether to register a Work through the existing separate path.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {!confirmation ? <button onClick={() => issueConfirmation.mutate({ proposalId: proposal.proposalId })} disabled={actionBusy} className="rounded-md border px-4 py-2 text-sm tracking-[0.12em] uppercase disabled:opacity-50" style={{ borderColor: "var(--ln-gold)", color: "var(--ln-gold)", fontFamily: "var(--font-display)" }}>Ready private confirmation</button> : <button onClick={() => confirmDraft.mutate({ proposalId: proposal.proposalId, confirmationId: confirmation.id, confirmationToken: confirmation.token })} disabled={actionBusy} className="rounded-md border px-4 py-2 text-sm tracking-[0.12em] uppercase disabled:opacity-50" style={{ borderColor: "var(--ln-gold-hot)", color: "var(--ln-gold-hot)", fontFamily: "var(--font-display)" }}>Create private Draft</button>}
                  <button onClick={() => dismissProposal.mutate({ proposalId: proposal.proposalId })} disabled={actionBusy} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-bone)" }}>Dismiss proposal</button>
                </div>
                {confirmation && <p className="mt-3 text-xs" style={{ color: "var(--ln-smoke)" }}>One-time confirmation held only in this page session until {displayDate(confirmation.expiresAt)}. It is never displayed or stored in the browser.</p>}
              </div>
            ) : <p className="mt-4 text-sm" style={{ color: "var(--ln-smoke)" }}>This proposal is {proposal.status.replaceAll("_", " ")}.</p>}
            {(notice || actionError) && <p className="mt-4 text-sm" role={actionError ? "alert" : "status"} style={{ color: actionError ? "var(--ln-gold-hot)" : "var(--ln-bone)" }}>{actionError?.message ?? notice}</p>}
          </section>
        </div>
      )}

      <p className="mt-8 text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Need to return to canonical registration? Use <Link href="/manifest" className="underline decoration-[var(--ln-gold-dim)] underline-offset-4" style={{ color: "var(--ln-gold)" }}>Register</Link> only when you are ready to use the existing Work/WID process.</p>
    </main>
  );
}
