import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Clock, Hash } from "lucide-react";

export default function WIDLookup() {
  const params = useParams<{ wid: string }>();
  const [, navigate] = useLocation();
  const wid = params.wid ?? "";

  const { data, isLoading, error } = trpc.wids.lookup.useQuery({ wid }, { enabled: !!wid });

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: "var(--ln-obsidian)" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-sm"
            style={{ color: "var(--ln-smoke)" }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="ln-wid-badge">WID LOOKUP</div>
        </div>

        {/* WID being looked up */}
        <div className="ln-panel p-4 mb-6">
          <div className="ln-panel-header mb-2">Work Identity Document</div>
          <div className="ln-hash break-all" style={{ color: "var(--ln-parchment)" }}>{wid}</div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="ln-panel p-8 text-center">
            <div className="ln-hash animate-pulse" style={{ color: "var(--ln-smoke)" }}>
              Querying ledger…
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="ln-panel p-6 border-red-900/40">
            <p className="text-sm" style={{ color: "#e57373" }}>
              Error querying ledger: {error.message}
            </p>
          </div>
        )}

        {/* Not found */}
        {!isLoading && !error && data === null && (
          <div className="ln-panel p-8 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--ln-smoke)" }} />
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>
              No WID found for this hash. It may not have been anchored yet.
            </p>
          </div>
        )}

        {/* Found */}
        {data && (
          <div className="space-y-4">
            {/* Status */}
            <div className="ln-panel p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--ln-gold)" }}>
                  Anchored &amp; Verified
                </div>
                <div className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                  This work has been sealed into the Living Nexus ledger.
                </div>
              </div>
            </div>

            {/* Content hash */}
            <div className="ln-panel p-4">
              <div className="ln-panel-header mb-2 flex items-center gap-2">
                <Hash className="w-3 h-3" />
                Content Hash
              </div>
              <div className="ln-hash break-all" style={{ color: "var(--ln-parchment)" }}>
                {data.contentHash}
              </div>
            </div>

            {/* Creator */}
            {data.creator && (
              <div className="ln-panel p-4">
                <div className="ln-panel-header mb-2">Creator</div>
                <div className="text-sm" style={{ color: "var(--ln-parchment)" }}>
                  {data.creator.name ?? `Creator #${data.creator.id}`}
                </div>
              </div>
            )}

            {/* Event details */}
            {data.event && (
              <div className="ln-panel p-4">
                <div className="ln-panel-header mb-3">Ledger Event</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Event ID</span>
                    <span className="ln-hash text-xs break-all max-w-xs text-right" style={{ color: "var(--ln-parchment)" }}>
                      {data.event.eventId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Action</span>
                    <span className="ln-wid-badge">{data.event.actionType}</span>
                  </div>
                  {data.event.sessionLabel && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Session</span>
                      <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{data.event.sessionLabel}</span>
                    </div>
                  )}
                  {data.event.origin && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Origin</span>
                      <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>
                        {(data.event.origin as { origin_type: string }).origin_type}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--ln-smoke)" }}>
                      <Clock className="w-3 h-3" /> Anchored
                    </span>
                    <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>
                      {new Date(data.event.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="ln-panel p-4">
              <div className="ln-panel-header mb-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                WID Created
              </div>
              <div className="text-sm" style={{ color: "var(--ln-parchment)" }}>
                {new Date(data.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
