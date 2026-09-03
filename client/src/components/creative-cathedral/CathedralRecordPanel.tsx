import { LockKeyhole, ShieldCheck } from "lucide-react";

export function CathedralRecordPanel({ wid }: { wid?: string | null }) {
  return (
    <section className="space-y-3 rounded-md p-4" style={{ border: "1px solid rgba(196,154,40,0.28)", background: "rgba(12,10,6,0.94)" }}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={15} aria-hidden style={{ color: "var(--ln-gold)" }} />
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>Authority boundary</h4>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(245,237,216,0.8)" }}>
        Cathedral suggestions are private working state. Only the existing Register controls can seal or publish the Work.
      </p>
      <div className="flex min-w-0 items-center gap-2 rounded px-3 py-2.5 text-sm" style={{ background: "rgba(0,0,0,0.58)", color: "var(--ln-parchment)" }}>
        <LockKeyhole size={12} aria-hidden style={{ color: "var(--ln-gold)" }} />
        {wid ? <span className="truncate font-mono">WID locked · {wid}</span> : <span>No WID has been issued from this workspace.</span>}
      </div>
    </section>
  );
}
