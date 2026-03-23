/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — QuickRefSlider
   Left-edge quick reference panel — every item is a working nav link.
   Navigates to the target page then scrolls to the relevant section.
═══════════════════════════════════════════════════════════════════ */

import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface QuickRefPoint {
  label: string;
  /** target path to navigate to (default: current page) */
  path?: string;
  /** element id to scroll to after navigation */
  scrollTo?: string;
}

interface Props {
  open: boolean;
  onToggle: () => void;
  summary: { title: string; points: QuickRefPoint[] | string[] };
  currentPath: string;
}

export default function QuickRefSlider({ open, onToggle, summary, currentPath }: Props) {
  const [, navigate] = useLocation();

  const handlePointClick = (point: QuickRefPoint | string) => {
    const p = typeof point === "string" ? { label: point } : point;

    // Close the panel
    onToggle();

    const doScroll = () => {
      if (p.scrollTo) {
        const el = document.getElementById(p.scrollTo);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    if (p.path && p.path !== currentPath) {
      navigate(p.path);
      // Give the page a moment to mount before scrolling
      setTimeout(doScroll, 350);
    } else {
      doScroll();
    }
  };

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
          w-5 h-16 rounded-r-lg transition-all duration-300
          bg-[oklch(0.14_0.013_280)] border border-l-0 border-white/[0.1]
          text-white/30 hover:text-[#D4AF37] hover:border-[#D4AF37]/30
          ${open ? "translate-x-[180px]" : "translate-x-0"}`}
        title="Quick Reference"
      >
        <ChevronRight
          size={12}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-20 flex flex-col
          w-[180px] bg-[oklch(0.11_0.012_280)] border-r border-white/[0.07]
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.07]">
          <div className="text-[9px] font-heading tracking-[0.18em] uppercase text-white/25 mb-1">
            Quick Reference
          </div>
          <div className="text-[13px] font-heading text-[#D4AF37]">{summary.title}</div>
        </div>

        {/* Points — each is a clickable nav link */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {summary.points.map((point, i) => {
            const p = typeof point === "string" ? { label: point } : point;
            const isLink = !!(p.path || p.scrollTo);
            return (
              <button
                key={i}
                onClick={() => handlePointClick(point)}
                className={`w-full flex items-start gap-2 text-left rounded-md px-2 py-1.5 transition-all
                  ${isLink
                    ? "hover:bg-white/[0.05] hover:text-[#D4AF37] cursor-pointer group"
                    : "cursor-default"
                  }`}
              >
                <div className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 transition-colors
                  ${isLink ? "bg-[#D4AF37]/40 group-hover:bg-[#D4AF37]" : "bg-[#D4AF37]/40"}`}
                />
                <span className={`text-[12px] font-body leading-relaxed transition-colors
                  ${isLink ? "text-white/50 group-hover:text-[#D4AF37]" : "text-white/50"}`}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer decoration */}
        <div className="px-4 py-4 border-t border-white/[0.07]">
          <div className="text-[9px] font-heading tracking-[0.12em] uppercase text-white/15 text-center">
            Living Nexus
          </div>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
