import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Fingerprint,
  ShieldCheck,
  Upload,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: FileText,
    title: "Bring a Work with a testimony",
    body: "A Work is more than a file. Before you register, be ready to say what this work is, where it came from, what you carried into it, or what you want future witnesses to understand.",
    note: "This is the human context that keeps the file connected to its origin.",
  },
  {
    number: "02",
    icon: Upload,
    title: "Register it in Manifestation Studio",
    body: "Choose the medium, add the file, review the detected record, complete the metadata, and make the creation disclosure honest. AI may be part of the instrument; the creator remains responsible for the direction and testimony.",
    note: "Use Register or Manifestation—not ‘post’ or ‘dump.’ You are entering a record.",
  },
  {
    number: "03",
    icon: Fingerprint,
    title: "Receive the Witness ID",
    body: "When the registration is complete, Living Nexus binds the Work to your creator identity and issues a Witness ID. Keep the WID, review the Work page, and save the manifest when you need a portable copy.",
    note: "The WID is a provenance seal, not a replacement for copyright registration.",
  },
];

function MockRegisterScreen() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.24)", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>
      <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: "rgba(196,154,40,0.12)" }}>
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--ln-ember)" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--ln-gold)" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--ln-seal-bright)" }} />
        <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "var(--ln-smoke)" }}>livingnexus.org / upload</span>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold)" }}>Manifestation Studio</p>
            <p className="mt-1 font-editorial text-2xl" style={{ color: "var(--ln-parchment)" }}>Register your Work</p>
          </div>
          <span className="rounded-full px-2 py-1 font-mono text-[9px]" style={{ background: "rgba(196,154,40,0.1)", color: "var(--ln-gold)" }}>01 / 04</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--ln-iron)", border: "1px solid rgba(196,154,40,0.14)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(196,154,40,0.12)", color: "var(--ln-gold)" }}><Upload size={18} /></div>
            <div className="min-w-0">
              <p className="font-body text-xs font-semibold" style={{ color: "var(--ln-parchment)" }}>Drop the file you are registering</p>
              <p className="mt-1 font-body text-[10px]" style={{ color: "var(--ln-smoke)" }}>Audio, lyrics, manuscript, visual work, comic, or game</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.28)" }}>
          <div className="flex items-center gap-2"><FileText size={14} style={{ color: "var(--ln-gold)" }} /><p className="font-display text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>Origin testimony</p></div>
          <p className="mt-2 font-editorial text-sm italic leading-relaxed" style={{ color: "var(--ln-bone)" }}>“What happened, what I chose, and what I want this Work to carry forward…”</p>
        </div>
      </div>
    </div>
  );
}

function MockWidScreen() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.24)", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(196,154,40,0.12)" }}><p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "var(--ln-smoke)" }}>Chain of Record</p></div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(58,138,86,0.14)", color: "var(--ln-seal-bright)" }}><ShieldCheck size={19} /></div><div><p className="font-editorial text-lg" style={{ color: "var(--ln-parchment)" }}>Work registered</p><p className="font-body text-[10px]" style={{ color: "var(--ln-smoke)" }}>Creator attribution and origin preserved</p></div></div>
        <div className="rounded-xl p-4" style={{ background: "var(--ln-iron)", border: "1px solid rgba(196,154,40,0.2)" }}><p className="font-display text-[9px] uppercase tracking-[0.17em]" style={{ color: "var(--ln-gold-dim)" }}>Witness ID</p><p className="mt-2 break-all font-mono text-xs tracking-[0.08em]" style={{ color: "var(--ln-gold-hot)" }}>WID-MUS-XXXX-XXXXXXXX</p><p className="mt-2 font-body text-[10px]" style={{ color: "var(--ln-smoke)" }}>Copy, verify, and keep this with your records.</p></div>
      </div>
    </div>
  );
}

export default function CreatorFieldGuidePage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--ln-void)", color: "var(--ln-bone)" }}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <header className="max-w-3xl">
          <p className="font-display text-[11px] uppercase tracking-[0.24em]" style={{ color: "var(--ln-gold)" }}>Creator Field Guide</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl" style={{ color: "var(--ln-parchment)" }}>Bring the story with the file.</h1>
          <p className="mt-5 max-w-2xl font-editorial text-xl leading-relaxed sm:text-2xl" style={{ color: "var(--ln-bone)" }}>
            Living Nexus is for creative Works that carry a human point of origin. Before you register something, be ready to leave a testimony: the context, intention, choices, or lived experience that makes the Work yours.
          </p>
          <div className="mt-6 rounded-2xl p-5" style={{ background: "rgba(196,154,40,0.07)", border: "1px solid rgba(196,154,40,0.28)" }}>
            <p className="font-display text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold)" }}>The simple rule</p>
            <p className="mt-2 font-editorial text-xl leading-relaxed" style={{ color: "var(--ln-parchment)" }}>Do not bring only a file. Bring the account of why this Work exists.</p>
          </div>
        </header>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return <article key={step.number} className="museum-card rounded-2xl p-5">
              <div className="flex items-center justify-between"><span className="font-mono text-xs" style={{ color: "var(--ln-gold-dim)" }}>{step.number}</span><Icon size={18} style={{ color: "var(--ln-gold)" }} /></div>
              <h2 className="mt-6 font-editorial text-2xl" style={{ color: "var(--ln-parchment)" }}>{step.title}</h2>
              <p className="mt-3 font-body text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>{step.body}</p>
              <p className="mt-5 border-t pt-4 font-body text-xs leading-relaxed" style={{ borderColor: "rgba(196,154,40,0.14)", color: "var(--ln-smoke)" }}>{step.note}</p>
            </article>;
          })}
        </section>

        <section className="mt-16 grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold-dim)" }}>What to write</p>
            <h2 className="mt-3 font-editorial text-3xl" style={{ color: "var(--ln-parchment)" }}>A testimony does not need to be polished.</h2>
            <p className="mt-4 font-body text-base leading-relaxed" style={{ color: "var(--ln-bone)" }}>It can be brief and plain. Tell the truth of the creative event in your own words. You may write about:</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {["What happened before the Work", "The choice or constraint that shaped it", "Who or what it remembers", "How AI or other tools participated", "What you want future witnesses to know", "What should never be separated from its origin"].map((item) => <li key={item} className="flex gap-2 font-body text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}><Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--ln-gold)" }} />{item}</li>)}
            </ul>
            <div className="mt-6 rounded-xl p-4" style={{ background: "var(--ln-iron)", border: "1px solid rgba(196,154,40,0.14)" }}><p className="font-body text-sm italic leading-relaxed" style={{ color: "var(--ln-parchment)" }}>“This song came from the season when I was learning to carry grief without letting it erase my hope.”</p><p className="mt-2 font-body text-xs" style={{ color: "var(--ln-smoke)" }}>A short testimony can still preserve a real origin.</p></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"><MockRegisterScreen /><MockWidScreen /></div>
        </section>

        <section className="mt-16 rounded-2xl p-6 sm:p-8" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl"><p className="font-display text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--ln-gold)" }}>Ready when you are</p><h2 className="mt-2 font-editorial text-3xl" style={{ color: "var(--ln-parchment)" }}>Register the Work, then return to its record.</h2><p className="mt-3 font-body text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>The guide is a reference, not a second upload system. Use the existing onboarding and Manifestation Studio paths.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/onboarding" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-display text-[11px] uppercase tracking-[0.16em] transition hover:brightness-110" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>Begin onboarding <ArrowRight size={14} /></Link>
              <Link href="/upload" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-display text-[11px] uppercase tracking-[0.16em] transition hover:border-[var(--ln-gold)]" style={{ background: "transparent", border: "1px solid rgba(196,154,40,0.35)", color: "var(--ln-gold)" }}>Register a Work <ChevronRight size={14} /></Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 font-body text-xs" style={{ borderColor: "rgba(196,154,40,0.12)", color: "var(--ln-smoke)" }}><Link href="/learn" className="hover:underline">Read the WID and Lexicon reference</Link><Link href="/verify" className="hover:underline">Verify a Witness ID</Link></div>
        </section>
      </div>
    </main>
  );
}
