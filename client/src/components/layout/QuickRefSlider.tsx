/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — QuickRefSlider
   Left-edge quick reference panel with page summary
═══════════════════════════════════════════════════════════════════ */

import { ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onToggle: () => void;
  summary: { title: string; points: string[] };
  currentPath: string;
}

export default function QuickRefSlider({ open, onToggle, summary }: Props) {
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

        {/* Points */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {summary.points.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-[#D4AF37]/40 mt-1.5 flex-shrink-0" />
              <span className="text-[12px] font-body text-white/50 leading-relaxed">{point}</span>
            </div>
          ))}
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
