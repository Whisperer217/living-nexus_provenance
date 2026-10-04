import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Archive, BrainCircuit, Eye, Image, Layers, Music2, ShieldCheck, Sparkles, Wand2, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { PNA_PROFILE_IDS, PNA_STEWARDSHIP_PROFILES, type PNAProfileId } from "@shared/pnaGovernance";

const ICONS: Record<PNAProfileId, typeof Sparkles> = {
  guide: Sparkles,
  conductor: Music2,
  witness: Eye,
  custodian: ShieldCheck,
  archivist: Archive,
  vision: Image,
  research: BrainCircuit,
};

function SettingsSubNav() {
  const [location] = useLocation();
  const items = [
    ["/settings/billing", "Billing"],
    ["/settings/playback", "Playback"],
    ["/settings/payment-methods", "Payment Methods"],
    ["/settings/stewardship", "PNA Stewardship"],
  ] as const;
  return <nav className="flex flex-wrap gap-1" aria-label="Settings sections">{items.map(([path, label]) => <Link key={path} href={path} className="flex min-h-10 items-center rounded-lg px-3 font-display text-[var(--text-xs)] tracking-[0.08em] uppercase focus-visible:outline-none focus-visible:ring-2" style={{ background: location === path ? "color-mix(in srgb, var(--ln-gold) 14%, transparent)" : "transparent", border: `1px solid ${location === path ? "color-mix(in srgb, var(--ln-gold) 34%, transparent)" : "transparent"}`, color: location === path ? "var(--ln-gold)" : "var(--ln-smoke)" }}>{label}</Link>)}</nav>;
}

function Toggle({ checked, label, description, disabled, onChange }: { checked: boolean; label: string; description: string; disabled?: boolean; onChange: (next: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-iron)", border: "1px solid var(--ln-panel-border)" }}><span className="mt-0.5 flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors" style={{ background: checked ? "var(--ln-gold)" : "var(--ln-ash)" }}><span className="h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }} /></span><span><span className="block font-display text-[var(--text-xs)] tracking-[0.1em] uppercase" style={{ color: "var(--ln-bone)" }}>{label}</span><span className="mt-1 block font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{description}</span></span></button>;
}

export default function PNASettingsPage() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const settingsQuery = trpc.pnaGovernance.profileSettings.useQuery(undefined, { enabled: Boolean(user) });
  const save = trpc.pnaGovernance.saveProfileSetting.useMutation({
    onSuccess: () => { void utils.pnaGovernance.profileSettings.invalidate(); toast.success("Stewardship profile updated."); },
    onError: (error) => toast.error(error.message ?? "Stewardship setting could not be saved."),
  });
  const settingsById = useMemo(() => new Map((settingsQuery.data ?? []).map((setting) => [setting.id, setting])), [settingsQuery.data]);

  if (loading) return <div className="min-h-screen" style={{ background: "var(--ln-void)" }} />;
  if (!user) return <main className="min-h-screen px-5 py-16" style={{ background: "var(--ln-void)", color: "var(--ln-parchment)" }}><p className="mx-auto max-w-xl font-editorial text-[var(--text-h3)]">Sign in to control your PNA Stewardship Profiles.</p></main>;

  const update = (id: PNAProfileId, patch: Partial<{ isEnabled: boolean; allowRemoteContext: boolean }>) => {
    const current = settingsById.get(id) ?? { isEnabled: true, allowRemoteContext: false };
    save.mutate({ profileId: id, isEnabled: patch.isEnabled ?? current.isEnabled, allowRemoteContext: patch.allowRemoteContext ?? current.allowRemoteContext });
  };

  return <main className="min-h-screen px-4 py-8 sm:px-7 lg:px-10" style={{ background: "var(--ln-void)", color: "var(--ln-parchment)" }}>
    <div className="mx-auto max-w-6xl">
      <SettingsSubNav />
      <header className="mt-8 max-w-3xl"><div className="flex items-center gap-2 font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold)" }}><Wand2 size={14} /> PNA Stewardship</div><h1 className="mt-3 font-editorial text-[var(--text-h1)] leading-[0.95]" style={{ color: "var(--ln-parchment)" }}>Choose what each PNA Profile may do.</h1><p className="mt-4 font-body text-[var(--text-lg)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>Profiles are creator-controlled roles, not autonomous authorities. A PNA profile never registers a Work, issues a Witness ID, changes testimony, publishes, licenses, or spends on your behalf.</p></header>
      <section className="mt-7 rounded-xl p-4 sm:p-5" style={{ background: "color-mix(in srgb, var(--ln-gold) 8%, var(--ln-coal))", border: "1px solid color-mix(in srgb, var(--ln-gold) 26%, var(--ln-panel-border))" }}><div className="flex gap-3"><ShieldCheck className="mt-0.5 flex-shrink-0" size={18} style={{ color: "var(--ln-gold)" }} /><div><h2 className="font-display text-[var(--text-sm)] tracking-[0.11em] uppercase" style={{ color: "var(--ln-gold)" }}>Selected Context needs a separate permission</h2><p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>Turning on a Profile only permits its workspace role. Turning on <strong>remote selected-context use</strong> allows that specific profile to send only the sources you deliberately attach to a private Context Envelope to the configured model route. Each send rechecks this setting, source ownership, source compatibility, and the Envelope revision.</p></div></div></section>
      <section className="mt-7 grid gap-4 lg:grid-cols-2" aria-label="Stewardship Profile contracts">{PNA_PROFILE_IDS.map((id) => {
        const contract = PNA_STEWARDSHIP_PROFILES[id];
        const state = settingsById.get(id) ?? { isEnabled: true, allowRemoteContext: false };
        const Icon = ICONS[id];
        return <article key={id} className="rounded-xl p-4 sm:p-5" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}><div className="flex gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ color: "var(--ln-gold)", background: "color-mix(in srgb, var(--ln-gold) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 24%, transparent)" }}><Icon size={18} /></div><div><p className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Profile v{contract.revision}</p><h2 className="mt-1 font-editorial text-[var(--text-h3)]" style={{ color: "var(--ln-parchment)" }}>{contract.label}</h2><p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{contract.purpose}</p></div></div><div className="mt-4 grid gap-2"><Toggle checked={state.isEnabled} disabled={save.isPending} onChange={(isEnabled) => update(id, { isEnabled })} label="Enable this Profile" description="Makes this creator-selected PNA role available in the private workspace." /><Toggle checked={state.allowRemoteContext} disabled={save.isPending || !state.isEnabled} onChange={(allowRemoteContext) => update(id, { allowRemoteContext })} label="Permit remote selected-context use" description="Allows only compatible, deliberately attached private sources to accompany a model request for this Profile." /></div><section className="mt-4"><p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Never</p><ul className="mt-2 grid gap-1.5 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{contract.never.map((rule) => <li key={rule} className="flex gap-2"><span style={{ color: "var(--ln-gold)" }}>—</span><span>{rule}</span></li>)}</ul></section></article>;
      })}</section>
      <p className="mt-8 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>These controls govern PNA workspace behavior only. Registry and publication actions remain separate, explicit creator workflows.</p>
    </div>
  </main>;
}
