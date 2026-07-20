/**
 * Living Nexus Design System — Navigation & Overlays
 * ════════════════════════════════════════════════════════════════════
 * Navigation patterns and overlay components.
 * All built from design tokens. No page-specific logic.
 *
 * Components:
 *   LnNavItem       — sidebar/rail navigation item
 *   LnTabs          — tabbed section switcher
 *   LnModal         — centered modal dialog
 *   LnSheet         — bottom/side sheet drawer
 *   LnTooltip       — hover tooltip
 *   LnBreadcrumb    — page breadcrumb trail
 *   LnContextMenu   — right-click / action menu
 *   LnEmptyState    — empty content placeholder
 *   LnPageHeader    — standard page title + actions bar
 * ════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ── LnNavItem ─────────────────────────────────────────────────────────────────

interface LnNavItemProps {
  /** Icon component */
  icon: React.ReactNode;
  /** Label text */
  label: string;
  /** Active/current state */
  active?: boolean;
  /** Collapsed mode — icon only */
  collapsed?: boolean;
  /** Notification badge count */
  badge?: number;
  /** Click handler */
  onClick?: () => void;
  className?: string;
}

export function LnNavItem({ icon, label, active, collapsed, badge, onClick, className }: LnNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 w-full",
        "px-3 py-2.5 rounded-lg",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(196,154,40,0.80)]",
        active
          ? "bg-[rgba(196,154,40,0.12)] text-[#C49A28]"
          : "text-[#6B6555] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#D8C9A8]",
        collapsed && "justify-center px-2",
        className
      )}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {/* Active indicator bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
          style={{ background: "#C49A28", boxShadow: "0 0 8px rgba(196,154,40,0.60)" }}
        />
      )}

      {/* Icon */}
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 20, height: 20 }}
      >
        {icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <span
          className="text-[13px] font-medium tracking-[0.015em] truncate"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {label}
        </span>
      )}

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "flex-shrink-0 min-w-[18px] h-[18px] px-1",
            "rounded-full text-[10px] font-bold flex items-center justify-center",
            collapsed ? "absolute -top-0.5 -right-0.5" : "ml-auto"
          )}
          style={{
            background: "#C49A28",
            color: "#000000",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ── LnTabs ────────────────────────────────────────────────────────────────────

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface LnTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Stretch tabs to fill container */
  fullWidth?: boolean;
  /** Compact — smaller padding */
  compact?: boolean;
  className?: string;
}

export function LnTabs({ tabs, activeTab, onTabChange, fullWidth, compact, className }: LnTabsProps) {
  return (
    <div
      className={cn("flex items-center gap-0.5 p-0.5 rounded-lg", className)}
      style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.12)" }}
      role="tablist"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          className={cn(
            "relative flex items-center gap-1.5",
            "rounded-md transition-all duration-150",
            compact ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
            fullWidth && "flex-1 justify-center",
            activeTab === tab.id
              ? "bg-[rgba(196,154,40,0.18)] text-[#C49A28] shadow-[0_1px_4px_rgba(0,0,0,0.30)]"
              : "text-[#6B6555] hover:text-[#D8C9A8] disabled:opacity-40 disabled:cursor-not-allowed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(196,154,40,0.80)]"
          )}
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
        >
          {tab.icon && (
            <span className="flex-shrink-0" style={{ width: 14, height: 14 }}>
              {tab.icon}
            </span>
          )}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className="text-[10px] px-1 py-0.5 rounded"
              style={{
                background: activeTab === tab.id ? "rgba(196,154,40,0.25)" : "rgba(255,255,255,0.08)",
                color: activeTab === tab.id ? "#C49A28" : "#6B6555",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── LnModal ───────────────────────────────────────────────────────────────────

interface LnModalProps {
  /** Open state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Subtitle / description */
  description?: string;
  /** Width variant */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Prevent close on backdrop click */
  persistent?: boolean;
  children?: React.ReactNode;
  /** Footer actions */
  footer?: React.ReactNode;
}

const MODAL_SIZES: Record<string, string> = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-2xl",
  full: "max-w-[90vw]",
};

export function LnModal({ open, onClose, title, description, size = "md", persistent, children, footer }: LnModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !persistent) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, persistent]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "ln-modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => !persistent && onClose()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full rounded-2xl overflow-hidden",
          "animate-fade-up",
          MODAL_SIZES[size]
        )}
        style={{
          background: "rgba(10,8,18,0.99)",
          border: "1px solid rgba(212,175,55,0.28)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.80), 0 0 0 1px rgba(212,175,55,0.12)",
        }}
      >
        {/* Header */}
        {(title || description) && (
          <div
            className="px-6 pt-6 pb-4"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
          >
            {title && (
              <h2
                id="ln-modal-title"
                className="text-[18px] font-semibold tracking-[0.04em]"
                style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0" }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className="mt-1 text-[13px] leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          style={{ color: "#6B6555" }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="px-6 pb-6 pt-4 flex items-center justify-end gap-3"
            style={{ borderTop: "1px solid rgba(196,154,40,0.12)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LnSheet ───────────────────────────────────────────────────────────────────

interface LnSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sheet origin side */
  side?: "bottom" | "right" | "left";
  /** Sheet title */
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function LnSheet({ open, onClose, side = "bottom", title, children, className }: LnSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sideClasses: Record<string, string> = {
    bottom: "bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]",
    right:  "top-0 right-0 bottom-0 rounded-l-2xl w-full max-w-sm",
    left:   "top-0 left-0 bottom-0 rounded-r-2xl w-full max-w-sm",
  };

  return (
    <div className="fixed inset-0 z-[9999] flex" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute overflow-y-auto",
          sideClasses[side],
          className
        )}
        style={{
          background: "rgba(8,6,16,0.99)",
          border: "1px solid rgba(212,175,55,0.28)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.70)",
        }}
      >
        {/* Handle bar — bottom sheet only */}
        {side === "bottom" && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(196,154,40,0.30)" }} />
          </div>
        )}

        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
          >
            <h3
              className="text-[16px] font-semibold tracking-[0.04em]"
              style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0" }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              style={{ color: "#6B6555" }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── LnTooltip ─────────────────────────────────────────────────────────────────

interface LnTooltipProps {
  /** Tooltip text */
  content: string;
  /** Tooltip position */
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}

export function LnTooltip({ content, side = "top", children }: LnTooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const positionClass: Record<string, string> = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            "absolute z-[9999] pointer-events-none",
            "px-2.5 py-1.5 rounded-md",
            "text-[12px] font-medium whitespace-nowrap",
            "animate-fade-up",
            positionClass[side]
          )}
          style={{
            background: "rgba(26,26,26,0.98)",
            border: "1px solid rgba(196,154,40,0.28)",
            color: "#EDE5D0",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 16px rgba(0,0,0,0.60)",
          }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ── LnBreadcrumb ──────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface LnBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function LnBreadcrumb({ items, className }: LnBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M4 2l4 4-4 4" stroke="rgba(196,154,40,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isLast ? (
              <span
                className="text-[12px] font-medium tracking-[0.02em]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#EDE5D0" }}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-[12px] tracking-[0.02em] transition-colors hover:text-[#C49A28]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ── LnEmptyState ──────────────────────────────────────────────────────────────

interface LnEmptyStateProps {
  /** Icon component */
  icon?: React.ReactNode;
  /** Primary message */
  title: string;
  /** Secondary description */
  description?: string;
  /** CTA button */
  action?: React.ReactNode;
  className?: string;
}

export function LnEmptyState({ icon, title, description, action, className }: LnEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-16 px-8",
        className
      )}
    >
      {icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "rgba(196,154,40,0.08)",
            border: "1px solid rgba(196,154,40,0.18)",
            color: "rgba(196,154,40,0.50)",
          }}
        >
          {icon}
        </div>
      )}
      <h3
        className="text-[16px] font-semibold tracking-[0.04em] mb-2"
        style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0" }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-[13px] leading-relaxed max-w-xs mb-6"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ── LnPageHeader ──────────────────────────────────────────────────────────────

interface LnPageHeaderProps {
  /** Page title */
  title: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Overline label above title */
  overline?: string;
  /** Right-side actions */
  actions?: React.ReactNode;
  /** Breadcrumb items */
  breadcrumb?: BreadcrumbItem[];
  className?: string;
}

export function LnPageHeader({ title, subtitle, overline, actions, breadcrumb, className }: LnPageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        {breadcrumb && <LnBreadcrumb items={breadcrumb} className="mb-2" />}
        {overline && (
          <span
            className="text-[11px] tracking-[0.20em] uppercase mb-1"
            style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
          >
            {overline}
          </span>
        )}
        <h1
          className="text-[28px] md:text-[36px] font-semibold tracking-[0.06em]"
          style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0", lineHeight: 1.1 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[14px] leading-relaxed mt-1"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {actions}
        </div>
      )}
    </div>
  );
}

// ── LnContextMenu ─────────────────────────────────────────────────────────────

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface LnContextMenuProps {
  items: ContextMenuItem[];
  open: boolean;
  onClose: () => void;
  /** Position relative to trigger */
  position?: { x: number; y: number };
  className?: string;
}

export function LnContextMenu({ items, open, onClose, position, className }: LnContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn("fixed z-[9999] py-1 rounded-xl min-w-[160px] animate-fade-up", className)}
      style={{
        top: position?.y ?? 0,
        left: position?.x ?? 0,
        background: "rgba(10,8,18,0.99)",
        border: "1px solid rgba(212,175,55,0.28)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.70)",
      }}
      role="menu"
    >
      {items.map(item => (
        <button
          key={item.id}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => { item.onClick(); onClose(); }}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2",
            "text-[13px] font-medium transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            item.destructive
              ? "text-[#FCA5A5] hover:bg-[rgba(248,113,113,0.10)]"
              : "text-[#D8C9A8] hover:bg-[rgba(196,154,40,0.08)] hover:text-[#EDE5D0]"
          )}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {item.icon && (
            <span className="flex-shrink-0" style={{ width: 16, height: 16, color: item.destructive ? "#F87171" : "#6B6555" }}>
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}
