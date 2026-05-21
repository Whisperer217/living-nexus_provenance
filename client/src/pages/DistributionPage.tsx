/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Distribution Hub
   Sovereign distribution pipeline for creator-owned works.
   eMastered is utilized as DSP delivery infrastructure.
   Physical formats: USB, CD, Vinyl, Books, Comics.
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Music, BookOpen, Layers, FileText, Tv, Package,
  Shield, Globe, BarChart3, CheckCircle2, ArrowRight,
  Disc3, Usb, BookMarked, Palette, Sparkles, Lock, Send
} from "lucide-react";

/* ─── Physical Format Data ─────────────────────────────────────── */
const PHYSICAL_FORMATS = [
  {
    id: "usb",
    icon: Usb,
    label: "USB Archives",
    tagline: "Portable. Private. Permanent.",
    description: "Encrypted creator archives on custom-branded USB drives. Your full catalog, offline forever.",
  },
  {
    id: "cd",
    icon: Disc3,
    label: "CDs",
    tagline: "Classic. Collectible. Timeless.",
    description: "Professional disc pressing with provenance-backed liner notes and WID verification codes.",
  },
  {
    id: "vinyl",
    icon: Disc3,
    label: "Vinyl",
    tagline: "Warmth. Presence. Heritage.",
    description: "Limited-run vinyl pressings for creators who want their sound preserved in analog permanence.",
  },
  {
    id: "books",
    icon: BookMarked,
    label: "Books",
    tagline: "Stories. Worlds. Legacies.",
    description: "Print-on-demand and limited-run publishing for manuscripts, poetry, and long-form works.",
  },
  {
    id: "comics",
    icon: Palette,
    label: "Comics",
    tagline: "Visual Stories. Real Impact.",
    description: "Physical comic printing with archival-quality paper, provenance seals, and collector editions.",
  },
];

/* ─── DSP Platforms ─────────────────────────────────────────────── */
const DSP_PLATFORMS = [
  { name: "Spotify", color: "#1DB954" },
  { name: "Apple Music", color: "#FA2D48" },
  { name: "YouTube Music", color: "#FF0000" },
  { name: "Amazon Music", color: "#25D1DA" },
  { name: "Tidal", color: "#000000" },
  { name: "Deezer", color: "#A238FF" },
];

/* ─── Distribution Benefits ─────────────────────────────────────── */
const BENEFITS = [
  { icon: Lock, label: "Keep 100% of Your Rights" },
  { icon: Globe, label: "Worldwide Distribution" },
  { icon: BarChart3, label: "Detailed Analytics" },
  { icon: Shield, label: "Provenance-Backed Releases" },
  { icon: CheckCircle2, label: "Creator Focused. Always." },
];

export default function DistributionPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    formats: [] as string[],
    mediaTypes: [] as string[],
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const notifyMutation = trpc.system.notifyOwner.useMutation();

  const toggleFormat = (id: string) => {
    setFormData(prev => ({
      ...prev,
      formats: prev.formats.includes(id)
        ? prev.formats.filter(f => f !== id)
        : [...prev.formats, id],
    }));
  };

  const toggleMedia = (type: string) => {
    setFormData(prev => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(type)
        ? prev.mediaTypes.filter(t => t !== type)
        : [...prev.mediaTypes, type],
    }));
  };

  const handleSubmit = async () => {
    if (formData.formats.length === 0 && formData.mediaTypes.length === 0) {
      toast.error("Select at least one format or media type");
      return;
    }
    try {
      await notifyMutation.mutateAsync({
        title: `Distribution Interest: ${user?.name || "Anonymous"}`,
        content: `Creator: ${user?.name || "Unknown"} (${user?.email || "no email"})\nFormats: ${formData.formats.join(", ") || "None selected"}\nMedia Types: ${formData.mediaTypes.join(", ") || "None selected"}\nNotes: ${formData.notes || "—"}`,
      });
      setSubmitted(true);
      toast.success("Your distribution interest has been recorded");
    } catch {
      toast.error("Failed to submit — please try again");
    }
  };

  return (
    <>
      <Helmet>
        <title>Distribution — Living Nexus</title>
        <meta name="description" content="Sovereign distribution pipeline for creator-owned works. Digital DSP delivery and physical artifacts." />
      </Helmet>

      <div className="min-h-screen">
        {/* ─── Hero Section ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 md:py-24 px-6">
          {/* Background gradient */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(120,80,200,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 70%, rgba(196,154,40,0.05) 0%, transparent 60%)"
          }} />

          <div className="relative max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Sparkles size={14} className="text-[#C49A28]" />
              <span className="text-[10px] font-heading tracking-[0.25em] uppercase text-[#8B6914]">
                Sovereign Distribution Pipeline
              </span>
            </div>

            <h1
              className="font-display leading-tight mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "#E8DFC8" }}
            >
              Beyond the Cloud —<br />
              <span style={{ color: "#C49A28" }}>Into Physical Reality.</span>
            </h1>

            <p className="font-body text-[15px] leading-relaxed max-w-2xl mx-auto mb-4" style={{ color: "#A09880" }}>
              This is not rented visibility. This is not disposable feeds. This is real archives, real creators, real manifestations — preserved, packaged, and distributed across digital and physical formats.
            </p>

            <p className="font-body text-[13px] leading-relaxed max-w-xl mx-auto mb-8" style={{ color: "#7A7060" }}>
              Creators retain ownership. Manifestations remain exportable. Archives remain portable.
            </p>

            {/* Distribution Vision Banner */}
            <div className="relative rounded-xl overflow-hidden border border-[#C49A28]/15 shadow-2xl">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/distribution-hub-banner-CfqSAQPuQTJUgzbkcA5DoB.webp"
                alt="Living Nexus Distribution Vision — DSP Delivery Infrastructure and Physical Formats"
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* ─── Core Principles ─────────────────────────────────────── */}
        <section className="px-6 pb-14">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Creators Retain Ownership", body: "You own your work. Always. No transfer of rights, no hidden clauses." },
              { icon: ArrowRight, title: "Exportable Manifestations", body: "Your creations. Your choice. Take them anywhere, anytime." },
              { icon: Package, title: "Portable Archives", body: "Built for now. Built for forever. Your archive moves with you." },
            ].map(p => (
              <div
                key={p.title}
                className="rounded-xl p-6"
                style={{ background: "rgba(20,14,30,0.5)", border: "1px solid rgba(196,154,40,0.10)" }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(196,154,40,0.10)" }}>
                  <p.icon size={16} className="text-[#C49A28]" />
                </div>
                <h3 className="font-heading text-[12px] tracking-wider uppercase mb-2" style={{ color: "#C49A28" }}>
                  {p.title}
                </h3>
                <p className="font-body text-[12px] leading-relaxed" style={{ color: "#A09880" }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Built For ─────────────────────────────────────────────── */}
        <section className="px-6 pb-14">
          <div className="max-w-4xl mx-auto text-center">
            <span className="font-heading text-[11px] tracking-[0.2em] uppercase" style={{ color: "#8B6914" }}>Built For</span>
            <div className="flex flex-wrap justify-center gap-4 mt-5">
              {[
                { icon: Music, label: "Music" },
                { icon: BookOpen, label: "Books" },
                { icon: Layers, label: "Comics" },
                { icon: FileText, label: "Manuscripts" },
                { icon: Tv, label: "Future Media" },
                { icon: Package, label: "AI-to-Human Pipelines" },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center gap-2 w-20">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.15)" }}>
                    <m.icon size={16} className="text-[#C49A28]" />
                  </div>
                  <span className="font-body text-[10px] uppercase tracking-wider text-center" style={{ color: "#A09880" }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Digital Distribution (eMastered as tool) ─────────────── */}
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl p-8 md:p-10" style={{
              background: "rgba(20,14,30,0.6)",
              border: "1px solid rgba(196,154,40,0.12)",
            }}>
              <div className="grid md:grid-cols-2 gap-10">
                {/* Left — explanation */}
                <div>
                  <h2 className="font-display text-xl mb-4" style={{ color: "#E8DFC8" }}>
                    Digital DSP Delivery
                  </h2>
                  <p className="font-body text-[13px] leading-relaxed mb-6" style={{ color: "#A09880" }}>
                    Living Nexus is preparing distribution infrastructure utilizing platforms such as eMastered for initial DSP delivery while building creator-owned archival systems.
                  </p>
                  <p className="font-body text-[13px] leading-relaxed mb-6" style={{ color: "#7A7060" }}>
                    Your music reaches every major streaming platform — Spotify, Apple Music, YouTube Music, Amazon Music, and more — while your provenance record stays anchored on Living Nexus.
                  </p>

                  <div className="space-y-3">
                    {BENEFITS.map(b => (
                      <div key={b.label} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(196,154,40,0.12)" }}>
                          <b.icon size={12} className="text-[#C49A28]" />
                        </div>
                        <span className="font-body text-[13px]" style={{ color: "#C9C0A8" }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — DSP grid */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={14} className="text-[#C49A28]" />
                    <span className="text-[11px] font-heading tracking-wider uppercase" style={{ color: "#8B6914" }}>
                      Worldwide Reach
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {DSP_PLATFORMS.map(p => (
                      <div
                        key={p.name}
                        className="rounded-xl px-4 py-3 flex items-center gap-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                        <span className="font-body text-[12px]" style={{ color: "#C9C0A8" }}>{p.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl p-4" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}>
                    <p className="font-body text-[11px] leading-relaxed" style={{ color: "#8B6914" }}>
                      <strong>Through eMastered</strong> — a delivery tool in our sovereign pipeline. Your rights stay with you. Living Nexus never claims ownership of your work.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Physical Formats ─────────────────────────────────────── */}
        <section className="px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-xl mb-3" style={{ color: "#E8DFC8" }}>
                Physical Artifacts
              </h2>
              <p className="font-body text-[13px]" style={{ color: "#7A7060" }}>
                The cloud was never enough. We want physical artifacts again.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {PHYSICAL_FORMATS.map(f => (
                <div
                  key={f.id}
                  className="rounded-xl p-5 text-center transition-all hover:scale-[1.02] cursor-pointer"
                  style={{
                    background: "rgba(20,14,30,0.5)",
                    border: formData.formats.includes(f.id)
                      ? "1px solid rgba(196,154,40,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => toggleFormat(f.id)}
                >
                  <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(196,154,40,0.08)" }}>
                    <f.icon size={18} className="text-[#C49A28]" />
                  </div>
                  <h3 className="font-heading text-[11px] tracking-wider uppercase mb-1" style={{ color: "#E8DFC8" }}>
                    {f.label}
                  </h3>
                  <p className="font-body text-[10px] uppercase tracking-wider mb-2" style={{ color: "#C49A28" }}>
                    {f.tagline}
                  </p>
                  <p className="font-body text-[11px] leading-relaxed hidden sm:block" style={{ color: "#7A7060" }}>
                    {f.description}
                  </p>
                  {formData.formats.includes(f.id) && (
                    <div className="mt-3">
                      <CheckCircle2 size={14} className="text-[#C49A28] mx-auto" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Creator Distribution Interest Form ──────────────────── */}
        <section className="px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl p-8 md:p-10" style={{
              background: "rgba(20,14,30,0.6)",
              border: "1px solid rgba(196,154,40,0.12)",
            }}>
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={40} className="text-[#C49A28] mx-auto mb-4" />
                  <h3 className="font-display text-lg mb-2" style={{ color: "#E8DFC8" }}>
                    Your Voice Has Been Heard
                  </h3>
                  <p className="font-body text-[13px]" style={{ color: "#A09880" }}>
                    We're building the first sovereign distribution pipeline for Living Nexus creators. Watch for the upcoming poll and distribution form as we prepare to bring your work into the world.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="font-display text-xl mb-3" style={{ color: "#E8DFC8" }}>
                      Distribution Interest Form
                    </h2>
                    <p className="font-body text-[13px]" style={{ color: "#A09880" }}>
                      Tell us how you want your work distributed. Select the formats and media types that matter to you.
                    </p>
                  </div>

                  {/* Media types */}
                  <div className="mb-8">
                    <label className="font-heading text-[11px] tracking-wider uppercase block mb-3" style={{ color: "#8B6914" }}>
                      What are you creating?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "music", icon: Music, label: "Music" },
                        { id: "books", icon: BookOpen, label: "Books" },
                        { id: "comics", icon: Layers, label: "Comics" },
                        { id: "manuscripts", icon: FileText, label: "Manuscripts" },
                        { id: "video", icon: Tv, label: "Video" },
                        { id: "other", icon: Package, label: "Other" },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => toggleMedia(t.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-[12px] font-body"
                          style={{
                            background: formData.mediaTypes.includes(t.id)
                              ? "rgba(196,154,40,0.15)"
                              : "rgba(255,255,255,0.03)",
                            border: formData.mediaTypes.includes(t.id)
                              ? "1px solid rgba(196,154,40,0.4)"
                              : "1px solid rgba(255,255,255,0.08)",
                            color: formData.mediaTypes.includes(t.id) ? "#C49A28" : "#A09880",
                          }}
                        >
                          <t.icon size={13} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Physical format selection */}
                  <div className="mb-8">
                    <label className="font-heading text-[11px] tracking-wider uppercase block mb-3" style={{ color: "#8B6914" }}>
                      Which physical formats interest you?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PHYSICAL_FORMATS.map(f => (
                        <button
                          key={f.id}
                          onClick={() => toggleFormat(f.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-[12px] font-body"
                          style={{
                            background: formData.formats.includes(f.id)
                              ? "rgba(196,154,40,0.15)"
                              : "rgba(255,255,255,0.03)",
                            border: formData.formats.includes(f.id)
                              ? "1px solid rgba(196,154,40,0.4)"
                              : "1px solid rgba(255,255,255,0.08)",
                            color: formData.formats.includes(f.id) ? "#C49A28" : "#A09880",
                          }}
                        >
                          <f.icon size={13} />
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-8">
                    <label className="font-heading text-[11px] tracking-wider uppercase block mb-3" style={{ color: "#8B6914" }}>
                      Anything else? (optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Tell us about your distribution vision..."
                      className="w-full rounded-xl px-4 py-3 text-[13px] font-body resize-none focus:outline-none focus:ring-1"
                      rows={3}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#C9C0A8",
                      }}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={notifyMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-heading font-bold text-[12px] tracking-wider uppercase transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: "#C49A28",
                      color: "#0A0806",
                      boxShadow: "0 2px 16px rgba(196,154,40,0.25)",
                    }}
                  >
                    <Send size={14} />
                    {notifyMutation.isPending ? "Submitting..." : "Register My Interest"}
                  </button>

                  {!user && (
                    <p className="text-center mt-4 font-body text-[11px]" style={{ color: "#7A7060" }}>
                      Sign in to associate your submission with your creator profile.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ─── Bottom Statement ────────────────────────────────────── */}
        <section className="px-6 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-display text-[15px] tracking-wide" style={{ color: "#8B6914", fontStyle: "italic" }}>
              "This isn't just distribution. This is preservation. This is Living Nexus."
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
