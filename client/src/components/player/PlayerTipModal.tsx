/**
 * PlayerTipModal
 * Reusable tip sheet used by both MobilePlayerPanel and PlayerBar.
 * Opens inline (no navigation) — fan picks amount, confirms, done.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, DollarSign, Loader2 } from "lucide-react";

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2500]; // cents

interface PlayerTipModalProps {
  songId: number;
  artistName: string;
  /** If undefined or null, tips are not enabled for this creator */
  stripeAccountId?: string | null;
  onClose: () => void;
}

export default function PlayerTipModal({
  songId,
  artistName,
  stripeAccountId,
  onClose,
}: PlayerTipModalProps) {
  const [selectedCents, setSelectedCents] = useState<number>(500);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.success(`Tipping ${artistName}`, { description: "Redirecting to checkout…" });
        window.open(data.url, "_blank");
        onClose();
      }
    },
    onError: (err) => {
        toast.error("Tip failed", { description: err.message });
    },
  });

  const amountCents = useCustom
    ? Math.round(parseFloat(customInput || "0") * 100)
    : selectedCents;

  const handleTip = () => {
    if (!stripeAccountId) return;
    if (amountCents < 100) {
      toast.error("Minimum tip is $1.00");
      return;
    }
    tipMutation.mutate({ songId, amountCents, origin: window.location.origin });
  };

  const tipsEnabled = !!stripeAccountId;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center md:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm mx-4 mb-4 md:mb-0 rounded-2xl p-5 flex flex-col gap-4"
        style={{
          background: "oklch(0.11 0.025 275)",
          border: "1px solid oklch(0.84 0.155 85 / 0.25)",
          boxShadow: "0 0 40px oklch(0.84 0.155 85 / 0.12), 0 8px 48px oklch(0 0 0 / 0.7)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}
            >
              Tip Creator
            </p>
            <p className="text-sm text-white/60 mt-0.5">{artistName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {!tipsEnabled ? (
          /* Tips not enabled */
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "oklch(0.14 0.02 275)", border: "1px solid oklch(0.22 0.02 275)" }}
          >
            <DollarSign size={24} className="mx-auto mb-2 opacity-30 text-white" />
            <p className="text-sm text-white/40">Tips not enabled yet</p>
            <p className="text-xs text-white/25 mt-1">
              {artistName} hasn't connected their payment account.
            </p>
          </div>
        ) : (
          <>
            {/* Preset amounts */}
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((cents) => (
                <button
                  key={cents}
                  onClick={() => { setSelectedCents(cents); setUseCustom(false); }}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: !useCustom && selectedCents === cents
                      ? "oklch(0.84 0.155 85)"
                      : "oklch(0.16 0.025 275)",
                    color: !useCustom && selectedCents === cents
                      ? "oklch(0.08 0.01 280)"
                      : "oklch(0.65 0.04 280)",
                    border: `1px solid ${!useCustom && selectedCents === cents ? "oklch(0.84 0.155 85)" : "oklch(0.24 0.02 275)"}`,
                  }}
                >
                  ${(cents / 100).toFixed(0)}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: useCustom ? "oklch(0.84 0.155 85)" : "oklch(0.16 0.025 275)",
                  color: useCustom ? "oklch(0.08 0.01 280)" : "oklch(0.65 0.04 280)",
                  border: `1px solid ${useCustom ? "oklch(0.84 0.155 85)" : "oklch(0.24 0.02 275)"}`,
                }}
              >
                Custom
              </button>
            </div>

            {/* Custom amount input */}
            {useCustom && (
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.01"
                  placeholder="Enter amount"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 bg-transparent border-b text-white text-sm py-1 outline-none"
                  style={{ borderColor: "oklch(0.84 0.155 85 / 0.4)" }}
                  autoFocus
                />
              </div>
            )}

            {/* Tip button */}
            <button
              onClick={handleTip}
              disabled={tipMutation.isPending || amountCents < 100}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "oklch(0.84 0.155 85)",
                color: "oklch(0.08 0.01 280)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {tipMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Processing…</>
              ) : (
                <>
                  <DollarSign size={14} />
                  Tip {artistName} {amountCents >= 100 ? `$${(amountCents / 100).toFixed(0)}` : ""}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
