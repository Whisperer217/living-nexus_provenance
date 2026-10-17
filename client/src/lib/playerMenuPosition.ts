/** Keep the player actions visible when the compact bar or expanded sheet is near a viewport edge. */
export function placePlayerMenu(
  anchor: { top: number; bottom: number; right: number },
  viewport: { width: number; height: number },
  contentHeight: number,
  menuWidth = 160,
) {
  const margin = 8;
  const gap = 8;
  const fullHeight = Math.max(0, viewport.height - margin * 2);
  const desiredHeight = Math.min(contentHeight, fullHeight);
  const above = Math.max(0, anchor.top - gap - margin);
  const below = Math.max(0, viewport.height - anchor.bottom - gap - margin);
  const right = Math.max(margin, Math.min(viewport.width - anchor.right - 4, viewport.width - menuWidth - margin));

  if (above >= desiredHeight) {
    return { top: anchor.top - gap - desiredHeight, right, maxHeight: desiredHeight };
  }
  if (below >= desiredHeight) {
    return { top: anchor.bottom + gap, right, maxHeight: desiredHeight };
  }
  // When neither side fits, scroll only the menu, not the player. A very short
  // viewport gets a full-height overlay so every action remains reachable.
  if (Math.max(above, below) < 96) {
    return { top: margin, right, maxHeight: fullHeight };
  }
  if (above >= below) {
    return { top: margin, right, maxHeight: above };
  }
  return { top: anchor.bottom + gap, right, maxHeight: below };
}
