/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Pricing Covenant Page
   Not a sales page. A declaration.
   One offer. One price. One reason.
   — Command Domains LLC / BDDT Publishing
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Shield, CheckCircle, Lock, FileText, Music, Zap,
  ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";

/* ── Covenant items — what you get, stated plainly ─────────────── */
const COVENANT_ITEMS = [
  {
    icon: Shield,
    title: "Witness ID on every track",
    body: "Every song you upload receives a cryptographic SHA-256 Witness ID — a timestamp-locked proof of creation that cannot be faked, backdated, or forged. Your music exists on record before anyone can claim otherwise.",
  },
  {
    icon: FileText,
    title: "Commercial license — Command Domains LLC",
    body: "Your license is issued under Command Domains LLC / BDDT Publishing. You have the right to monetize, distribute, license, and protect your work commercially. This is not a streaming license. This is a creator's covenant.",
  },
  {
    icon: Music,
    title: "100 song slots",
    body: "Upload up to 100 tracks. Audio, cover art, lyrics, music video — all protected, all witnessed. Additional slots are available at $0.99 each if you need to grow beyond 100.",
  },
  {
    icon: Zap,
    title: "AI Transform access",
    body: "Access the AI Transform pipeline to generate new versions, stems, and variations of your work — with your original WID intact as the provenance anchor. The derivative is never the origin.",
  },
  {
    icon: Lock,
    title: "Download permission controls",
    body: "Set per-track download rules: Free, Tip-to-Download, or No Downloads. You decide who gets access and under what terms. Not the platform. Not the algorithm. You.",
  },
];

/* ── FAQ ────────────────────────────────────────────────────────── */
const FAQ = [
  {
    q: "Why $88.88?",
    a: "Not $89.99. Not $99. $88.88 is intentional. In numerology, 8 represents abundance, alignment, and infinite return. This platform was built on the principle that creators deserve to be funded. The number reflects that covenant — not a retail trick, not a psychological anchor. A declaration.",
  },
  {
    q: "Is this a subscription?",
    a: "No. This is a one-time payment. You pay once. Your license is yours. No renewal. No monthly fee. No expiration. The platform may add subscription tiers in the future for additional services, but the Creator License is a permanent covenant.",
  },
  {
    q: "What happens to my music if Living Nexus shuts down?",
    a: "Your Witness IDs are cryptographic records. They exist independent of this platform. Your SHA-256 hash, timestamp, and creator identity are in the certificate — not locked in a database only we control. The proof travels with you.",
  },
  {
    q: "Can I get a refund?",
    a: "If you purchase and have not uploaded any tracks, contact us within 7 days for a full refund. If you have uploaded tracks and received Witness IDs, the license has been exercised and is non-refundable. That is the 7-day return value system.",
  },
  {
    q: "What if I already have a license?",
    a: "If you are already licensed, this page is not for you — it is for the next creator who needs to know what they are getting into. Your license is active. Your archive is protected. Keep creating.",
  },
];

/* ── FAQ Item ───────────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: "1px solid oklch(0.22 0.04 270 / 60%)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{
          background: open ? "oklch(0.115 0.055 278)" : "oklch(0.10 0.04 268)",
          color: "oklch(0.92 0.01 280)",
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "oklch(0.115 0.055 278)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "oklch(0.10 0.04 268)"; }}
      >
        <span className="font-semibold text-sm pr-4" style={{ fontFamily: "'Cinzel', serif" }}>{q}</span>
        {open ? <ChevronUp size={15} style={{ color: "oklch(0.80 0.145 82)", flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: "oklch(0.55 0.02 280)", flexShrink: 0 }} />}
      </button>
      {open && (
        <div
          className="px-5 pb-5 pt-3 text-sm leading-relaxed"
          style={{ background: "oklch(0.115 0.055 278)", color: "oklch(0.75 0.02 280)" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function PricingCovenantPage() {
  const { isAuthenticated } = useAuth();

  const { data: licenseData } = trpc.licenses.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const isLicensed = licenseData?.licenseStatus === "licensed";

  const licenseMutation = trpc.licenses.purchaseLicense.useMutation({
    onSuccess: (data: { url: string | null }) => {
      if (data.url) window.open(data.url, "_blank");
      toast.info("Redirecting to secure checkout...");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handlePurchase = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/pricing");
      return;
    }
    licenseMutation.mutate({ origin: window.location.origin });
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.09 0.04 265)", paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, oklch(0.10 0.06 270) 0%, oklch(0.09 0.04 265) 100%)",
          borderBottom: "1px solid oklch(0.22 0.04 270 / 40%)",
        }}
      >
        {/* Subtle gold radial glow behind the title */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.80 0.145 82 / 0.06) 0%, transparent 70%)",
          }}
        />

        <div className="container max-w-3xl mx-auto px-4 py-16 md:py-24 relative z-10 text-center">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6"
            style={{
              background: "oklch(0.80 0.145 82 / 0.12)",
              border: "1px solid oklch(0.80 0.145 82 / 0.25)",
              color: "oklch(0.80 0.145 82)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Shield size={11} />
            Creator License — Command Domains LLC
          </div>

          {/* Title */}
          <h1
            className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.96 0.008 270)" }}
          >
            The Pricing Covenant
          </h1>

          {/* Aid Bag Statement */}
          <p
            className="text-lg md:text-xl leading-relaxed mb-4 max-w-2xl mx-auto"
            style={{ color: "oklch(0.82 0.02 280)" }}
          >
            A medic who gives away all his supplies has nothing left when the next soldier comes in.
          </p>
          <p
            className="text-base leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ color: "oklch(0.65 0.02 280)" }}
          >
            This platform was built to protect creators — their music, their testimony, their intellectual property.
            Charging for that protection is not extraction. It is restocking the aid bag so we can keep treating people.
            The laborer is worthy of his wages. — Luke 10:7
          </p>

          {/* Price + CTA */}
          {isLicensed ? (
            <div
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
              style={{
                background: "oklch(0.65 0.18 145 / 0.12)",
                border: "1px solid oklch(0.65 0.18 145 / 0.35)",
              }}
            >
              <CheckCircle size={22} style={{ color: "oklch(0.65 0.18 145)" }} />
              <div className="text-left">
                <p className="font-bold text-sm" style={{ color: "oklch(0.65 0.18 145)", fontFamily: "'Cinzel', serif" }}>
                  You are licensed.
                </p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.02 280)" }}>
                  Commercial rights active. Keep creating.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div>
                <span
                  className="text-5xl font-bold"
                  style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.80 0.145 82)" }}
                >
                  $88.88
                </span>
                <span className="ml-2 text-sm" style={{ color: "oklch(0.55 0.02 280)" }}>
                  one-time · no subscription · no renewal
                </span>
              </div>
              <button
                onClick={handlePurchase}
                disabled={licenseMutation.isPending}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, oklch(0.80 0.145 82), oklch(0.72 0.18 75))",
                  color: "oklch(0.08 0.01 280)",
                  boxShadow: "0 4px 24px oklch(0.80 0.145 82 / 0.35)",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                {licenseMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "oklch(0.08 0.01 280)", borderTopColor: "transparent" }} />
                    Processing...
                  </>
                ) : (
                  <>
                    Become a Founding Creator
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-xs" style={{ color: "oklch(0.45 0.02 280)" }}>
                Secured by Stripe · 7-day return policy if no tracks uploaded
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Covenant breakdown ───────────────────────────────────── */}
      <div className="container max-w-3xl mx-auto px-4 py-14">
        <h2
          className="text-xl font-bold mb-2 text-center"
          style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.90 0.02 85)" }}
        >
          What This License Is
        </h2>
        <p className="text-sm text-center mb-10" style={{ color: "oklch(0.55 0.02 280)" }}>
          Not a feature list. A covenant between you and this platform.
        </p>

        <div className="space-y-4">
          {COVENANT_ITEMS.map((item, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl p-5"
              style={{
                background: "oklch(0.115 0.055 278)",
                border: "1px solid oklch(0.22 0.04 270 / 50%)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "oklch(0.80 0.145 82 / 0.12)", border: "1px solid oklch(0.80 0.145 82 / 0.25)" }}
              >
                <item.icon size={18} style={{ color: "oklch(0.80 0.145 82)" }} />
              </div>
              <div>
                <h3
                  className="font-semibold text-sm mb-1"
                  style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.01 280)" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.68 0.02 280)" }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── The number ──────────────────────────────────────────── */}
      <div
        className="mx-4 md:mx-auto max-w-3xl rounded-2xl p-8 md:p-10 mb-14"
        style={{
          background: "linear-gradient(135deg, oklch(0.115 0.055 278), oklch(0.10 0.04 268))",
          border: "1px solid oklch(0.80 0.145 82 / 0.18)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.80 0.145 82 / 0.15)", border: "1px solid oklch(0.80 0.145 82 / 0.30)" }}
          >
            <span className="text-xl font-bold" style={{ color: "oklch(0.80 0.145 82)", fontFamily: "'Cinzel', serif" }}>∞</span>
          </div>
          <div>
            <h3
              className="font-bold text-base mb-2"
              style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.80 0.145 82)" }}
            >
              Why $88.88 and not $89.99
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "oklch(0.72 0.02 280)" }}>
              Every SaaS platform charges $X9.99 because the retail psychology says round numbers feel expensive.
              That is a manipulation. This platform does not do that.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: "oklch(0.72 0.02 280)" }}>
              $88.88 is intentional. The number 8 represents abundance, alignment, and infinite return in multiple
              traditions. Four 8s is a declaration: this exchange is meant to multiply, not extract. You invest in
              your work. The platform invests in protecting it. That is a covenant, not a transaction.
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <div className="container max-w-3xl mx-auto px-4 pb-14">
        <h2
          className="text-xl font-bold mb-8 text-center"
          style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.90 0.02 85)" }}
        >
          Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      {!isLicensed && (
        <div className="container max-w-3xl mx-auto px-4 pb-10 text-center">
          <p
            className="text-base mb-6 leading-relaxed"
            style={{ color: "oklch(0.65 0.02 280)" }}
          >
            You built something real. You built it with your hands, your voice, your testimony.
            <br />
            Let this platform witness it — and protect it.
          </p>
          <button
            onClick={handlePurchase}
            disabled={licenseMutation.isPending}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, oklch(0.80 0.145 82), oklch(0.72 0.18 75))",
              color: "oklch(0.08 0.01 280)",
              boxShadow: "0 4px 24px oklch(0.80 0.145 82 / 0.30)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            {licenseMutation.isPending ? "Processing..." : "Become a Founding Creator — $88.88"}
            {!licenseMutation.isPending && <ArrowRight size={16} />}
          </button>
          <p className="text-xs mt-3" style={{ color: "oklch(0.40 0.02 280)" }}>
            One-time payment · Secured by Stripe · 7-day return policy
          </p>
          <div className="mt-6">
            <Link href="/manifesto">
              <span
                className="text-xs underline underline-offset-4 transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "oklch(0.55 0.02 280)" }}
              >
                Read the Manifesto — understand why this platform exists
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
