import { Check, Image, Loader2, Save } from "lucide-react";

export interface PNAVisualProposal {
  url: string;
  prompt: string;
  savedQuiverId?: number;
}

interface PNAVisualProposalCardProps {
  proposal: PNAVisualProposal;
  isSaving?: boolean;
  onSave: () => void;
}

/**
 * An unsaved PNA visual is deliberately a proposal, not a registry asset.
 * The creator must use the explicit save control before Quiver persistence.
 */
export function PNAVisualProposalCard({ proposal, isSaving = false, onSave }: PNAVisualProposalCardProps) {
  const isSaved = Boolean(proposal.savedQuiverId);

  return (
    <section
      className="mt-3 overflow-hidden rounded-xl"
      style={{
        background: "color-mix(in srgb, var(--ln-panel) 92%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ln-gold) 34%, transparent)",
      }}
      aria-label="Private visual proposal"
    >
      <img
        src={proposal.url}
        alt="Private generated cover-art proposal"
        className="block aspect-square w-full object-cover"
        loading="lazy"
      />
      <div className="p-3">
        <div className="flex items-center gap-1.5" style={{ color: "var(--ln-gold)" }}>
          <Image size={12} aria-hidden="true" />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "0.48rem", letterSpacing: "0.11em" }}>
            {isSaved ? "SAVED TO PRIVATE QUIVER" : "PRIVATE VISUAL PROPOSAL"}
          </span>
        </div>
        <p
          className="mt-2 line-clamp-3"
          style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-body)", fontSize: "0.74rem", lineHeight: 1.45 }}
        >
          {proposal.prompt}
        </p>
        {isSaved ? (
          <div className="mt-3 flex items-center gap-1.5" style={{ color: "var(--ln-bone)", fontFamily: "var(--font-body)", fontSize: "0.75rem" }}>
            <Check size={14} aria-hidden="true" />
            Private asset preserved. Nothing has been attached, registered, or published.
          </div>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--ln-gold)", color: "var(--ln-void)", fontFamily: "var(--font-display)", fontSize: "0.55rem", letterSpacing: "0.08em" }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
            {isSaving ? "SAVING PRIVATELY" : "SAVE TO QUIVER PRIVATELY"}
          </button>
        )}
      </div>
    </section>
  );
}
