import { Download, FileText, Shield, GitBranch, Globe, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const WID_SPEC_PDF_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/WID_Public_Specification_v1.0_ff711e53.pdf";

const layers = [
  {
    icon: BookOpen,
    title: "Concept Layer",
    description:
      "Plain-language definition of what WID is, what problem it solves, and what category it belongs to — without exposing internal mechanics.",
  },
  {
    icon: GitBranch,
    title: "Interface Layer",
    description:
      "Defines the Witness Input Set (what goes in) and the Witness Record outputs (what comes out), including the WID string, Harmonic Signature, and ECDSA certificate.",
  },
  {
    icon: Shield,
    title: "Behavior Layer",
    description:
      "The four guarantees: Immutability, Traceability, Attribution Binding, and Context Preservation. These are behavioral contracts, not implementation details.",
  },
  {
    icon: Globe,
    title: "Boundary Layer",
    description:
      "What WID explicitly does not do — protecting the system from misframing and preserving the integrity of its claims.",
  },
];

const interopRows = [
  { system: "U.S. Copyright Registration", relationship: "WID is a pre-legal provenance record; supports but does not replace copyright." },
  { system: "ISRC", relationship: "ISRC is assigned post-distribution; WID is assigned pre-distribution by the creator." },
  { system: "DOI (Figshare / Zenodo)", relationship: "DOI identifies where a thing lives; WID identifies who made it and when." },
  { system: "Blockchain NFT", relationship: "Platform-dependent token; WID is platform-independent and creator-held." },
];

export default function WIDSpecPage() {
  return (
    <div className="min-h-screen" style={{ background: "#2C3438" }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(44,52,56,0.35) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono tracking-widest mb-6"
            style={{
              background: "rgba(44,52,56,0.6)",
              border: "1px solid rgba(203,177,131,0.35)",
              color: "#CBB183",
            }}
          >
            <FileText className="w-3 h-3" />
            PUBLIC SPECIFICATION · VERSION 1.0 · MARCH 2026
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Orbitron', sans-serif", color: "#E6CDAE" }}
          >
            Witness ID
          </h1>
          <h2
            className="text-xl sm:text-2xl mb-6"
            style={{ color: "#CBB183", fontFamily: "'Orbitron', sans-serif" }}
          >
            Public Specification
          </h2>

          <p className="text-base max-w-2xl mx-auto mb-3" style={{ color: "#DACAAA" }}>
            A sovereign creative provenance protocol. A behavioral contract that establishes what the
            WID system requires, what it produces, and what it guarantees — without exposing the
            internal mechanism.
          </p>

          <blockquote
            className="text-sm italic mb-8"
            style={{ color: "#AA8E64" }}
          >
            "It's cool getting a DOI, but getting a WID." — Doc Seraph Mercer, Founder
          </blockquote>

          {/* Download CTA */}
          <a href={WID_SPEC_PDF_URL} target="_blank" rel="noopener noreferrer" download>
            <Button
              size="lg"
              className="gap-2 text-sm font-semibold px-8 py-3"
              style={{
                background: "linear-gradient(135deg, #AA8E64, #7A5A1E)",
                color: "#2C3438",
                border: "none",
              }}
            >
              <Download className="w-4 h-4" />
              Download WID Spec v1.0 (PDF)
            </Button>
          </a>

          <p className="text-xs mt-3" style={{ color: "#3F4A50" }}>
            Command Domains LLC / BDDT Publishing · livingnexus.org
          </p>
        </div>
      </div>

      {/* Four Layers */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h3
          className="text-xs font-mono tracking-widest mb-6 text-center"
          style={{ color: "#CBB183" }}
        >
          LAYERED DISCLOSURE MODEL
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {layers.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl p-5"
              style={{
                background: "rgba(44,52,56,0.8)",
                border: "1px solid rgba(44,52,56,0.6)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(203,177,131,0.12)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "#CBB183" }} />
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#E6CDAE" }}
                >
                  {title}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#AA8E64" }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interoperability Table */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <h3
          className="text-xs font-mono tracking-widest mb-6 text-center"
          style={{ color: "#CBB183" }}
        >
          RELATIONSHIP TO EXISTING SYSTEMS
        </h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(44,52,56,0.6)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(44,52,56,0.8)" }}>
                <th
                  className="text-left px-5 py-3 text-xs font-mono tracking-wider"
                  style={{ color: "#CBB183" }}
                >
                  SYSTEM
                </th>
                <th
                  className="text-left px-5 py-3 text-xs font-mono tracking-wider"
                  style={{ color: "#CBB183" }}
                >
                  RELATIONSHIP TO WID
                </th>
              </tr>
            </thead>
            <tbody>
              {interopRows.map((row, i) => (
                <tr
                  key={row.system}
                  style={{
                    background:
                      i % 2 === 0
                        ? "rgba(44,52,56,0.5)"
                        : "rgba(44,52,56,0.3)",
                    borderTop: "1px solid rgba(44,52,56,0.4)",
                  }}
                >
                  <td
                    className="px-5 py-3 font-medium text-xs"
                    style={{ color: "#DACAAA" }}
                  >
                    {row.system}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "#AA8E64" }}>
                    {row.relationship}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(44,52,56,0.8)",
            border: "1px solid rgba(203,177,131,0.2)",
          }}
        >
          <p className="text-base leading-relaxed mb-6" style={{ color: "#DACAAA" }}>
            Every day, young creators produce original work and submit it to platforms before that
            work has any formal record of origin. A 15-year-old who has spent years writing music
            and uploads it to a streaming platform has no mechanism to establish that the work was
            hers, at that moment, in that form, before any system touched it.
          </p>
          <p
            className="text-base font-semibold leading-relaxed"
            style={{ color: "#E6CDAE" }}
          >
            The Witness ID system exists to close that gap — protect the origin, protect it early,
            before the platforms, before the businesses, before the algorithms.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={WID_SPEC_PDF_URL} target="_blank" rel="noopener noreferrer" download>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                style={{
                  borderColor: "rgba(203,177,131,0.35)",
                  color: "#CBB183",
                  background: "transparent",
                }}
              >
                <Download className="w-3 h-3" />
                Download Full Specification
              </Button>
            </a>
            <a href="/upload" rel="noopener noreferrer">
              <Button
                size="sm"
                className="gap-2 text-xs"
                style={{
                  background: "rgba(203,177,131,0.12)",
                  color: "#CBB183",
                  border: "1px solid rgba(203,177,131,0.28)",
                }}
              >
                <ExternalLink className="w-3 h-3" />
                Register Your First WID
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
