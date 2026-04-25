-- Migration 0077: Book access control, payment gate, consent layer, external hosting links
-- Adds four new columns to the songs table (comic/novel focused but available to all content types)

-- readAccess: controls how the reader is gated
--   "open"        = anyone can read (default, current behavior)
--   "preview"     = first N pages free, rest requires purchase
--   "locked"      = no reading without purchase
ALTER TABLE `songs`
  ADD COLUMN `readAccess` enum('open','preview','locked') NOT NULL DEFAULT 'open'
    COMMENT 'Reader access mode: open (free), preview (first N pages free), locked (purchase required)';

-- purchasePriceCents: price in cents (0 = free, null = not for sale)
-- e.g. 499 = $4.99, 999 = $9.99
ALTER TABLE `songs`
  ADD COLUMN `purchasePriceCents` int NULL DEFAULT NULL
    COMMENT 'Purchase price in cents. NULL = not for sale. 0 = free (no gate).';

-- previewPageCount: how many pages are free in preview mode
ALTER TABLE `songs`
  ADD COLUMN `previewPageCount` int NOT NULL DEFAULT 5
    COMMENT 'Number of free preview pages when readAccess = preview';

-- consentSettingsJson: JSON object controlling the consent modal
-- {
--   enabled: boolean,           -- show consent modal before reading (default false)
--   requireAgeAck: boolean,     -- show age-appropriate acknowledgment
--   requireAiAck: boolean,      -- show AI disclosure acknowledgment (auto-set from aiDisclosure)
--   requireNoRedistrib: boolean, -- show no-redistribution terms
--   customNote: string | null   -- creator's custom consent note (max 500 chars)
-- }
ALTER TABLE `songs`
  ADD COLUMN `consentSettingsJson` text NULL DEFAULT NULL
    COMMENT 'JSON consent modal config: enabled, requireAgeAck, requireAiAck, requireNoRedistrib, customNote';

-- externalLinksJson: JSON array of { platform: string; url: string; label?: string }
-- e.g. [{ platform: "amazon", url: "https://amazon.com/dp/...", label: "Buy on Amazon" }]
-- Renders as meta badges on the detail page and populates og:see_also meta tags
ALTER TABLE `songs`
  ADD COLUMN `externalLinksJson` text NULL DEFAULT NULL
    COMMENT 'JSON array of external hosting/sale links: [{ platform, url, label }]';
