import { Checkbox } from "@/components/ui/checkbox";
import { FileAudio2, LockKeyhole } from "lucide-react";

export function CathedralContextGate({
  sources,
  consented,
  onConsentedChange,
}: {
  sources: Array<{ kind: string; label: string }>;
  consented: boolean;
  onConsentedChange: (value: boolean) => void;
}) {
  return (
    <section className="space-y-4 rounded-md p-4" style={{ border: "1px solid var(--ln-cathedral-border)", background: "var(--ln-cathedral-tint)" }}>
      <div className="flex items-start gap-2">
        <LockKeyhole size={15} aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--ln-gold)" }} />
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>Approve context</h4>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ln-cathedral-text-muted)" }}>
            The assistant will inspect only the named facts below. It cannot access your account, publish, seal a WID, or change provenance.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {sources.map((source) => (
          <div key={`${source.kind}:${source.label}`} className="flex min-w-0 items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--ln-cathedral-text)" }}>
            <FileAudio2 size={14} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--ln-gold)" }} />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{source.label}</span>
          </div>
        ))}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--ln-cathedral-text)" }}>
        <Checkbox
          checked={consented}
          onCheckedChange={(value) => onConsentedChange(value === true)}
          aria-label="Approve the listed context for one media-fact review"
        />
        <span>I approve this listed context for one private media-fact review.</span>
      </label>
    </section>
  );
}
