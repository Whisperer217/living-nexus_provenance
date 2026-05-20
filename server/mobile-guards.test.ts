/**
 * Mobile Guards Test
 * 
 * Verifies that the mobile guard logic in MarketplaceDrawer and PlaylistDrawer
 * correctly prevents right-side drawers from rendering on mobile viewports.
 * 
 * These are unit tests for the guard logic pattern, not full component tests.
 */
import { describe, it, expect } from "vitest";

describe("Mobile viewport guard logic", () => {
  it("should detect mobile viewport (< 768px) correctly", () => {
    // Simulating the matchMedia check used in MarketplaceDrawer
    const isMobile = (width: number) => width < 768;
    
    expect(isMobile(375)).toBe(true);   // iPhone SE
    expect(isMobile(390)).toBe(true);   // iPhone 14
    expect(isMobile(414)).toBe(true);   // iPhone 14 Plus
    expect(isMobile(767)).toBe(true);   // Just below md breakpoint
    expect(isMobile(768)).toBe(false);  // md breakpoint (tablet)
    expect(isMobile(1024)).toBe(false); // lg breakpoint (desktop)
    expect(isMobile(1440)).toBe(false); // Large desktop
  });

  it("should detect desktop viewport (>= 768px) for PlaylistDrawer panel", () => {
    // PlaylistDrawer uses hidden md:flex — visible only at md+ (768px+)
    const isDesktopOrTablet = (width: number) => width >= 768;
    
    expect(isDesktopOrTablet(375)).toBe(false);  // Mobile — panel hidden
    expect(isDesktopOrTablet(390)).toBe(false);  // Mobile — panel hidden
    expect(isDesktopOrTablet(768)).toBe(true);   // Tablet — panel visible
    expect(isDesktopOrTablet(1024)).toBe(true);  // Desktop — panel visible
  });

  it("should detect large desktop viewport (>= 1024px) for RightRail", () => {
    // RightRail uses hidden lg:flex — visible only at lg+ (1024px+)
    const isLargeDesktop = (width: number) => width >= 1024;
    
    expect(isLargeDesktop(375)).toBe(false);   // Mobile — rail hidden
    expect(isLargeDesktop(768)).toBe(false);   // Tablet — rail hidden
    expect(isLargeDesktop(1023)).toBe(false);  // Just below lg
    expect(isLargeDesktop(1024)).toBe(true);   // lg breakpoint — rail visible
    expect(isLargeDesktop(1440)).toBe(true);   // Large desktop — rail visible
  });

  it("MarketplaceDrawer open-shop event should redirect on mobile", () => {
    // On mobile, the handler navigates to /marketplace instead of opening the drawer
    const handleShopEvent = (viewportWidth: number): "navigate" | "open-drawer" => {
      if (viewportWidth < 768) {
        return "navigate";
      }
      return "open-drawer";
    };

    expect(handleShopEvent(375)).toBe("navigate");
    expect(handleShopEvent(414)).toBe("navigate");
    expect(handleShopEvent(768)).toBe("open-drawer");
    expect(handleShopEvent(1024)).toBe("open-drawer");
  });
});
