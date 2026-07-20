/**
 * Living Nexus Design System — Documentation Page
 * ════════════════════════════════════════════════════════════════════
 * Living storybook at /design-system
 * Shows every token, component, and usage rule.
 * Admin-only access — not linked in public navigation.
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  // Tokens
  COLOR_SURFACE, COLOR_TEXT, COLOR_GOLD, COLOR_STATUS, COLOR_MEDIUM,
  FONT_FAMILY, RADIUS, SHADOW, GLOW, BORDER, DURATION, Z_INDEX, LAYOUT,
  // Primitives
  LnButton, LnBadge, LnDivider, LnAvatar, LnTag, LnOverline, LnText,
  LnSpinner, LnLiveWave, LnPulseDot,
  // Surfaces
  LnCard, LnCardInfo, LnFormField, LnInput, LnTextarea, LnSelect,
  LnCheckbox, LnRadio,
  // Navigation
  LnNavItem, LnTabs, LnModal, LnSheet, LnTooltip, LnBreadcrumb,
  LnEmptyState, LnPageHeader,
  // Platform
  WIDBadge, ProvenancePill, HarmonicBar, KeeperChip, SanctuarySlot,
  NexusPointBadge, WitnessCount, OriginStamp, MediumPill, CreatorCard, TrackRow,
} from "@/design-system";
import {
  Music, BookOpen, Scroll, Gamepad2, Eye, Layers, Home, Star,
  Settings, Bell, Search, ChevronRight, Plus, Trash2, Edit3,
  Shield, Zap, Globe, Lock, Heart, Share2, Download, Upload,
} from "lucide-react";

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-20">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: "linear-gradient(to bottom, #C49A28, rgba(196,154,40,0.20))" }}
        />
        <h2
          className="text-[22px] font-semibold tracking-[0.06em]"
          style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h3
        className="text-[14px] font-semibold tracking-[0.10em] uppercase mb-4"
        style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function TokenRow({ name, value, preview }: { name: string; value: string; preview?: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {preview && <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center">{preview}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ fontFamily: "'Space Mono', monospace", color: "#C49A28" }}>{name}</p>
        <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}>{value}</p>
      </div>
    </div>
  );
}

function ShowcaseRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] tracking-[0.08em] uppercase mb-2" style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.40)" }}>
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ── TOC ───────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "colors",      label: "Color Tokens" },
  { id: "typography",  label: "Typography" },
  { id: "spacing",     label: "Spacing & Radius" },
  { id: "shadows",     label: "Shadows & Glows" },
  { id: "motion",      label: "Motion" },
  { id: "zindex",      label: "Z-Index" },
  { id: "buttons",     label: "Buttons" },
  { id: "badges",      label: "Badges & Tags" },
  { id: "dividers",    label: "Dividers" },
  { id: "avatars",     label: "Avatars" },
  { id: "indicators",  label: "Indicators" },
  { id: "cards",       label: "Cards" },
  { id: "forms",       label: "Forms" },
  { id: "navigation",  label: "Navigation" },
  { id: "overlays",    label: "Overlays" },
  { id: "platform",    label: "Platform Components" },
  { id: "accessibility","label": "Accessibility" },
  { id: "laws",          label: "Architectural Laws" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [progress, setProgress] = useState(0.38);
  const [checkA, setCheckA] = useState(false);
  const [checkB, setCheckB] = useState(true);
  const [radioVal, setRadioVal] = useState("a");
  const [inputVal, setInputVal] = useState("");

  return (
    <div className="min-h-screen" style={{ background: "#000000" }}>
      {/* Hero */}
      <div
        className="relative px-6 py-16 md:py-24 text-center overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,154,40,0.07) 0%, transparent 70%), #000000",
          borderBottom: "1px solid rgba(196,154,40,0.18)",
        }}
      >
        <LnOverline ruled className="max-w-xs mx-auto mb-6">Living Nexus</LnOverline>
        <h1
          className="text-[40px] md:text-[56px] font-bold tracking-[0.08em] mb-4"
          style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0", lineHeight: 1.05 }}
        >
          Design System
        </h1>
        <p
          className="text-[16px] leading-relaxed max-w-xl mx-auto"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
        >
          The immutable design language of the platform. Every token, component, and pattern
          encoded here is the single source of truth. No page redesign begins without this.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <LnBadge variant="gold">v1.0</LnBadge>
          <LnBadge variant="published">0 TypeScript Errors</LnBadge>
          <LnBadge variant="wid">Sacred · Sovereign · Immutable</LnBadge>
        </div>
      </div>

      <div className="flex">
        {/* Sticky TOC sidebar */}
        <nav
          className="hidden lg:flex flex-col gap-1 w-56 flex-shrink-0 sticky top-0 h-screen overflow-y-auto py-8 px-4"
          style={{ borderRight: "1px solid rgba(196,154,40,0.10)" }}
        >
          <p
            className="text-[10px] tracking-[0.20em] uppercase mb-3 px-2"
            style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.40)" }}
          >
            Contents
          </p>
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-2 py-1.5 rounded text-[12px] transition-colors hover:text-[#C49A28]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555", textDecoration: "none" }}
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-6 md:px-10 py-12 max-w-4xl">

          {/* ── COLOR TOKENS ─────────────────────────────────────────────── */}
          <Section id="colors" title="Color Tokens">
            <Subsection title="Surface / Void">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(COLOR_SURFACE).map(([key, val]) => (
                  <TokenRow
                    key={key}
                    name={`COLOR_SURFACE.${key}`}
                    value={val}
                    preview={<div className="w-6 h-6 rounded" style={{ background: val, border: "1px solid rgba(255,255,255,0.10)" }} />}
                  />
                ))}
              </div>
            </Subsection>

            <Subsection title="Text / Quartzite">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(COLOR_TEXT).map(([key, val]) => (
                  <TokenRow
                    key={key}
                    name={`COLOR_TEXT.${key}`}
                    value={val}
                    preview={<div className="w-6 h-6 rounded" style={{ background: val }} />}
                  />
                ))}
              </div>
            </Subsection>

            <Subsection title="Gold / Quartzite Veining">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(COLOR_GOLD).map(([key, val]) => (
                  <TokenRow
                    key={key}
                    name={`COLOR_GOLD.${key}`}
                    value={val}
                    preview={<div className="w-6 h-6 rounded" style={{ background: val }} />}
                  />
                ))}
              </div>
            </Subsection>

            <Subsection title="Semantic Status">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(COLOR_STATUS).map(([key, val]) => (
                  <TokenRow
                    key={key}
                    name={`COLOR_STATUS.${key}`}
                    value={val}
                    preview={<div className="w-6 h-6 rounded" style={{ background: val }} />}
                  />
                ))}
              </div>
            </Subsection>

            <Subsection title="Medium Accent Colors">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_MEDIUM) as Array<keyof typeof COLOR_MEDIUM>).map(m => (
                  <div
                    key={m}
                    className="px-3 py-2 rounded-lg text-[12px] font-semibold border"
                    style={{
                      background: COLOR_MEDIUM[m].bg,
                      color: COLOR_MEDIUM[m].primary,
                      borderColor: COLOR_MEDIUM[m].border,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </Subsection>
          </Section>

          {/* ── TYPOGRAPHY ───────────────────────────────────────────────── */}
          <Section id="typography" title="Typography">
            <Subsection title="Font Families">
              <div className="space-y-4">
                {Object.entries(FONT_FAMILY).map(([key, val]) => (
                  <div key={key} className="flex items-baseline gap-4">
                    <span className="text-[11px] w-24 flex-shrink-0" style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}>{key}</span>
                    <span className="text-[20px]" style={{ fontFamily: val, color: "#EDE5D0" }}>
                      The quick brown fox
                    </span>
                  </div>
                ))}
              </div>
            </Subsection>

            <Subsection title="Type Scale">
              <div className="space-y-3">
                <LnText variant="h1">H1 — Cinzel Display</LnText>
                <LnText variant="h2">H2 — Cinzel Section</LnText>
                <LnText variant="h3">H3 — Cormorant Editorial</LnText>
                <LnText variant="h4">H4 — Cormorant Card Title</LnText>
                <LnText variant="body">Body — DM Sans paragraph text, designed for long-form reading at comfortable line height.</LnText>
                <LnText variant="caption">Caption — DM Sans small text for timestamps, metadata, and secondary information.</LnText>
                <LnText variant="overline">Overline — Cinzel Caps Label</LnText>
                <LnText variant="ui">UI — DM Sans medium weight for interface labels</LnText>
              </div>
            </Subsection>

            <Subsection title="Gold Text Treatment">
              <LnText variant="h2" gold>Sovereign Authorship</LnText>
              <LnText variant="h3" gold>The Chain of Record</LnText>
            </Subsection>
          </Section>

          {/* ── SPACING & RADIUS ─────────────────────────────────────────── */}
          <Section id="spacing" title="Spacing & Radius">
            <Subsection title="Border Radius">
              <div className="flex flex-wrap gap-4">
                {Object.entries(RADIUS).map(([key, val]) => (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div
                      className="w-12 h-12"
                      style={{
                        background: "rgba(196,154,40,0.12)",
                        border: "1px solid rgba(196,154,40,0.35)",
                        borderRadius: val,
                      }}
                    />
                    <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}>{key}</span>
                    <span className="text-[10px]" style={{ fontFamily: "'Space Mono', monospace", color: "#3D3A30" }}>{val}</span>
                  </div>
                ))}
              </div>
            </Subsection>
          </Section>

          {/* ── SHADOWS & GLOWS ──────────────────────────────────────────── */}
          <Section id="shadows" title="Shadows & Glows">
            <Subsection title="Elevation Shadows">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(SHADOW).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-4 rounded-xl flex items-center justify-center"
                    style={{ background: "#111111", boxShadow: val }}
                  >
                    <span className="text-[12px]" style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}>{key}</span>
                  </div>
                ))}
              </div>
            </Subsection>

            <Subsection title="Glow Treatments">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(GLOW).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-4 rounded-xl flex items-center justify-center"
                    style={{ background: "#111111", boxShadow: val }}
                  >
                    <span className="text-[12px]" style={{ fontFamily: "'Space Mono', monospace", color: "#C49A28" }}>{key}</span>
                  </div>
                ))}
              </div>
            </Subsection>

            <Subsection title="Border Treatments">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(BORDER).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl"
                    style={{ background: "#111111", border: val }}
                  >
                    <span className="text-[11px]" style={{ fontFamily: "'Space Mono', monospace", color: "#6B6555" }}>{key}</span>
                  </div>
                ))}
              </div>
            </Subsection>
          </Section>

          {/* ── MOTION ───────────────────────────────────────────────────── */}
          <Section id="motion" title="Motion">
            <Subsection title="Duration Scale">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(DURATION).map(([key, val]) => (
                  <TokenRow key={key} name={`DURATION.${key}`} value={val} />
                ))}
              </div>
            </Subsection>
            <Subsection title="Named Animations">
              <div className="flex flex-wrap gap-4">
                <div className="gold-shimmer text-[18px] font-bold" style={{ fontFamily: "'Cinzel', serif" }}>
                  Gold Shimmer
                </div>
                <div className="flex items-center gap-2">
                  <LnLiveWave />
                  <span className="text-[12px]" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>Live Wave</span>
                </div>
                <div className="flex items-center gap-2">
                  <LnPulseDot />
                  <span className="text-[12px]" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>Pulse Dot</span>
                </div>
                <div className="flex items-center gap-2">
                  <LnSpinner size={20} />
                  <span className="text-[12px]" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>Spinner</span>
                </div>
              </div>
            </Subsection>
          </Section>

          {/* ── Z-INDEX ───────────────────────────────────────────────────── */}
          <Section id="zindex" title="Z-Index Hierarchy">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(Z_INDEX).map(([key, val]) => (
                <TokenRow key={key} name={key} value={String(val)} />
              ))}
            </div>
          </Section>

          {/* ── BUTTONS ──────────────────────────────────────────────────── */}
          <Section id="buttons" title="Buttons">
            <Subsection title="Variants">
              <ShowcaseRow label="primary — CTA, most important action">
                <LnButton variant="primary" size="sm">Witness This Work</LnButton>
                <LnButton variant="primary">Upload a Work</LnButton>
                <LnButton variant="primary" size="lg">Begin Your Archive</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="secondary — supporting action">
                <LnButton variant="secondary" size="sm">Follow</LnButton>
                <LnButton variant="secondary">View Archive</LnButton>
                <LnButton variant="secondary" size="lg">Explore Sanctuary</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="ghost — tertiary, low emphasis">
                <LnButton variant="ghost" size="sm">Cancel</LnButton>
                <LnButton variant="ghost">Learn More</LnButton>
                <LnButton variant="ghost" size="lg">Skip for Now</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="outline — medium emphasis">
                <LnButton variant="outline" size="sm">Share</LnButton>
                <LnButton variant="outline">Edit Work</LnButton>
                <LnButton variant="outline" size="lg">Manage Archive</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="destructive — irreversible actions">
                <LnButton variant="destructive" size="sm">Remove</LnButton>
                <LnButton variant="destructive">Delete Work</LnButton>
                <LnButton variant="destructive" size="lg">Revoke License</LnButton>
              </ShowcaseRow>
            </Subsection>

            <Subsection title="States">
              <ShowcaseRow label="loading">
                <LnButton loading>Uploading...</LnButton>
                <LnButton variant="secondary" loading>Processing</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="disabled">
                <LnButton disabled>Unavailable</LnButton>
                <LnButton variant="secondary" disabled>Locked</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="with icons">
                <LnButton leftIcon={<Plus size={16} />}>Add Work</LnButton>
                <LnButton variant="secondary" rightIcon={<ChevronRight size={16} />}>Continue</LnButton>
                <LnButton variant="ghost" leftIcon={<Download size={16} />}>Export</LnButton>
              </ShowcaseRow>
              <ShowcaseRow label="icon-only">
                <LnButton variant="ghost" size="icon"><Settings size={18} /></LnButton>
                <LnButton variant="outline" size="icon"><Bell size={18} /></LnButton>
                <LnButton variant="secondary" size="icon"><Search size={18} /></LnButton>
              </ShowcaseRow>
            </Subsection>
          </Section>

          {/* ── BADGES & TAGS ────────────────────────────────────────────── */}
          <Section id="badges" title="Badges & Tags">
            <Subsection title="LnBadge Variants">
              <ShowcaseRow label="semantic status">
                <LnBadge variant="published">Published</LnBadge>
                <LnBadge variant="draft">Draft</LnBadge>
                <LnBadge variant="error">Error</LnBadge>
                <LnBadge variant="gold">Featured</LnBadge>
                <LnBadge variant="core">Core</LnBadge>
              </ShowcaseRow>
              <ShowcaseRow label="with dot indicator">
                <LnBadge variant="published" dot>Live</LnBadge>
                <LnBadge variant="draft" dot>Processing</LnBadge>
                <LnBadge variant="error" dot>Failed</LnBadge>
              </ShowcaseRow>
              <ShowcaseRow label="WID stamp">
                <LnBadge variant="wid">@handle.wid</LnBadge>
              </ShowcaseRow>
              <ShowcaseRow label="medium badges">
                {(["audio","lyrics","manuscript","comic","game","visual"] as const).map(m => (
                  <LnBadge key={m} variant="medium" medium={m}>{m}</LnBadge>
                ))}
              </ShowcaseRow>
            </Subsection>

            <Subsection title="LnTag">
              <ShowcaseRow label="genre tags">
                <LnTag>Soul</LnTag>
                <LnTag active>Jazz</LnTag>
                <LnTag>Electronic</LnTag>
                <LnTag onRemove={() => {}}>Hip-Hop</LnTag>
              </ShowcaseRow>
            </Subsection>

            <Subsection title="LnOverline">
              <ShowcaseRow label="plain">
                <LnOverline>Platform Section</LnOverline>
              </ShowcaseRow>
              <ShowcaseRow label="ruled">
                <LnOverline ruled className="w-64">The Archive</LnOverline>
              </ShowcaseRow>
            </Subsection>
          </Section>

          {/* ── DIVIDERS ─────────────────────────────────────────────────── */}
          <Section id="dividers" title="Dividers">
            <Subsection title="Variants">
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] mb-2" style={{ color: "#6B6555", fontFamily: "'Space Mono', monospace" }}>simple</p>
                  <LnDivider variant="simple" />
                </div>
                <div>
                  <p className="text-[11px] mb-2" style={{ color: "#6B6555", fontFamily: "'Space Mono', monospace" }}>wide</p>
                  <LnDivider variant="wide" />
                </div>
                <div>
                  <p className="text-[11px] mb-2" style={{ color: "#6B6555", fontFamily: "'Space Mono', monospace" }}>horizontal</p>
                  <LnDivider variant="horizontal" />
                </div>
                <div>
                  <p className="text-[11px] mb-2" style={{ color: "#6B6555", fontFamily: "'Space Mono', monospace" }}>section</p>
                  <LnDivider variant="section" label="Witnessed Works" icon={<Eye size={12} />} />
                </div>
              </div>
            </Subsection>
          </Section>

          {/* ── AVATARS ──────────────────────────────────────────────────── */}
          <Section id="avatars" title="Avatars">
            <ShowcaseRow label="sizes">
              <LnAvatar name="Asha Kione" size={24} />
              <LnAvatar name="Asha Kione" size={32} />
              <LnAvatar name="Asha Kione" size={40} />
              <LnAvatar name="Asha Kione" size={56} />
              <LnAvatar name="Asha Kione" size={72} />
            </ShowcaseRow>
            <ShowcaseRow label="with ring (verified/featured)">
              <LnAvatar name="Asha Kione" size={40} ring />
              <LnAvatar name="Asha Kione" size={56} ring />
            </ShowcaseRow>
            <ShowcaseRow label="with live dot">
              <LnAvatar name="Asha Kione" size={40} live />
              <LnAvatar name="Asha Kione" size={40} ring live />
            </ShowcaseRow>
          </Section>

          {/* ── INDICATORS ───────────────────────────────────────────────── */}
          <Section id="indicators" title="Indicators">
            <ShowcaseRow label="LnLiveWave — audio playing">
              <LnLiveWave />
              <LnLiveWave paused />
              <LnLiveWave color="#4ADE80" />
            </ShowcaseRow>
            <ShowcaseRow label="LnPulseDot — live indicator">
              <LnPulseDot />
              <LnPulseDot color="#4ADE80" />
              <LnPulseDot color="#A78BFA" />
              <LnPulseDot size={12} />
            </ShowcaseRow>
            <ShowcaseRow label="LnSpinner — loading">
              <LnSpinner size={16} />
              <LnSpinner size={24} />
              <LnSpinner size={32} />
              <LnSpinner color="#4ADE80" />
            </ShowcaseRow>
          </Section>

          {/* ── CARDS ────────────────────────────────────────────────────── */}
          <Section id="cards" title="Cards">
            <Subsection title="Museum Card (default)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LnCard variant="museum">
                  <div className="h-32 bg-[rgba(196,154,40,0.08)] flex items-center justify-center">
                    <Music size={32} style={{ color: "rgba(196,154,40,0.40)" }} />
                  </div>
                  <LnCardInfo>
                    <p className="text-[14px] font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "#EDE5D0" }}>
                      Midnight Testimony
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}>
                      Asha Kione
                    </p>
                  </LnCardInfo>
                </LnCard>
                <LnCard variant="museum" active>
                  <div className="h-32 bg-[rgba(196,154,40,0.12)] flex items-center justify-center">
                    <Music size={32} style={{ color: "rgba(196,154,40,0.60)" }} />
                  </div>
                  <LnCardInfo>
                    <p className="text-[14px] font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: "#C49A28" }}>
                      Active State
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}>
                      Gold border + glow
                    </p>
                  </LnCardInfo>
                </LnCard>
              </div>
            </Subsection>

            <Subsection title="Other Variants">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LnCard variant="flat" className="p-4">
                  <p className="text-[13px] font-medium mb-1" style={{ color: "#EDE5D0", fontFamily: "'DM Sans', sans-serif" }}>Flat</p>
                  <p className="text-[12px]" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>Minimal border, no hover lift</p>
                </LnCard>
                <LnCard variant="ghost" className="p-4">
                  <p className="text-[13px] font-medium mb-1" style={{ color: "#EDE5D0", fontFamily: "'DM Sans', sans-serif" }}>Ghost</p>
                  <p className="text-[12px]" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>No background, gold border</p>
                </LnCard>
                <LnCard variant="panel" className="p-4">
                  <p className="text-[13px] font-medium mb-1" style={{ color: "#EDE5D0", fontFamily: "'DM Sans', sans-serif" }}>Panel</p>
                  <p className="text-[12px]" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>Drawer/sidebar surface</p>
                </LnCard>
              </div>
            </Subsection>
          </Section>

          {/* ── FORMS ────────────────────────────────────────────────────── */}
          <Section id="forms" title="Forms">
            <Subsection title="LnInput">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <LnFormField label="Work Title" id="title-input">
                  <LnInput
                    id="title-input"
                    placeholder="Enter your work's title..."
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                  />
                </LnFormField>
                <LnFormField label="Search" id="search-input">
                  <LnInput
                    id="search-input"
                    placeholder="Search the archive..."
                    leftAdornment={<Search size={14} />}
                  />
                </LnFormField>
                <LnFormField label="Error State" error="This field is required" id="error-input">
                  <LnInput id="error-input" placeholder="Required field" error />
                </LnFormField>
                <LnFormField label="Testimony Field (gold when filled)" hint="Your testimony becomes part of the Chain of Record" id="testimony-input">
                  <LnInput
                    id="testimony-input"
                    placeholder="What does this work mean to you?"
                    testimony
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                  />
                </LnFormField>
              </div>
            </Subsection>

            <Subsection title="LnTextarea">
              <div className="max-w-md">
                <LnFormField label="Origin Story" hint="The story behind this work" id="origin-textarea">
                  <LnTextarea
                    id="origin-textarea"
                    placeholder="Tell the story of how this work came to be..."
                    rows={4}
                    testimony
                  />
                </LnFormField>
              </div>
            </Subsection>

            <Subsection title="LnSelect">
              <div className="max-w-xs">
                <LnFormField label="Creative Medium" id="medium-select">
                  <LnSelect id="medium-select" placeholder="Choose a medium">
                    <option value="audio" style={{ background: "#111111" }}>Music</option>
                    <option value="lyrics" style={{ background: "#111111" }}>Lyrics</option>
                    <option value="manuscript" style={{ background: "#111111" }}>Manuscript</option>
                    <option value="comic" style={{ background: "#111111" }}>Comic</option>
                    <option value="game" style={{ background: "#111111" }}>Game</option>
                    <option value="visual" style={{ background: "#111111" }}>Visual Work</option>
                  </LnSelect>
                </LnFormField>
              </div>
            </Subsection>

            <Subsection title="LnCheckbox & LnRadio">
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-col gap-3">
                  <LnCheckbox
                    id="check-a"
                    label="I have read the Covenant"
                    checked={checkA}
                    onChange={e => setCheckA(e.target.checked)}
                  />
                  <LnCheckbox
                    id="check-b"
                    label="I am the original creator"
                    checked={checkB}
                    onChange={e => setCheckB(e.target.checked)}
                  />
                  <LnCheckbox
                    id="check-c"
                    label="Disabled option"
                    disabled
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <LnRadio id="radio-a" name="license" value="a" label="Personal License" checked={radioVal === "a"} onChange={() => setRadioVal("a")} />
                  <LnRadio id="radio-b" name="license" value="b" label="Commercial License" checked={radioVal === "b"} onChange={() => setRadioVal("b")} />
                  <LnRadio id="radio-c" name="license" value="c" label="Disabled" disabled />
                </div>
              </div>
            </Subsection>
          </Section>

          {/* ── NAVIGATION ───────────────────────────────────────────────── */}
          <Section id="navigation" title="Navigation">
            <Subsection title="LnNavItem">
              <div
                className="w-56 p-2 rounded-xl"
                style={{ background: "#080808", border: "1px solid rgba(196,154,40,0.10)" }}
              >
                <LnNavItem icon={<Home size={18} />} label="Home" active />
                <LnNavItem icon={<Music size={18} />} label="Archive" />
                <LnNavItem icon={<Eye size={18} />} label="Witnessed" badge={12} />
                <LnNavItem icon={<Star size={18} />} label="Sanctuary" />
                <LnNavItem icon={<Settings size={18} />} label="Settings" />
              </div>
            </Subsection>

            <Subsection title="LnTabs">
              <div className="space-y-4">
                <LnTabs
                  tabs={[
                    { id: "overview", label: "Overview" },
                    { id: "works", label: "Works", count: 24 },
                    { id: "witnesses", label: "Witnesses", count: 1847 },
                    { id: "provenance", label: "Provenance" },
                  ]}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
                <LnTabs
                  tabs={[
                    { id: "a", label: "Music", icon: <Music size={12} /> },
                    { id: "b", label: "Lyrics", icon: <BookOpen size={12} /> },
                    { id: "c", label: "Manuscripts", icon: <Scroll size={12} /> },
                  ]}
                  activeTab="a"
                  onTabChange={() => {}}
                  compact
                />
              </div>
            </Subsection>

            <Subsection title="LnBreadcrumb">
              <LnBreadcrumb
                items={[
                  { label: "Archive", onClick: () => {} },
                  { label: "Music", onClick: () => {} },
                  { label: "Midnight Testimony" },
                ]}
              />
            </Subsection>
          </Section>

          {/* ── OVERLAYS ─────────────────────────────────────────────────── */}
          <Section id="overlays" title="Overlays">
            <Subsection title="LnModal">
              <LnButton onClick={() => setModalOpen(true)}>Open Modal</LnButton>
              <LnModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Witness This Work"
                description="Your testimony will be permanently recorded in the Chain of Record."
                footer={
                  <>
                    <LnButton variant="ghost" onClick={() => setModalOpen(false)}>Cancel</LnButton>
                    <LnButton onClick={() => setModalOpen(false)}>Confirm Witness</LnButton>
                  </>
                }
              >
                <LnFormField label="Your Testimony" hint="Optional — what does this work mean to you?">
                  <LnTextarea placeholder="Share your witness..." rows={3} />
                </LnFormField>
              </LnModal>
            </Subsection>

            <Subsection title="LnSheet">
              <LnButton variant="secondary" onClick={() => setSheetOpen(true)}>Open Bottom Sheet</LnButton>
              <LnSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title="Track Actions"
              >
                <div className="flex flex-col gap-2">
                  <LnButton variant="ghost" fullWidth leftIcon={<Heart size={16} />}>Witness This Work</LnButton>
                  <LnButton variant="ghost" fullWidth leftIcon={<Share2 size={16} />}>Share</LnButton>
                  <LnButton variant="ghost" fullWidth leftIcon={<Download size={16} />}>Download</LnButton>
                  <LnDivider variant="horizontal" className="my-1" />
                  <LnButton variant="destructive" fullWidth leftIcon={<Trash2 size={16} />}>Remove from Archive</LnButton>
                </div>
              </LnSheet>
            </Subsection>

            <Subsection title="LnTooltip">
              <div className="flex gap-4">
                <LnTooltip content="Witness Identity Document">
                  <LnButton variant="secondary" size="sm">Hover for Tooltip</LnButton>
                </LnTooltip>
                <LnTooltip content="90% to creator" side="right">
                  <LnButton variant="ghost" size="sm">Covenant Split</LnButton>
                </LnTooltip>
              </div>
            </Subsection>

            <Subsection title="LnEmptyState">
              <LnCard variant="flat">
                <LnEmptyState
                  icon={<Music size={28} />}
                  title="No Works Yet"
                  description="Your archive is empty. Upload your first work to begin your sovereign creative record."
                  action={<LnButton leftIcon={<Upload size={16} />}>Upload a Work</LnButton>}
                />
              </LnCard>
            </Subsection>
          </Section>

          {/* ── PLATFORM COMPONENTS ──────────────────────────────────────── */}
          <Section id="platform" title="Platform Components">
            <Subsection title="WIDBadge — Witness Identity Document">
              <ShowcaseRow label="standard">
                <WIDBadge handle="@asha.kione" />
                <WIDBadge handle="@asha.kione" verified />
                <WIDBadge handle="@asha.kione" pulse />
              </ShowcaseRow>
              <ShowcaseRow label="compact">
                <WIDBadge handle="@asha.kione" compact />
                <WIDBadge handle="@asha.kione" compact verified />
              </ShowcaseRow>
            </Subsection>

            <Subsection title="ProvenancePill — Chain of Record">
              <ShowcaseRow label="provenance types">
                <ProvenancePill type="original" />
                <ProvenancePill type="fork" generation={1} />
                <ProvenancePill type="transformation" generation={2} />
                <ProvenancePill type="collaboration" />
              </ShowcaseRow>
            </Subsection>

            <Subsection title="HarmonicBar — Playback Progress">
              <div className="max-w-sm space-y-4">
                <HarmonicBar progress={progress} playing onSeek={setProgress} showTime currentTime={progress * 240} duration={240} />
                <HarmonicBar progress={0.65} height={6} />
                <HarmonicBar progress={0.20} height={2} />
              </div>
            </Subsection>

            <Subsection title="KeeperChip — Keeper Archetypes">
              <ShowcaseRow label="all archetypes">
                {(["Guide","Conductor","Witness","Custodian","Archivist","Cipher"] as const).map(a => (
                  <KeeperChip key={a} archetype={a} />
                ))}
              </ShowcaseRow>
              <ShowcaseRow label="compact (icon only)">
                {(["Guide","Conductor","Witness","Custodian","Archivist","Cipher"] as const).map(a => (
                  <KeeperChip key={a} archetype={a} compact showLabel={false} />
                ))}
              </ShowcaseRow>
            </Subsection>

            <Subsection title="SanctuarySlot — Live Spaces">
              <div className="space-y-2 max-w-sm">
                <SanctuarySlot status="live" title="Sunday Testimony Session" host="@asha.kione" listeners={47} />
                <SanctuarySlot status="open" title="Open Mic — Jazz & Soul" host="@marcus.bell" />
                <SanctuarySlot status="upcoming" title="The Midnight Archive" host="@cipher.seven" />
                <SanctuarySlot status="closed" title="Friday Freestyle" host="@nova.wright" />
              </div>
              <ShowcaseRow label="compact">
                <SanctuarySlot status="live" compact listeners={47} />
                <SanctuarySlot status="open" compact />
                <SanctuarySlot status="upcoming" compact />
                <SanctuarySlot status="closed" compact />
              </ShowcaseRow>
            </Subsection>

            <Subsection title="NexusPointBadge — ◈ Currency">
              <ShowcaseRow label="sizes">
                <NexusPointBadge amount={1250} size="sm" />
                <NexusPointBadge amount={1250} size="md" />
                <NexusPointBadge amount={1250} size="lg" />
              </ShowcaseRow>
              <ShowcaseRow label="shimmer">
                <NexusPointBadge amount={1250} shimmer />
              </ShowcaseRow>
            </Subsection>

            <Subsection title="WitnessCount & OriginStamp">
              <ShowcaseRow label="witness counts">
                <WitnessCount count={1} />
                <WitnessCount count={247} />
                <WitnessCount count={12847} />
                <WitnessCount count={247} compact />
              </ShowcaseRow>
              <ShowcaseRow label="origin stamps">
                <OriginStamp timestamp="2024-01-15T00:00:00Z" />
                <OriginStamp timestamp="2024-01-15T00:00:00Z" compact />
              </ShowcaseRow>
            </Subsection>

            <Subsection title="MediumPill — Creative Medium">
              <ShowcaseRow label="all mediums">
                {(["audio","lyrics","manuscript","comic","game","visual"] as const).map(m => (
                  <MediumPill key={m} medium={m} />
                ))}
              </ShowcaseRow>
            </Subsection>

            <Subsection title="CreatorCard — Creator Identity">
              <div className="max-w-sm space-y-2">
                <CreatorCard
                  name="Asha Kione"
                  widHandle="@asha.kione"
                  archetype="Guide"
                  workCount={24}
                  witnessCount={1847}
                  verified
                />
                <CreatorCard
                  name="Marcus Bell"
                  widHandle="@marcus.bell"
                  archetype="Conductor"
                  workCount={8}
                  witnessCount={342}
                />
              </div>
            </Subsection>

            <Subsection title="TrackRow — Track List">
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(196,154,40,0.10)" }}
              >
                <TrackRow index={1} title="Midnight Testimony" artist="Asha Kione" duration={247} witnesses={1847} playing />
                <TrackRow index={2} title="Sunday Morning" artist="Marcus Bell" duration={183} witnesses={342} />
                <TrackRow index={3} title="The Archive Speaks" artist="Nova Wright" duration={312} witnesses={89} />
              </div>
            </Subsection>
          </Section>

          {/* ── ACCESSIBILITY ────────────────────────────────────────────── */}
          <Section id="accessibility" title="Accessibility">
            <div className="space-y-4">
              <LnCard variant="flat" className="p-5">
                <h3 className="text-[15px] font-semibold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "#EDE5D0" }}>
                  Rules
                </h3>
                <div className="space-y-2">
                  {[
                    "All interactive elements have a minimum 44×44px touch target (WCAG 2.5.5)",
                    "Focus rings are always visible — gold 2px outline on all focusable elements",
                    "Color is never the sole indicator of meaning — always paired with text or icon",
                    "All images have alt text; decorative images use aria-hidden",
                    "Modals and sheets trap focus and restore on close",
                    "All form inputs are associated with labels via htmlFor/id",
                    "ARIA roles and aria-current are used for navigation landmarks",
                    "Contrast ratios: primary text 7:1 (AAA), secondary text 4.5:1 (AA)",
                    "Animations respect prefers-reduced-motion (add @media query when needed)",
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: "#4ADE80" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                          <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <p className="text-[13px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#D8C9A8" }}>
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
              </LnCard>
            </div>
          </Section>

          {/* ── ARCHITECTURAL LAWS ────────────────────────────────────── */}
          <Section id="laws" title="Architectural Laws">
            <div className="mb-6 p-5 rounded-xl border" style={{ borderColor: "rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.04)" }}>
              <p className="text-sm leading-relaxed mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#D8C9A8" }}>
                Living Nexus has two ontological roots. The <strong style={{ color: "#D4AF37" }}>Domain Ontology</strong> describes reality — what things <em>are</em>.
                The <strong style={{ color: "#D4AF37" }}>Software Ontology</strong> describes implementation — how things <em>fulfill their purpose</em>.
                The implementation is always subordinate to the domain.
              </p>
              <p className="text-xs mt-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}>
                Full text: <code className="text-xs px-1 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>ARCHITECTURAL_LAWS.md</code> in the project root.
              </p>
            </div>

            {([
              {
                num: "I",
                title: "The Dual Identity Principle",
                law: "Every artifact in Living Nexus shall declare both its domain identity and its implementation identity. Domain answers what it is. Implementation answers how it fulfills its purpose. Neither may be inferred solely from filesystem location, filename, or technical structure. Both must be explicit.",
                annotation: `/**\n * @domain   The Work → Creative Works → Music\n * @impl     Server Router — tRPC procedures for audio work registration\n */`,
              },
              {
                num: "II",
                title: "Domain Supremacy",
                law: "When a technical decision conflicts with a domain truth, the domain truth prevails. A button that 'likes' a work is wrong in this domain — not because of a style preference, but because the domain truth is witnessing, not liking.",
                annotation: null,
              },
              {
                num: "III",
                title: "The Covenant of Subordination",
                law: "The Software Ontology exists to serve the Domain Ontology. It has no independent authority. Technical quality is evaluated in terms of how well it serves the domain, not as an end in itself.",
                annotation: null,
              },
              {
                num: "IV",
                title: "Explicit Over Implicit",
                law: "In Living Nexus, nothing that matters shall be inferred. It shall be declared. Work authorship is declared via WID. Provenance is declared via Chain of Record. Human agency is declared via HAAI Declaration. Domain identity is declared via @domain annotation.",
                annotation: null,
              },
              {
                num: "V",
                title: "The Immutability of the Chain",
                law: "Once a domain truth is recorded in the Chain of Record, it cannot be erased. It can only be superseded. Supersession is the mechanism of change. Deletion is not permitted in the domain of authorship.",
                annotation: null,
              },
            ] as { num: string; title: string; law: string; annotation: string | null }[]).map(({ num, title, law, annotation }) => (
              <div key={num} className="mb-5 p-5 rounded-xl border" style={{ borderColor: "rgba(212,175,55,0.15)", background: "rgba(10,8,6,0.6)" }}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", fontFamily: "'Cinzel', serif" }}>
                    {num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "#D4AF37", fontSize: "14px" }}>
                      Law {num} — {title}
                    </h4>
                    <p className="text-sm leading-relaxed mb-3" style={{ fontFamily: "'DM Sans', sans-serif", color: "#A89880" }}>
                      {law}
                    </p>
                    {annotation && (
                      <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: "rgba(212,175,55,0.06)", color: "#8B7D5A", fontFamily: "'JetBrains Mono', monospace", border: "1px solid rgba(212,175,55,0.1)" }}>
                        {annotation}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-8">
              <h4 className="font-semibold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "#D4AF37", fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Decision Framework
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
                      <th className="text-left py-2 pr-4" style={{ color: "#D4AF37", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "12px" }}>Step</th>
                      <th className="text-left py-2 pr-4" style={{ color: "#D4AF37", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "12px" }}>Question</th>
                      <th className="text-left py-2" style={{ color: "#D4AF37", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "12px" }}>Governed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      ["1", "What is this in the domain?", "Law I — Dual Identity"],
                      ["2", "Does this technical decision serve that domain truth?", "Law II — Domain Supremacy"],
                      ["3", "Is this decision made in service of the domain, or for its own sake?", "Law III — Covenant of Subordination"],
                      ["4", "Is this identity explicit, or am I relying on inference?", "Law IV — Explicit Over Implicit"],
                      ["5", "If this touches the Chain of Record, is immutability preserved?", "Law V — Immutability"],
                    ] as [string, string, string][]).map(([step, question, gov]) => (
                      <tr key={step} style={{ borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
                        <td className="py-2 pr-4 font-mono text-xs" style={{ color: "#D4AF37" }}>{step}</td>
                        <td className="py-2 pr-4 text-xs" style={{ color: "#A89880", fontFamily: "'DM Sans', sans-serif" }}>{question}</td>
                        <td className="py-2 text-xs" style={{ color: "#6B6555", fontFamily: "'DM Sans', sans-serif" }}>{gov}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <LnDivider variant="wide" />
          <div className="text-center py-8">
            <LnOverline>Living Nexus Design System v1.0</LnOverline>
            <p
              className="mt-2 text-[12px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#6B6555" }}
            >
              Sacred · Sovereign · Immutable · This is the law.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
