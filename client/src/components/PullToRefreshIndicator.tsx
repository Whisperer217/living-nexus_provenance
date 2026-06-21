/**
 * PullToRefreshIndicator
 *
 * A fixed-position overlay that renders the CometSpinner during pull-to-refresh.
 * Sits at the top of the viewport, translates down as the user drags,
 * and disappears after the refresh completes.
 *
 * Usage: render once per page, pass state from usePullToRefresh.
 */

import React from "react";
import { CometSpinner } from "./CometSpinner";

interface PullToRefreshIndicatorProps {
  pullProgress: number;   // 0–1
  isRefreshing: boolean;
  indicatorY: number;     // px translateY
}

export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
  indicatorY,
}: PullToRefreshIndicatorProps) {
  const visible = pullProgress > 0 || isRefreshing;
  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      aria-label={isRefreshing ? "Refreshing content" : "Pull to refresh"}
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: `translateX(-50%) translateY(${indicatorY}px)`,
        zIndex: 9999,
        pointerEvents: "none",
        transition: isRefreshing ? "transform 0.2s ease-out" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {/* Backdrop pill */}
      <div
        style={{
          background: "rgba(10, 8, 4, 0.88)",
          border: "1px solid rgba(196, 154, 40, 0.35)",
          borderRadius: "999px",
          padding: "8px 16px 8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 16px rgba(196,154,40,0.08)",
        }}
      >
        <CometSpinner
          progress={pullProgress}
          spinning={isRefreshing}
          size={36}
        />
        <span
          style={{
            fontFamily: "var(--font-heading, 'Cinzel', serif)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isRefreshing ? "#E8C547" : `rgba(232, 197, 71, ${0.4 + pullProgress * 0.6})`,
            transition: "color 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {isRefreshing ? "Refreshing…" : pullProgress >= 1 ? "Release" : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
