import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("client/src/components/CinematicSplash.tsx", "utf-8");
const styles = readFileSync("client/src/index.css", "utf-8");
const documentHead = readFileSync("client/index.html", "utf-8");
const audioRoute = readFileSync("server/routes/splashAudioRoute.ts", "utf-8");

describe("CinematicSplash entrance video contract", () => {
  it("uses the approved durable asset as a decorative, non-interactive background", () => {
    expect(source).toContain('/manus-storage/dark-gold-vault_cc92b6bb.mp4');
    expect(source).toContain('preload="auto"');
    expect(source).toContain('onCanPlay={handleVideoCanPlay}');
    expect(source).toContain('onError={handleVideoError}');
    expect(source).toContain('aria-hidden="true"');
    expect(styles).toContain(".ln-cinematic-splash__vault-film");
    expect(styles).toContain("pointer-events: none");
    expect(source).toContain("autoPlay");
    expect(source).toContain("loop");
    expect(source).toContain("muted");
    expect(source).toContain("playsInline");
    expect(source).toContain('preload="auto"');
    expect(source).not.toMatch(/<video[\s\S]*?\bcontrols\b/);
    expect(documentHead).toContain('rel="preload" as="fetch"');
    expect(documentHead).not.toContain('as="video"');
    expect(documentHead).toContain('dark-gold-vault_cc92b6bb.mp4');
    expect(documentHead).toContain('fetchpriority="high"');
    expect(documentHead).toContain('crossorigin="anonymous"');
  });

  it("preserves reduced-motion safeguards without rendering a static image fallback", () => {
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("!prefersReducedMotion && !videoFallbackReason && (");
    expect(source).toContain("!prefersReducedMotion && <ParticleField />");
    expect(source).toContain("var(--ln-void");
    expect(source).not.toContain('className="ln-cinematic-splash__vault-static"');
    expect(styles).not.toContain('.ln-cinematic-splash__vault-static');
    expect(styles).not.toContain('dark-gold-vault-still_239718fa.jpg');
  });

  it("retains existing exit and keyboard-entry surfaces above the film", () => {
    expect(source).toContain("Skip Intro");
    expect(source).toContain("Enter the Archive");
    expect(source).toContain("aria-label=\"Skip cinematic introduction and enter the archive\"");
    expect(source).toContain("zIndex: 3");
  });

  it("keeps the vault visibly composed and the splash hierarchy intentionally scaled", () => {
    expect(styles).toContain("opacity: 1;");
    expect(styles).toContain("var(--ln-gold, var(--gold)) 42%");
    expect(styles).toContain("49.8%");
    expect(styles).toContain("50.2%");
    expect(styles).toContain("mix-blend-mode: screen");
    expect(source).toContain("ln-cinematic-splash__logo-copy");
    expect(source).toContain("clamp(2.15rem, 4.8vw, 3.5rem)");
    expect(source).toContain("ln-cinematic-splash__process-card");
    expect(source).toContain("var(--font-editorial)");
    expect(source).toContain("var(--font-body)");
  });

  it("preserves the vault-first reference composition before manual process entry", () => {
    expect(source).toContain('"awakening" | "frequency" | "vault" | "process"');
    expect(source).toContain('setTimeout(() => setVaultRequested(true), 3000)');
    expect(source).toContain('const [videoReady, setVideoReady]');
    expect(source).toContain('const [vaultRequested, setVaultRequested]');
    expect(source).toContain('if (prefersReducedMotion || videoReady || videoFallbackReason)');
    expect(source).toContain('setVideoFallbackReason("video readiness timeout")');
    expect(source).toContain('setVideoReady(true)');
    expect(source).toContain('data-phase={phase}');
    expect(source).toContain('className="ln-cinematic-splash__vault-actions"');
    expect(source).toContain('Explore the process');
    expect(source).toContain('{phase === "process" && <div style={{');
    expect(source).toContain('const openProcess = useCallback');
    expect(source).not.toContain('style={{ position: "relative", zIndex: 3 }}');
    expect(styles).toContain('.ln-cinematic-splash[data-phase="vault"]');
    expect(styles).toContain('.ln-cinematic-splash__skip');
    expect(styles).toContain('z-index: 4');
  });

  it("keeps the mobile foreground system compact, transparent, and separate from the film", () => {
    expect(source).toContain('className="ln-cinematic-splash__process-stage"');
    expect(source).toContain('className="ln-cinematic-splash__process-card"');
    expect(source).toContain('className="ln-cinematic-splash__card-title"');
    expect(source).toContain('className="ln-cinematic-splash__card-description"');
    expect(source).toContain('className="ln-cinematic-splash__process-arrow"');
    expect(source).toContain('className="ln-cinematic-splash__archive-entry"');
    expect(styles).toContain('backdrop-filter: blur(18px) saturate(116%)');
    expect(styles).toContain('.ln-cinematic-splash__process-card::before');
    expect(styles).toContain('position: fixed;');
    expect(styles).toContain('env(safe-area-inset-top, 0px) + 0.5rem');
    expect(styles).toContain('.ln-cinematic-splash__card-description');
  });

  it("provides development-only video observability and graceful fallback", () => {
    expect(source).toContain('import.meta.env.DEV');
    expect(source).toContain('[CinematicSplash][video]');
    expect(source).toContain('prefersReducedMotion');
    expect(source).toContain('readyState: video.readyState');
    expect(source).toContain('paused: video.paused');
    expect(source).toContain('currentTime: Number(video.currentTime.toFixed(3))');
    expect(source).toContain('play-resolved');
    expect(source).toContain('play-rejected');
    expect(source).toContain('setVideoFallbackReason(reason)');
    expect(source).toContain('!prefersReducedMotion && !videoFallbackReason');
  });

  it("provides resumable looping entrance audio with explicit mute and volume controls", () => {
    expect(source).toContain('const SPLASH_AUDIO_SRC = "/api/splash-audio"');
    expect(source).toContain('ln_splash_audio_muted_v3');
    expect(audioRoute).toContain('const SPLASH_AUDIO_KEY = "VaultofGold_68340573.mp3"');
    expect(audioRoute).toContain('app.get("/api/splash-audio"');
    expect(audioRoute).toContain('Range: range');
    expect(audioRoute).toContain('Content-Type');
    expect(source).toContain('loop preload="auto"');
    expect(source).toContain('localStorage.getItem(SPLASH_AUDIO_POSITION_KEY)');
    expect(source).toContain('localStorage.setItem(SPLASH_AUDIO_POSITION_KEY');
    expect(source).toContain('audio.play()');
    expect(source).toContain('await context.resume().catch(() => undefined)');
    expect(source).toContain('await audio.play().catch(() => undefined)');
    expect(source).toContain('await activateAudio()');
    expect(source).toContain('const wasPaused = audio.paused');
    expect(source).toContain('if (wasPaused)');
    expect(source).toContain('[CinematicSplash][audio] autoplay-rejected');
    expect(source).not.toContain('audio.muted = true;\n        setMuted(true);\n        localStorage.setItem(SPLASH_AUDIO_MUTED_KEY, "true");');
    expect(source).toContain('aria-pressed={muted}');
    expect(source).toContain('aria-label="Entrance volume"');
    expect(source).toContain('className="ln-cinematic-splash__audio"');
    expect(styles).toContain('.ln-cinematic-splash__audio');
    expect(styles).toContain('.ln-cinematic-splash__audio-volume input');
  });

  it("binds the center waveform to guarded playback analysis with a safe fallback", () => {
    expect(source).toContain('analyserRef: React.MutableRefObject<AnalyserNode | null>');
    expect(source).toContain('createAnalyser()');
    expect(source).toContain('getByteFrequencyData(liveData)');
    expect(source).toContain('smoothingTimeConstant = 0.82');
    expect(source).toContain('Cross-origin storage without CORS may block analysis; playback remains independent.');
    expect(source).toContain('const fallbackNormalised = (raw + 1) / 2');
    expect(source).toContain('const sampledValue = liveData');
    expect(source).toContain('Math.min(1, sampledValue * 4.2)');
    expect(source).toContain('Math.max(analysedValue, 0.04)');
    expect(source).toContain('audioContextRef.current = null');
    expect(source).toContain('audio.addEventListener("playing", markPlaying)');
    expect(source).toContain('const context = audioContextRef.current');
    expect(source).toContain('const activateAudio = async () =>');
    expect(source).toContain('context?.state === "suspended"');
    expect(source).toContain('if (audio.paused) {');
    expect(source).toContain('Play sound');
    expect(source).toContain('onPointerDown={() => { void activateAudio(); }}');
  });

  it("uses the approved tighter desktop vault framing without changing the mobile rule", () => {
    expect(styles).toContain("@media (min-width: 641px)");
    expect(styles).toContain("transform: scale(2.15) translateZ(0)");
    expect(styles).toContain("will-change: transform");
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain("opacity: 0.9;");
  });
});
