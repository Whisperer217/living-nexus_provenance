import { useRef, useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { ConstellationReveal } from "@/components/ConstellationReveal";

interface ShowcaseRowProps {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
  className?: string;
  /** Optional subtitle / eyebrow line above the title */
  eyebrow?: string;
}

export function ShowcaseRow({ title, seeAllHref, seeAllLabel = "See All", children, className = "", eyebrow }: ShowcaseRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <ConstellationReveal className={`mb-16 overflow-hidden ${className}`} dotCount={5}>
      <section>
        {/* ── Sacred Section Header ── */}
        <div className="mb-7 px-1">
          {/* Top architectural divider */}
          <div
            className="mb-5"
            style={{
              height: "1px",
              background: "linear-gradient(to right, rgba(196,154,40,0.55) 0%, rgba(196,154,40,0.22) 28%, rgba(196,154,40,0.06) 62%, transparent 100%)",
            }}
          />

          <div className="flex items-end justify-between">
            {/* Left: vertical gold accent bar + eyebrow + title */}
            <div className="flex items-start gap-3 min-w-0">
              {/* Gold accent bar — taller, gradient fade */}
              <div
                className="flex-shrink-0 mt-0.5"
                style={{
                  width: "3px",
                  height: eyebrow ? "2.4rem" : "1.5rem",
                  borderRadius: "2px",
                  background: "linear-gradient(to bottom, rgba(196,154,40,1.0) 0%, rgba(196,154,40,0.55) 55%, rgba(196,154,40,0.08) 100%)",
                  boxShadow: "0 0 8px rgba(196,154,40,0.28), 0 0 20px rgba(196,154,40,0.10)",
                }}
              />
              <div className="min-w-0">
                {eyebrow && (
                  <p
                    className="font-heading uppercase mb-0.5"
                    style={{
                      fontSize: "0.60rem",
                      color: "rgba(196,154,40,0.50)",
                      letterSpacing: "0.28em",
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                <h2
                  className="font-heading uppercase truncate"
                  style={{
                    fontSize: "clamp(0.80rem, 2.2vw, 0.95rem)",
                    color: "rgba(240,232,210,0.95)",
                    letterSpacing: "0.22em",
                    textShadow: "0 0 28px rgba(196,154,40,0.12), 0 1px 12px rgba(0,0,0,0.55)",
                  }}
                >
                  {title}
                </h2>
              </div>
            </div>

            {/* Right: See All pill + desktop arrows */}
            <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
              {seeAllHref && (
                <Link href={seeAllHref}>
                  {/* Desktop: pill with label */}
                  <span
                    className="hidden sm:flex items-center gap-1 font-heading uppercase cursor-pointer transition-all"
                    style={{
                      fontSize: "0.62rem",
                      letterSpacing: "0.16em",
                      color: "rgba(196,154,40,0.58)",
                      border: "1px solid rgba(196,154,40,0.20)",
                      background: "rgba(196,154,40,0.05)",
                      padding: "0.28rem 0.80rem",
                      borderRadius: "999px",
                      transition: "all 0.22s ease",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = "rgba(196,154,40,0.92)";
                      el.style.borderColor = "rgba(196,154,40,0.42)";
                      el.style.background = "rgba(196,154,40,0.10)";
                      el.style.boxShadow = "0 0 12px rgba(196,154,40,0.14)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = "rgba(196,154,40,0.58)";
                      el.style.borderColor = "rgba(196,154,40,0.20)";
                      el.style.background = "rgba(196,154,40,0.05)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    {seeAllLabel}
                    <ChevronRight className="w-3 h-3" />
                  </span>
                  {/* Mobile: icon only */}
                  <span
                    className="sm:hidden flex items-center justify-center w-7 h-7 rounded-full"
                    style={{
                      color: "rgba(196,154,40,0.58)",
                      border: "1px solid rgba(196,154,40,0.20)",
                      background: "rgba(196,154,40,0.05)",
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              )}

              {/* Desktop scroll arrows */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => scroll("left")}
                  disabled={!canScrollLeft}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(196,154,40,0.07)",
                    border: "1px solid rgba(196,154,40,0.18)",
                    color: "rgba(196,154,40,0.65)",
                  }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = "rgba(196,154,40,0.16)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(196,154,40,0.18)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(196,154,40,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  disabled={!canScrollRight}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(196,154,40,0.07)",
                    border: "1px solid rgba(196,154,40,0.18)",
                    color: "rgba(196,154,40,0.65)",
                  }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = "rgba(196,154,40,0.16)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(196,154,40,0.18)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(196,154,40,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable row ── */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollPaddingLeft: "0.75rem",
            paddingRight: "2.5rem", // peek effect — next card visible at edge
            WebkitOverflowScrolling: "touch",
            willChange: "scroll-position",
          }}
        >
          {children}
        </div>
      </section>
    </ConstellationReveal>
  );
}
