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
}

export function ShowcaseRow({ title, seeAllHref, seeAllLabel = "See All", children, className = "" }: ShowcaseRowProps) {
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
    <ConstellationReveal className={`mb-14 overflow-hidden ${className}`} dotCount={5}>
      <section>
        {/* ── Section header ── */}
        <div className="flex items-center justify-between mb-6 px-1">
          {/* Left: vertical gold accent + title */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 w-[3px] rounded-full"
              style={{
                height: "1.1rem",
                background: "linear-gradient(to bottom, rgba(196,154,40,0.90), rgba(196,154,40,0.15))",
              }}
            />
            <h2
              className="font-heading uppercase truncate"
              style={{
                fontSize: "clamp(0.76rem, 2vw, 0.88rem)",
                color: "rgba(228,216,188,0.92)",
                letterSpacing: "0.20em",
                textShadow: "0 0 20px rgba(196,154,40,0.08)",
              }}
            >
              {title}
            </h2>
          </div>

          {/* Right: See All pill + desktop arrows */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {seeAllHref && (
              <Link href={seeAllHref}>
                {/* Desktop: pill with label */}
                <span
                  className="hidden sm:flex items-center gap-1 font-heading uppercase cursor-pointer transition-all"
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.14em",
                    color: "rgba(196,154,40,0.55)",
                    border: "1px solid rgba(196,154,40,0.18)",
                    background: "rgba(196,154,40,0.04)",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "rgba(196,154,40,0.90)";
                    el.style.borderColor = "rgba(196,154,40,0.38)";
                    el.style.background = "rgba(196,154,40,0.08)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "rgba(196,154,40,0.55)";
                    el.style.borderColor = "rgba(196,154,40,0.18)";
                    el.style.background = "rgba(196,154,40,0.04)";
                  }}
                >
                  {seeAllLabel}
                  <ChevronRight className="w-3 h-3" />
                </span>
                {/* Mobile: icon only */}
                <span
                  className="sm:hidden flex items-center justify-center w-7 h-7 rounded-full"
                  style={{
                    color: "rgba(196,154,40,0.55)",
                    border: "1px solid rgba(196,154,40,0.18)",
                    background: "rgba(196,154,40,0.04)",
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
                  background: "rgba(196,154,40,0.06)",
                  border: "1px solid rgba(196,154,40,0.15)",
                  color: "rgba(196,154,40,0.6)",
                }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "rgba(196,154,40,0.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(196,154,40,0.06)"; }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(196,154,40,0.06)",
                  border: "1px solid rgba(196,154,40,0.15)",
                  color: "rgba(196,154,40,0.6)",
                }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "rgba(196,154,40,0.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(196,154,40,0.06)"; }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
