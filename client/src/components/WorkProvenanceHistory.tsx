import { Clock3, Feather, ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatHistoricalDate } from "@shared/workHistoricalDates";

type WorkProvenanceHistoryProps = {
  songId: number;
};

function describeChange(change: any) {
  const label = change?.field === "creatorReleaseDate" ? "Original Release Date" : "Creation Date";
  const before = formatHistoricalDate(change?.previous) ?? "not set";
  const after = formatHistoricalDate(change?.current) ?? "not set";
  return `${label}: ${before} → ${after}`;
}

export function WorkProvenanceHistory({ songId }: WorkProvenanceHistoryProps) {
  const { data, isLoading } = trpc.songs.getPublicCreatorDateHistory.useQuery(
    { songId },
    { enabled: songId > 0, staleTime: 60_000 }
  );
  const events = data?.events ?? [];

  return (
    <section className="mt-8 border-t pt-6" style={{ borderColor: "rgba(196,154,40,0.2)" }} aria-labelledby="work-provenance-history">
      <p className="font-heading text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}>
        Public record · read-only
      </p>
      <h3 id="work-provenance-history" className="mt-2 font-heading text-xl" style={{ color: "var(--ln-parchment)" }}>
        Provenance History
      </h3>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 52%, transparent)" }}>
        Creator-declared chronology and recorded amendments. WID and publication custody remain separate system records.
      </p>

      {isLoading ? (
        <p className="mt-4 text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}>Reading chronology record…</p>
      ) : events.length === 0 ? (
        <div className="mt-4 flex gap-3 rounded border p-3" style={{ borderColor: "rgba(196,154,40,0.18)", background: "rgba(196,154,40,0.04)" }}>
          <ScrollText className="mt-0.5 size-4 shrink-0" style={{ color: "var(--ln-gold)" }} aria-hidden="true" />
          <p className="text-xs leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 58%, transparent)" }}>
            No creator-date amendments have been recorded for this Work.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-4 border-l pl-4" style={{ borderColor: "rgba(196,154,40,0.32)" }}>
          {events.map((event: any) => {
            const changes = Array.isArray(event.eventData?.changedFields) ? event.eventData.changedFields : [];
            const declaration = event.eventData ?? {};
            return (
              <li key={`${event.eventType}-${event.occurredAt}`} className="relative">
                <span className="absolute -left-[1.47rem] top-0 grid size-5 place-items-center rounded-full border" style={{ borderColor: "rgba(196,154,40,0.55)", background: "var(--ln-void, #0d0a12)" }}>
                  {event.eventType === "creator_historical_dates_declared" ? <Feather className="size-3" style={{ color: "var(--ln-gold)" }} aria-hidden="true" /> : <Clock3 className="size-3" style={{ color: "var(--ln-gold)" }} aria-hidden="true" />}
                </span>
                <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>{event.eventLabel ?? "Creator chronology record"}</p>
                {event.eventType === "creator_historical_dates_declared" ? (
                  <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 58%, transparent)" }}>
                    {formatHistoricalDate(declaration.creationDate) && <>Created {formatHistoricalDate(declaration.creationDate)}</>}
                    {formatHistoricalDate(declaration.creationDate) && formatHistoricalDate(declaration.originalReleaseDate) && " · "}
                    {formatHistoricalDate(declaration.originalReleaseDate) && <>Originally released {formatHistoricalDate(declaration.originalReleaseDate)}</>}
                  </p>
                ) : changes.map((change: any) => (
                  <p key={`${change.field}-${change.current}`} className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 58%, transparent)" }}>
                    {describeChange(change)}
                  </p>
                ))}
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: "color-mix(in srgb, var(--ln-parchment) 38%, transparent)" }}>
                  Creator declaration · {new Date(event.occurredAt).toLocaleDateString()}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
