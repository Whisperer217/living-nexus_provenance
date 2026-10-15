import { useState } from "react";
import { AlertTriangle, ArchiveRestore, ClipboardCheck, Landmark, Loader2, ScrollText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Authority = {
  id: number;
  scope: {
    viewRegistry: boolean;
    exportRecords: boolean;
    managePublicPresentation: boolean;
    appendMemorialStatement: boolean;
  };
  grantedAt: Date | string;
} | null | undefined;

type CustodyEvent = {
  id: number;
  eventType: string;
  createdAt: Date | string;
};

export function LegacyStewardshipPanel({
  creatorId,
  creatorName,
  authority,
}: {
  creatorId: number;
  creatorName: string;
  authority: Authority;
}) {
  const utils = trpc.useUtils();
  const [memorialBody, setMemorialBody] = useState("");
  const reconciliation = trpc.legacyStewardship.reconcile.useQuery(
    { creatorId },
    { enabled: false, retry: false },
  );
  const events = trpc.legacyStewardship.events.useQuery(
    { creatorId },
    { enabled: Boolean(authority), staleTime: 30_000 },
  );
  const recordReconciliation = trpc.legacyStewardship.recordReconciliation.useMutation({
    onSuccess: () => {
      utils.legacyStewardship.events.invalidate({ creatorId });
      toast.success("Registry reconciliation recorded in the custody ledger");
    },
    onError: (error) => toast.error(error.message),
  });
  const appendMemorial = trpc.legacyStewardship.appendMemorial.useMutation({
    onSuccess: (result) => {
      utils.legacyStewardship.publicMemorials.invalidate({ creatorId });
      utils.legacyStewardship.events.invalidate({ creatorId });
      setMemorialBody("");
      toast.success(result.created ? "Memorial notice published as an append-only record" : "This exact memorial notice is already recorded");
    },
    onError: (error) => toast.error(error.message),
  });

  if (!authority) return null;

  const report = reconciliation.data;
  const issues = report
    ? report.missingCanonicalWids.length + report.malformedCanonicalWids.length + report.duplicateCanonicalWids.length
    : 0;
  const custodyEvents = (events.data ?? []) as CustodyEvent[];

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10" aria-labelledby="legacy-stewardship-heading">
      <div
        className="rounded-2xl p-5 sm:p-7"
        style={{
          border: "1px solid color-mix(in srgb, var(--ln-gold) 52%, transparent)",
          background: "color-mix(in srgb, var(--ln-coal) 89%, var(--ln-void))",
          boxShadow: "0 18px 42px rgba(0,0,0,.28), inset 0 1px 0 color-mix(in srgb, var(--ln-parchment) 10%, transparent)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="flex gap-3">
            <div className="shrink-0 rounded-full p-2.5 h-fit" style={{ background: "color-mix(in srgb, var(--ln-gold) 15%, transparent)", color: "var(--ln-gold)" }} aria-hidden="true">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.19em]" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold-hot, var(--ln-gold))" }}>Authorized stewardship</p>
              <h2 id="legacy-stewardship-heading" className="mt-1 text-2xl" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                {creatorName} legacy record
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "color-mix(in srgb, var(--ln-parchment) 69%, transparent)" }}>
                This limited authority preserves access to the Registry record and append-only memorial notices. It does not transfer authorship, ownership, WIDs, hashes, testimony, rights, payments, account access, or private records.
              </p>
            </div>
          </div>
          <div className="rounded-xl px-3 py-2 text-xs shrink-0" style={{ color: "var(--ln-parchment)", border: "1px solid color-mix(in srgb, var(--ln-gold) 30%, transparent)", background: "rgba(0,0,0,.18)" }}>
            Active grant
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Authorized stewardship scope">
          {[
            ["Registry inspection", authority.scope.viewRegistry],
            ["Record export", authority.scope.exportRecords],
            ["Public presentation", authority.scope.managePublicPresentation],
            ["Append memorial", authority.scope.appendMemorialStatement],
          ].map(([label, allowed]) => (
            <div key={String(label)} className="rounded-xl px-3 py-3 text-sm" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 18%, transparent)", background: "rgba(0,0,0,.14)", color: allowed ? "var(--ln-parchment)" : "color-mix(in srgb, var(--ln-parchment) 42%, transparent)" }}>
              <span className="mr-2" aria-hidden="true" style={{ color: allowed ? "var(--ln-gold)" : undefined }}>{allowed ? "✓" : "—"}</span>{label}
            </div>
          ))}
        </div>

        {authority.scope.viewRegistry && (
          <div className="mt-7 rounded-xl p-4 sm:p-5" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 22%, transparent)", background: "rgba(0,0,0,.16)" }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}><ClipboardCheck size={16} style={{ color: "var(--ln-gold)" }} /> Registry reconciliation</h3>
                <p className="mt-1 text-sm" style={{ color: "color-mix(in srgb, var(--ln-parchment) 58%, transparent)" }}>Read-only inspection of current Work/WID continuity. Recording a result writes only a custody-ledger digest.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => reconciliation.refetch()} disabled={reconciliation.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm disabled:opacity-60" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 45%, transparent)", color: "var(--ln-parchment)" }}>
                  {reconciliation.isFetching ? <Loader2 className="animate-spin" size={15} /> : <ArchiveRestore size={15} />} Inspect
                </button>
                <button type="button" onClick={() => recordReconciliation.mutate({ creatorId })} disabled={recordReconciliation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm disabled:opacity-60" style={{ background: "var(--ln-gold-hot, var(--ln-gold))", color: "#100d08" }}>
                  {recordReconciliation.isPending ? <Loader2 className="animate-spin" size={15} /> : <ScrollText size={15} />} Record digest
                </button>
              </div>
            </div>
            {report && (
              <div className="mt-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ["Works", report.totalWorks],
                    ["Canonical WIDs", report.canonicalWidCount],
                    ["Published", report.publishedWorks],
                    ["Continuity flags", issues],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg p-3" style={{ background: "rgba(0,0,0,.22)" }}>
                      <div className="text-xl tabular-nums" style={{ color: String(label) === "Continuity flags" && Number(value) > 0 ? "#f2b577" : "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>{value}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.1em]" style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }}>{label}</div>
                    </div>
                  ))}
                </div>
                {issues > 0 && <p className="mt-4 flex gap-2 text-sm leading-6" style={{ color: "#f2b577" }}><AlertTriangle className="shrink-0 mt-0.5" size={16} />Inspection found WID continuity flags. No record was changed; use the steward export/review process before any proposed correction.</p>}
                <p className="mt-4 break-all text-xs leading-5" style={{ color: "color-mix(in srgb, var(--ln-parchment) 43%, transparent)" }}>Snapshot SHA-256: {report.snapshotSha256}</p>
              </div>
            )}
          </div>
        )}

        {authority.scope.appendMemorialStatement && (
          <div className="mt-5 rounded-xl p-4 sm:p-5" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 22%, transparent)", background: "rgba(0,0,0,.16)" }}>
            <h3 className="flex items-center gap-2 text-base" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}><Landmark size={16} style={{ color: "var(--ln-gold)" }} /> Append memorial notice</h3>
            <p className="mt-1 text-sm leading-6" style={{ color: "color-mix(in srgb, var(--ln-parchment) 58%, transparent)" }}>Publishing is permanent in the custody ledger. This creates a steward-attributed notice, never a new Creator testimony or Work provenance entry.</p>
            <label className="sr-only" htmlFor="legacy-memorial-body">Memorial notice</label>
            <textarea id="legacy-memorial-body" value={memorialBody} onChange={(event) => setMemorialBody(event.target.value)} maxLength={8_000} rows={7} placeholder="Enter the memorial notice only after confirming its wording…" className="mt-4 w-full rounded-xl p-3 text-base leading-6 outline-none focus-visible:ring-2" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 35%, transparent)", color: "var(--ln-parchment)", background: "rgba(0,0,0,.34)", resize: "vertical" }} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}>{memorialBody.trim().length}/8,000 characters · Minimum 40 characters</p>
              <button type="button" onClick={() => appendMemorial.mutate({ creatorId, body: memorialBody.trim() })} disabled={appendMemorial.isPending || memorialBody.trim().length < 40} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm disabled:opacity-50" style={{ background: "var(--ln-gold-hot, var(--ln-gold))", color: "#100d08" }}>
                {appendMemorial.isPending ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />} Publish append-only notice
              </button>
            </div>
          </div>
        )}

        {custodyEvents.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm" style={{ color: "var(--ln-gold)" }}>View stewardship custody activity ({custodyEvents.length})</summary>
            <ol className="mt-3 space-y-2" aria-label="Legacy Stewardship custody activity">
              {custodyEvents.map((event) => (
                <li key={event.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(0,0,0,.15)", color: "color-mix(in srgb, var(--ln-parchment) 70%, transparent)" }}>
                  <span style={{ color: "var(--ln-parchment)" }}>{event.eventType.replaceAll("_", " ")}</span> · {event.createdAt ? new Date(event.createdAt).toLocaleString() : "recorded"}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}
