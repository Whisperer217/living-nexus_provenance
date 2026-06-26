/**
 * useScrollReveal — Intersection Observer hook for scroll-activated section elevation.
 *
 * Usage:
 *   const ref = useScrollReveal<HTMLDivElement>();
 *   <div ref={ref} className="scroll-reveal scroll-reveal-delay-2">...</div>
 *
 * When the element enters the viewport (threshold 0.12), the "revealed" class is added,
 * triggering the CSS transition from translateY(20px)/opacity:0 to translateY(0)/opacity:1.
 *
 * Performance: uses a single shared IntersectionObserver per component instance.
 * All animations are GPU-accelerated (transform + opacity only).
 */
import { useEffect, useRef } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean; // default true — don't re-animate on scroll back
}

export function useScrollReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.12, rootMargin = "0px 0px -40px 0px", once = true } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove("revealed");
          }
        });
      },
      { threshold, rootMargin }
    );

    // Observe all children with .scroll-reveal class, plus the element itself
    const targets = [
      ...(el.classList.contains("scroll-reveal") ? [el] : []),
      ...Array.from(el.querySelectorAll<HTMLElement>(".scroll-reveal")),
    ];

    targets.forEach((t) => observer.observe(t));

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}
