/**
 * /embed/song/:id — Standalone iframe player page for Discord inline embeds.
 *
 * Discord renders an inline player when og:video:url points to an iframe page
 * with og:video:type="text/html" (the YouTube pattern). This route serves a
 * minimal, self-contained HTML page with:
 *   - Cover art as background
 *   - Song title + artist name
 *   - HTML5 <audio> element with autoplay
 *   - Living Nexus branding
 *
 * IMPORTANT: This route must be registered BEFORE the X-Frame-Options header
 * middleware so Discord can load it inside an iframe.
 */

import { type Express } from "express";
import { getSongWithCreator } from "./db";

const FALLBACK_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildEmbedHtml(opts: {
  title: string;
  artistName: string;
  coverArtUrl: string;
  audioUrl: string;
  songUrl: string;
  genre?: string | null;
}): string {
  const { title, artistName, coverArtUrl, audioUrl, songUrl, genre } = opts;
  const genreLabel = genre ? `<span class="genre">${escHtml(genre)}</span>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — ${escHtml(artistName)} | Living Nexus</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #fff;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }

    .bg {
      position: absolute;
      inset: 0;
      background-image: url("${escHtml(coverArtUrl)}");
      background-size: cover;
      background-position: center;
      filter: blur(8px) brightness(0.45);
      transform: scale(1.08);
    }

    .cover {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -60%);
      width: 120px;
      height: 120px;
      border-radius: 8px;
      object-fit: cover;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      border: 2px solid rgba(212, 175, 55, 0.5);
    }

    .info {
      position: relative;
      z-index: 2;
      width: 100%;
      padding: 12px 16px 10px;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
    }

    .title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .artist {
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .genre {
      font-size: 10px;
      color: #D4AF37;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 3px;
      padding: 1px 5px;
      margin-left: 6px;
      vertical-align: middle;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }

    .play-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #D4AF37;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.1s, background 0.15s;
    }
    .play-btn:hover { background: #e8c84a; transform: scale(1.05); }
    .play-btn svg { width: 14px; height: 14px; fill: #000; }

    .progress-wrap {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      cursor: pointer;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      background: #D4AF37;
      border-radius: 2px;
      width: 0%;
      transition: width 0.25s linear;
    }

    .time {
      font-size: 10px;
      color: rgba(255,255,255,0.5);
      flex-shrink: 0;
      min-width: 36px;
      text-align: right;
    }

    .branding {
      position: absolute;
      top: 10px;
      right: 12px;
      z-index: 3;
      font-size: 9px;
      color: rgba(212, 175, 55, 0.7);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-decoration: none;
    }
    .branding:hover { color: #D4AF37; }

    audio { display: none; }
  </style>
</head>
<body>
  <div class="player">
    <div class="bg"></div>
    <img class="cover" src="${escHtml(coverArtUrl)}" alt="${escHtml(title)}" />

    <a class="branding" href="${escHtml(songUrl)}" target="_blank" rel="noopener">
      ✦ Living Nexus
    </a>

    <div class="info">
      <div class="title">${escHtml(title)}${genreLabel}</div>
      <div class="artist">${escHtml(artistName)}</div>
      <div class="controls">
        <button class="play-btn" id="playBtn" aria-label="Play/Pause">
          <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="progress-wrap" id="progressWrap">
          <div class="progress-bar" id="progressBar"></div>
        </div>
        <span class="time" id="timeDisplay">0:00</span>
      </div>
    </div>
  </div>

  <audio id="audio" src="${escHtml(audioUrl)}" preload="metadata"></audio>

  <script>
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const progressBar = document.getElementById('progressBar');
    const progressWrap = document.getElementById('progressWrap');
    const timeDisplay = document.getElementById('timeDisplay');

    const PLAY_PATH = 'M8 5v14l11-7z';
    const PAUSE_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

    function fmt(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function updateIcon() {
      playIcon.querySelector('path').setAttribute('d', audio.paused ? PLAY_PATH : PAUSE_PATH);
    }

    playBtn.addEventListener('click', () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      progressBar.style.width = (audio.currentTime / audio.duration * 100) + '%';
      timeDisplay.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('play', updateIcon);
    audio.addEventListener('pause', updateIcon);
    audio.addEventListener('ended', updateIcon);

    progressWrap.addEventListener('click', (e) => {
      const rect = progressWrap.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      audio.currentTime = ratio * (audio.duration || 0);
    });

    // Autoplay (Discord mutes autoplay by default, but the play button is ready)
    audio.play().catch(() => {});
  </script>
</body>
</html>`;
}

export function registerEmbedRoutes(app: Express) {
  // /embed/song/:id — standalone iframe player for Discord inline embeds
  // X-Frame-Options is NOT set on this route (set to ALLOWALL instead)
  // so Discord can load it inside an iframe.
  app.get("/embed/song/:id", async (req, res) => {
    const songId = parseInt(req.params.id, 10);
    if (isNaN(songId)) {
      return res.status(400).send("Invalid song ID");
    }

    try {
      const result = await getSongWithCreator(songId);
      if (!result) {
        return res.status(404).send("Song not found");
      }

      const { song, creator } = result;

      const artistName =
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Unknown Artist";

      const coverArtUrl =
        (song as any).coverArtUrl?.trim() || FALLBACK_IMAGE;

      const audioUrl = (song as any).fileUrl?.trim() || "";
      if (!audioUrl) {
        return res.status(404).send("No audio file for this song");
      }

      const html = buildEmbedHtml({
        title: song.title,
        artistName,
        coverArtUrl,
        audioUrl,
        songUrl: `https://www.livingnexus.org/song/${songId}`,
        genre: (song as any).genre || null,
      });

      // Allow iframing from any origin (required for Discord embed player)
      res.removeHeader("X-Frame-Options");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Content-Security-Policy", "frame-ancestors *");
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
    } catch (err) {
      console.error("[Embed] Error generating embed page for song", songId, err);
      res.status(500).send("Internal server error");
    }
  });
}
