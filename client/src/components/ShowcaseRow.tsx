import { useRef, useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { ConstellationReveal } from "@/components/ConstellationReveal";

interface ShowcaseRowProps {
  title: string;
  seeAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export function ShowcaseRow({ title, seeAllHref, children, className = "" }: ShowcaseRowProps) {
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
    <ConstellationReveal className={`mb-10 overflow-hidden ${className}`} dotCount={5}>
      <section>
        {/* Section header — revealed as part of constellation formation */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2
              className="font-heading tracking-wide"
              style={{
                fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
                color: "#E8DFC8",
                letterSpacing: "0.06em",
              }}
            >
              {title}
            </h2>
            {seeAllHref && (
              <Link href={seeAllHref}>
                <span
                  className="flex items-center gap-0.5 text-sm transition-colors cursor-pointer"
                  style={{ color: "rgba(196,154,40,0.35)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(196,154,40,0.75)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(196,154,40,0.35)")}
                >
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            )}
          </div>
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
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = "rgba(196,154,40,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(196,154,40,0.06)")}
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
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = "rgba(196,154,40,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(196,154,40,0.06)")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollPaddingLeft: "1rem", paddingRight: "2rem" }}
        >
          {children}
        </div>
      </section>
    </ConstellationReveal>
  );
}
