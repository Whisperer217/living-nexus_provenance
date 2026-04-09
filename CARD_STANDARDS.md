# Living Nexus — Provenance Card Style Standard

> **Rule:** Every card must look identical in structure, feel like part of the same system, and never shift layout based on content. If one card looks different → it's wrong.

---

## 1. Image Container

```
CSS class: .prov-card-img-wrap
```

- Aspect ratio: **4:5** (locked — no exceptions)
- Rounded corners: `rounded-xl` (12px)
- Overflow: `hidden`
- Width: `w-full`
- No fixed `height` in pixels — ever

**Implementation:** Use `MediaAsset` with `aspectRatio="4:5"`. The component drives sizing via `padding-bottom: 125%` internally. The outer wrapper must have no competing height or aspect-ratio CSS.

---

## 2. Image Behavior

- `object-cover` — fills the frame
- `object-center` (or focal-point via `focalX`/`focalY`)
- No letterboxing, no whitespace, no distortion
- Cropping is intentional — the frame is the truth

---

## 3. Gradient Overlay (Required on every card)

```
CSS class: .prov-card-gradient
```

- Position: `absolute inset-0 pointer-events-none`
- Direction: bottom only
- Stops: `transparent 40%` → `rgba(0,0,0,0.55) 75%` → `rgba(0,0,0,0.82) 100%`
- Always visible (not hover-only)
- Purpose: text readability + cinematic frame feel

---

## 4. Typography

| Element | Style |
|---|---|
| Title | `font-heading font-bold`, max 2 lines, `line-clamp-2` |
| Creator | `text-sm`, muted (`text-[rgba(229,231,235,0.65)]`) |
| WID | `font-mono text-[8px] tracking-wider`, gold (`#F5C451`), always visible |

---

## 5. Badge System

| Badge | Position | Color |
|---|---|---|
| AI Disclosure (AI+ / HUMAN / HAAI) | Top-right | Fixed system colors — never per-card |
| WID | Bottom-left | Gold `#F5C451` on `rgba(0,0,0,0.72)` |
| YOURS | Top-left | Gold text on dark bg |
| HOT (50+ plays) | Top-left ribbon | Gold gradient |

- Pill or stamp style
- Small but high contrast
- **Do not change badge colors per card**

---

## 6. QR Zone

- Always clear space around it (minimum 8px padding)
- Never overlap title or creator text
- High contrast background for scan reliability
- Rendered via `QRIdentityCard` component only

---

## 7. Spacing System

```
Internal padding: p-3 (12px)
Gap between elements: gap-2 (8px)
No element touches the card edge
```

Visual hierarchy order (top to bottom):
1. Image (4:5 frame)
2. Title (bold, 2-line max)
3. Creator (muted)
4. WID + badges

---

## 8. Color Language

| Role | Value |
|---|---|
| Card base | `oklch(0.148 0.032 50)` |
| Border (inactive) | `oklch(0.28 0.04 60 / 0.25)` |
| Border (active) | `#E8A830 / 0.40` |
| Gold accent | `#D4AF37` / `#F5C451` |
| Text primary | `white` |
| Text muted | `rgba(229,231,235,0.65)` |
| Overlay | `rgba(0,0,0,0.55–0.82)` |

**Rule:** Artwork provides the color. UI chrome stays consistent. No random accent colors per upload.

---

## 9. Motion

- Hover: `scale(1.02–1.05)` on image only (`group-hover:scale-105`)
- Transition: `duration-300`
- No aggressive animations
- Active state: gold border glow (`track-active-glow`)

---

## 10. Affected Components

Apply this standard to all of the following:

| Component | Status |
|---|---|
| `TrackCard.tsx` | ✅ Standardized (4:5, gradient always-on) |
| `WorkCarousel.tsx` | ⚠️ Default fallback `"1:1"` → change to `"4:5"` |
| `FeaturedProjectsCarousel.tsx` | ⚠️ `height: 180px` → replace with 4:5 via MediaAsset |
| `DiscoverPage.tsx` (inline cards) | ⚠️ `height: 180px` → replace with 4:5 via MediaAsset |
| `ExplorePage.tsx` (inline cards) | ⚠️ `height: 180px` → replace with 4:5 via MediaAsset |
| `CreatorProfilePage.tsx` (track mini-cards) | ⚠️ `height: 180px` / `height: 160px` → replace with 4:5 |
| Creator cards (future) | 📋 Use this standard from day one |
| Provenance download cards | 📋 Use this standard from day one |

---

## CSS Utility Classes (in `index.css`)

```css
/* Provenance Card — image wrapper */
.prov-card-img-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 0.75rem; /* rounded-xl */
}

/* Provenance Card — bottom gradient overlay */
.prov-card-gradient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 40%,
    rgba(0, 0, 0, 0.55) 75%,
    rgba(0, 0, 0, 0.82) 100%
  );
}
```

---

*Last updated: April 2026. Do not modify without updating this document.*
