/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ContextualModal
   Doctrine: "Truth enters through witnesses, survives through return,
   and collapses when systems sever it from its origin."

   Every modal must carry its origin. This primitive enforces that.

   Modal Type System:
   ┌─────────────────┬────────────────────────────────────────────┐
   │ renderMode      │ Behavior                                   │
   ├─────────────────┼────────────────────────────────────────────┤
   │ contextual      │ Anchored to originRect, edge-aware         │
   │ overlay         │ Centered (auth, settings — not for tracks) │
   │ bottom-sheet    │ Mobile drawer (auto on small screens)      │
   └─────────────────┴────────────────────────────────────────────┘

   Usage:
     <ContextualModal
       open={open}
       onClose={onClose}
       originRect={rect}       ← DOMRect from getBoundingClientRect()
       intent="add_to_playlist"
       renderMode="contextual"
       width={280}
     >
       {children}
     </ContextualModal>
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ContextualModalRenderMode = "contextual" | "overlay" | "bottom-sheet";

export interface ContextualModalProps {
  open: boolean;
  onClose: () => void;
  /** DOMRect of the triggering element — required for contextual mode */
  originRect?: DOMRect | null;
  /** Describes the intent — used for accessibility and debugging */
  intent?: string;
  renderMode?: ContextualModalRenderMode;
  /** Preferred width in px (contextual mode). Default: 280 */
  width?: number;
  /** Preferred max height in px. Default: 420 */
  maxHeight?: number;
  /** Show a close button in the header */
  showClose?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const MOBILE_BREAKPOINT = 640; // px — below this, always use bottom-sheet

function computePosition(
  originRect: DOMRect,
  width: number,
  maxHeight: number,
  gap = 8
): { top: number; left: number; transformOrigin: string } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Default: open below the origin, left-aligned
  let top = originRect.bottom + gap;
  let left = originRect.left;
  let transformOrigin = "top left";

  // Flip up if not enough space below
  if (top + maxHeight > vh - gap) {
    top = originRect.top - maxHeight - gap;
    transformOrigin = "bottom left";
    if (top < gap) {
      // Not enough space above either — center vertically
      top = Math.max(gap, (vh - maxHeight) / 2);
      transformOrigin = "center left";
    }
  }

  // Flip left if overflowing right edge
  if (left + width > vw - gap) {
    left = originRect.right - width;
    transformOrigin = transformOrigin.replace("left", "right");
  }

  // Clamp to viewport
  left = Math.max(gap, Math.min(left, vw - width - gap));
  top = Math.max(gap, top);

  return { top, left, transformOrigin };
}

export function ContextualModal({
  open,
  onClose,
  originRect,
  intent = "modal",
  renderMode = "contextual",
  width = 280,
  maxHeight = 420,
  showClose = false,
  title,
  children,
  className = "",
}: ContextualModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Determine effective render mode — always bottom-sheet on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
  const effectiveMode =
    isMobile ? "bottom-sheet"
    : renderMode === "contextual" && !originRect ? "overlay"
    : renderMode;

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Tiny delay so CSS transition fires
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted) return null;

  // ── Contextual (anchored) ──────────────────────────────────────────
  if (effectiveMode === "contextual" && originRect) {
    const { top, left, transformOrigin } = computePosition(originRect, width, maxHeight);

    return createPortal(
      <>
        {/* Invisible backdrop — click outside closes */}
        <div
          className="fixed inset-0 z-[998]"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={intent}
          data-origin-id={intent}
          style={{
            position: "fixed",
            top,
            left,
            width,
            maxHeight,
            zIndex: 999,
            transformOrigin,
            transform: visible ? "scale(1)" : "scale(0.92)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease",
            overflowY: "auto",
          }}
          className={`rounded-xl border border-white/[0.12] bg-[#111009] shadow-[0_16px_48px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)] ${className}`}
          onClick={e => e.stopPropagation()}
        >
          {(title || showClose) && (
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.08]">
              {title && (
                <span className="text-[12px] font-heading text-white/80 tracking-wide uppercase">{title}</span>
              )}
              {showClose && (
                <button type="button" onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors ml-auto">
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </>,
      document.body
    );
  }

  // ── Bottom Sheet (mobile or explicit) ────────────────────────────
  if (effectiveMode === "bottom-sheet") {
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={intent}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 999,
            maxHeight: "85vh",
            transform: visible ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.25s cubic-bezier(0.32,0.72,0,1)",
            overflowY: "auto",
          }}
          className={`rounded-t-2xl border-t border-white/[0.12] bg-[#111009] shadow-[0_-8px_40px_rgba(0,0,0,0.8)] ${className}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          {(title || showClose) && (
            <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-white/[0.08]">
              {title && (
                <span className="text-[13px] font-heading text-white/80 tracking-wide">{title}</span>
              )}
              {showClose && (
                <button type="button" onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors ml-auto">
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </>,
      document.body
    );
  }

  // ── Overlay (centered — for auth, settings, etc.) ─────────────────
  return createPortal(
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={intent}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: Math.min(width, window.innerWidth - 32),
          maxHeight,
          zIndex: 999,
          transform: visible
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.94)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease",
          overflowY: "auto",
        }}
        className={`rounded-xl border border-white/[0.12] bg-[#111009] shadow-[0_24px_64px_rgba(0,0,0,0.9)] ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.08]">
            {title && (
              <span className="text-[13px] font-heading text-white/80 tracking-wide">{title}</span>
            )}
            {showClose && (
              <button type="button" onClick={onClose} className="p-1 text-white/40 hover:text-white/80 transition-colors ml-auto">
                <X size={14} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </>,
    document.body
  );
}
