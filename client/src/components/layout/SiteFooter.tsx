/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SiteFooter
   ─────────────────────────────────────────────────────────────────
   Visible on every page. Contains all doctrine, legal, and platform
   links that are not surfaced in the primary navigation rail.
═══════════════════════════════════════════════════════════════════ */
import { Link } from "wouter";
import { ScrollText, Scale, Shield, Heart, Library, Users, BookOpen, ExternalLink } from "lucide-react";

const PLATFORM_LINKS = [
  { icon: ScrollText, label: "Manifesto", path: "/manifesto" },
  { icon: Scale,      label: "Code of Ethics & Terms", path: "/terms" },
  { icon: Shield,     label: "Privacy Policy", path: "/privacy" },
  { icon: Heart,      label: "Attribution", path: "/attribution" },
  { icon: Library,    label: "Lexicon", path: "/lexicon" },
  { icon: BookOpen,   label: "Platform Glossary", path: "/glossary" },
  { icon: Users,      label: "Founding Creators", path: "/founders" },
  { icon: BookOpen,   label: "WID Specification", path: "/doctrine/wid-spec" },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="w-full mt-auto border-t"
      style={{
        borderColor: "rgba(196,154,40,0.10)",
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <span
            className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(212,175,55,0.85)", fontFamily: "'Cinzel', serif" }}
          >
            Living Nexus
          </span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            Sovereign Creative Archive · BDDT Publishing
          </span>
        </div>

        {/* Doctrine links grid */}
        <nav aria-label="Platform doctrine links">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
            {PLATFORM_LINKS.map(({ icon: Icon, label, path }) => (
              <li key={path}>
                <Link href={path}>
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] tracking-wide transition-colors cursor-pointer"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.85)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.40)")}
                  >
                    <Icon size={11} />
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <div className="border-t mb-6" style={{ borderColor: "rgba(196,154,40,0.08)" }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-center sm:text-left" style={{ color: "rgba(255,255,255,0.22)" }}>
            © {year} BDDT Publishing LLC. All rights reserved.
          </p>
          <p className="text-[10px] text-center sm:text-right" style={{ color: "rgba(255,255,255,0.18)" }}>
            Truth enters through witnesses, survives through return, and collapses when systems sever it from its origin.
          </p>
        </div>
      </div>
    </footer>
  );
}
