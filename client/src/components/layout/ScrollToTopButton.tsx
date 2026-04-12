/**
 * ScrollToTopButton
 * Appears in the top-right corner of the page content area after the user
 * scrolls down 300 px. Works on both mobile and desktop by targeting the
 * shared `.player-scroll-area` scroll container used by MainLayout.
 */
import { useState, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  const getScrollEl = useCallback(() =>
    document.querySelector<HTMLElement>(".player-scroll-area"), []);

  useEffect(() => {
    const el = getScrollEl();
    if (!el) return;

    const onScroll = () => setVisible(el.scrollTop > 300);
    el.addEventListener("scroll", onScroll, { passive: true });
    // Initial check
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [getScrollEl]);

  const scrollToTop = () => {
    const el = getScrollEl();
    el?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed z-40 transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        // Position: top-right, clear of the mobile header (56px) and desktop nav
        top: "calc(env(safe-area-inset-top, 0px) + 68px)",
        right: "16px",
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, oklch(0.84 0.155 85 / 0.92), oklch(0.72 0.14 75 / 0.92))",
        border: "1px solid oklch(0.84 0.155 85 / 0.4)",
        boxShadow: "0 2px 12px oklch(0.84 0.155 85 / 0.35), 0 1px 4px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "#2D1B2E",
      }}
    >
      <ArrowUp size={15} strokeWidth={2.5} />
    </button>
  );
}
