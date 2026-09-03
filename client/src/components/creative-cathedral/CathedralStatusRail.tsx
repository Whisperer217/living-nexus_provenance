import { FileSearch, LockKeyhole, ShieldCheck } from "lucide-react";

export function CathedralStatusRail({
  hasAudio,
  suggestionCount,
  wid,
}: {
  hasAudio: boolean;
  suggestionCount: number;
  wid?: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Creative Cathedral status">
      <Status icon={FileSearch} label="Context" value={hasAudio ? "Audio named" : "Form only"} />
      <Status icon={ShieldCheck} label="Suggestions" value={String(suggestionCount)} />
      <Status icon={LockKeyhole} label="Authority" value={wid ? "WID sealed" : "Creator only"} />
    </div>
  );
}

function Status({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileSearch;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md px-2 py-2" style={{ border: "1px solid rgba(196,154,40,0.18)", background: "rgba(196,154,40,0.035)" }}>
      <Icon size={13} aria-hidden style={{ color: "var(--ln-gold)" }} />
      <p className="mt-1 text-[9px] uppercase tracking-[0.14em]" style={{ color: "rgba(245,237,216,0.45)" }}>{label}</p>
      <p className="truncate text-[11px]" style={{ color: "var(--ln-parchment)" }}>{value}</p>
    </div>
  );
}

