/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — BookSpineTabs
   Vertical protruding spine tabs for side drawers.
   Mimics the tabbed dividers of a living reference book.
   
   Usage:
     <BookSpineTabs
       side="left"          // tabs protrude from right edge of left drawer
       tabs={[...]}
       activeTab="playing"
       onTabChange={setTab}
       drawerOpen={open}
       onDrawerToggle={onToggle}
       topOffset={52}       // below the nav bar
     />
   
   side="left"  → tabs stick out from the RIGHT edge of the drawer
   side="right" → tabs stick out from the LEFT edge of the drawer
═══════════════════════════════════════════════════════════════════ */

import React from "react";

export interface BookTab {
  id: string;
  label: string;
  icon?: React.ElementType;
  /** Optional dot indicator (e.g. live pulse) */
  dot?: boolean;
}

interface BookSpineTabsProps {
  side: "left" | "right";
  tabs: BookTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  drawerOpen: boolean;
  onDrawerToggle: () => void;
  /** px offset from top of viewport (below nav bar). Default 52 */
  topOffset?: number;
  /** px width of the drawer panel. Default 272 */
  drawerWidth?: number;
}

export default function BookSpineTabs({
  side,
  tabs,
  activeTab,
  onTabChange,
  drawerOpen,
  onDrawerToggle,
  topOffset = 52,
  drawerWidth = 272,
}: BookSpineTabsProps) {
  const TAB_H = 72;   // height of each tab in px
  const TAB_W = 26;   // width of the protruding tab
  const GAP = 2;      // gap between tabs

  return (
    <>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes lnSpinePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .ln-spine-tab {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease,
            transform 0.15s ease;
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        .ln-spine-tab.side-left {
          right: -${TAB_W - 1}px;
          border-radius: 0 6px 6px 0;
          border-top: 1px solid rgba(196,154,40,0.35);
          border-right: 1px solid rgba(196,154,40,0.35);
          border-bottom: 1px solid rgba(196,154,40,0.35);
          border-left: none;
        }
        .ln-spine-tab.side-right {
          left: -${TAB_W - 1}px;
          border-radius: 6px 0 0 6px;
          border-top: 1px solid rgba(196,154,40,0.35);
          border-left: 1px solid rgba(196,154,40,0.35);
          border-bottom: 1px solid rgba(196,154,40,0.35);
          border-right: none;
        }
        .ln-spine-tab.active {
          background: linear-gradient(180deg, rgba(196,154,40,0.22) 0%, rgba(196,154,40,0.10) 100%);
          box-shadow: ${side === "left"
            ? "3px 0 12px rgba(196,154,40,0.25), inset -1px 0 0 rgba(196,154,40,0.15)"
            : "-3px 0 12px rgba(196,154,40,0.25), inset 1px 0 0 rgba(196,154,40,0.15)"};
          border-color: rgba(196,154,40,0.65) !important;
        }
        .ln-spine-tab.inactive {
          background: rgba(14,12,8,0.92);
          box-shadow: none;
        }
        .ln-spine-tab.inactive:hover {
          background: rgba(196,154,40,0.06);
          border-color: rgba(196,154,40,0.5) !important;
        }
        .ln-spine-tab-label {
          font-family: 'Cinzel', 'Orbitron', serif;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          /* rotate so text reads top-to-bottom */
          transform: rotate(180deg);
          line-height: 1;
        }
      `}</style>

      {/* The spine tab strip — absolutely positioned relative to the drawer panel */}
      {/* This is rendered INSIDE the drawer panel so it moves with it */}
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        const top = i * (TAB_H + GAP);

        return (
          <div
            key={tab.id}
            className={`ln-spine-tab side-${side} ${isActive ? "active" : "inactive"}`}
            style={{
              top: `${top}px`,
              width: `${TAB_W}px`,
              height: `${TAB_H}px`,
              zIndex: isActive ? 2 : 1,
              // Active tab lifts slightly toward the viewer
              transform: isActive
                ? side === "left" ? "translateX(1px)" : "translateX(-1px)"
                : "translateX(0)",
            }}
            onClick={() => {
              if (isActive && drawerOpen) {
                // Clicking the active tab again collapses the drawer
                onDrawerToggle();
              } else {
                if (!drawerOpen) onDrawerToggle();
                onTabChange(tab.id);
              }
            }}
            title={tab.label}
            role="tab"
            aria-selected={isActive}
          >
            {/* Dot indicator (e.g. live pulse) */}
            {tab.dot && (
              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  animation: "lnSpinePulse 1.5s infinite",
                  [side === "left" ? "right" : "left"]: "5px",
                }}
              />
            )}
            {/* Icon */}
            {tab.icon && (
              <tab.icon
                size={10}
                style={{
                  color: isActive ? "var(--ln-gold)" : "rgba(196,154,40,0.45)",
                  marginBottom: "4px",
                  transform: "rotate(180deg)",
                  flexShrink: 0,
                }}
              />
            )}
            {/* Label */}
            <span
              className="ln-spine-tab-label"
              style={{
                color: isActive ? "var(--ln-gold)" : "rgba(196,154,40,0.45)",
              }}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
    </>
  );
}
