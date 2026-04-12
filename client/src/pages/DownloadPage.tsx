/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — /download
   Clean APK download page for Android sideload
═══════════════════════════════════════════════════════════════════ */

export default function DownloadPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#353E43" }}
    >
      {/* App Icon */}
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-512_603a59b9.png"
        alt="Living Nexus"
        className="w-24 h-24 mb-6 rounded-2xl shadow-2xl"
        style={{ boxShadow: "0 0 40px rgba(203,177,131,0.28)" }}
      />

      {/* Title */}
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "'Cinzel', serif", color: "#E6CDAE" }}
      >
        Living Nexus
      </h1>

      <p
        className="text-xs mb-2 tracking-widest uppercase"
        style={{ color: "#CBB183", fontFamily: "'Cinzel', serif" }}
      >
        #MainlyMusic
      </p>

      {/* Subtitle */}
      <p
        className="text-sm text-center mb-8 max-w-xs leading-relaxed"
        style={{ color: "#AA8E64" }}
      >
        Download the Android app directly. Enable{" "}
        <span style={{ color: "#E2E8F0" }}>"Install from unknown sources"</span>{" "}
        in your Android settings before installing.
      </p>

      {/* Download Button */}
      <a
        href="/api/apk/download"
        download="LivingNexus-v1-release.apk"
        className="flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-bold transition-all mb-4 hover:scale-105 active:scale-95"
        style={{
          background: "#CBB183",
          color: "#E6CDAE",
          fontFamily: "'Cinzel', serif",
          boxShadow: "0 4px 24px rgba(203,177,131,0.32)",
          textDecoration: "none",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download APK
        <span className="text-xs font-normal opacity-70 ml-1">v1.0 · 2MB</span>
      </a>

      {/* iOS note */}
      <p
        className="text-xs text-center max-w-xs mb-8"
        style={{ color: "#AA8E64" }}
      >
        Android only. For iOS — visit{" "}
        <span style={{ color: "#CBB183" }}>livingnexus.org</span> in
        Safari and tap <span style={{ color: "#E2E8F0" }}>"Add to Home Screen"</span>.
      </p>

      {/* Install Instructions */}
      <div
        className="rounded-xl p-5 max-w-sm w-full mb-6"
        style={{
          background: "#2C3438",
          border: "1px solid rgba(203,177,131,0.15)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "#CBB183", fontFamily: "'Cinzel', serif" }}
        >
          Install Steps
        </p>
        {[
          ["1", "Tap Download APK above"],
          ["2", "Open your Downloads folder"],
          ["3", 'Tap the APK → "Install"'],
          ["4", "If prompted, enable Unknown Sources"],
          ["5", "Open Living Nexus and sign in"],
        ].map(([num, step]) => (
          <div key={num} className="flex items-start gap-3 mb-2">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{
                background: "rgba(203,177,131,0.12)",
                color: "#CBB183",
                border: "1px solid rgba(203,177,131,0.28)",
              }}
            >
              {num}
            </span>
            <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>
              {step}
            </p>
          </div>
        ))}
      </div>

      {/* Doctrine tagline */}
      <div
        className="rounded-lg px-5 py-3 max-w-sm text-center"
        style={{
          background: "rgba(203,177,131,0.06)",
          border: "1px solid rgba(203,177,131,0.18)",
        }}
      >
        <p className="text-xs" style={{ color: "#AA8E64" }}>
          🔐{" "}
          <span style={{ color: "#CBB183" }}>Sovereign music.</span>{" "}
          Cryptographic provenance. Creator-owned.
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#3F4A50" }}>
          He is before all things, and in him all things hold together. — Col 1:17
        </p>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="mt-8 transition-all hover:opacity-80 active:scale-95"
        style={{
          color: "#E6CDAE",
          fontFamily: "'Cinzel', serif",
          fontSize: "11px",
          letterSpacing: "0.06em",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "7px 14px",
          border: "1px solid rgba(203,177,131,0.35)",
          borderRadius: "8px",
          background: "rgba(44,52,56,0.7)",
          textDecoration: "none",
        }}
      >
        ← Back to Living Nexus
      </a>
    </div>
  );
}
