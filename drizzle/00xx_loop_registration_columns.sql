-- Loop registration columns (P1–P3)
-- Safe to re-run: ignores duplicate column errors in ops tooling if needed.

ALTER TABLE songs
  ADD COLUMN participationMusic ENUM('Human','AI','Both') DEFAULT 'Human',
  ADD COLUMN participationLyrics ENUM('Human','AI','Both') DEFAULT 'Human',
  ADD COLUMN participationVoice ENUM('Human','AI','Both') DEFAULT 'Human',
  ADD COLUMN toneProfileJson TEXT NULL,
  ADD COLUMN waveformUrl TEXT NULL,
  ADD COLUMN waveformKey TEXT NULL,
  ADD COLUMN visualSource ENUM('embedded','uploaded','generated','remixed','none') DEFAULT 'none',
  ADD COLUMN visualPrompt TEXT NULL,
  ADD COLUMN visualLineageJson TEXT NULL;
