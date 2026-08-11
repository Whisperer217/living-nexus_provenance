/**
 * SiteFooter — doctrine / legal / platform links.
 * Surfaces follow theme atmosphere tokens so cream / crimson / gold shift here too.
 */
import { Link } from "wouter";
import { ScrollText, Scale, Shield, Heart, Library, Users, BookOpen } from "lucide-react";

const PLATFORM_LINKS = [
  { icon: ScrollText, label: "Manifesto", path: "/manifesto" },
  { icon: Scale,      label: "Code of Ethics & Terms", path: "/terms" },
  { icon: Shield,     label: "Privacy Policy", path: "/privacy" },
  { icon: Heart,      label: "Attribution", path: "/attribution" },
  { icon: Library,    label: "Platform Lexicon", path: "/lexicon" },
  { icon: Users,      label: "Founding Creators", path: "/founders" },
  { icon: BookOpen,   label: "WID Specification", path: "/doctrine/wid-spec" },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="w-full mt-auto border-t"
      style={{
        borderColor: "var(--ln-panel-border)",
        background: "color-mix(in srgb, var(--ln-panel) 92%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col items-center gap-2 mb-8">
          <span
            className="text-xs font-bold tracking-[0.22em] uppercase"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            Living Nexus
          </span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "var(--ln-smoke)" }}>
            Sovereign Creative Archive · BDDT Publishing
          </span>
        </div>

        <nav aria-label="Platform doctrine links">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
            {PLATFORM_LINKS.map(({ icon: Icon, label, path }) => (
              <li key={path}>
                <Link href={path}>
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] tracking-wide transition-colors cursor-pointer"
                    style={{ color: "var(--ln-bone)" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--ln-gold)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--ln-bone)")}
                  >
                    <Icon size={11} />
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t mb-6" style={{ borderColor: "var(--ln-panel-border)" }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-center sm:text-left" style={{ color: "var(--ln-smoke)" }}>
            © {year} BDDT Publishing LLC. All rights reserved.
          </p>
          <p className="text-[10px] text-center sm:text-right" style={{ color: "var(--ln-smoke)" }}>
            Truth enters through witnesses, survives through return, and collapses when systems sever it from its origin.
          </p>
        </div>
      </div>
    </footer>
  );
}
