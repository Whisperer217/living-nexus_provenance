import { useState } from "react";
import { Copy, Check, Terminal, Shield, Zap, Globe, Code2, BookOpen, ChevronRight, ExternalLink, Key } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, lang = "json" }: { code: string; lang?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-black/70 border border-zinc-800 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed text-green-300 whitespace-pre">
        {code}
      </pre>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function EndpointCard({
  method, path, auth, desc, request, response
}: {
  method: "GET" | "POST";
  path: string;
  auth: boolean;
  desc: string;
  request?: string;
  response?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-left"
      >
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${method === "POST" ? "bg-green-900 text-green-300" : "bg-blue-900 text-blue-300"}`}>
          {method}
        </span>
        <code className="text-amber-300 text-sm font-mono flex-1">{path}</code>
        {auth && <span className="text-xs text-zinc-500 flex items-center gap-1"><Shield className="w-3 h-3" /> Auth</span>}
        <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 bg-zinc-950 space-y-4 border-t border-zinc-800">
          <p className="text-zinc-300 text-sm">{desc}</p>
          {request && (
            <div>
              <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Request Body</div>
              <CodeBlock code={request} />
            </div>
          )}
          {response && (
            <div>
              <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Response</div>
              <CodeBlock code={response} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const REGISTER_REQUEST = `{
  "title": "My Track",
  "contentType": "audio",        // audio | lyrics | manuscript | comic | image
  "fileUrl": "https://...",      // optional: CDN/S3 URL of the file
  "coverArtUrl": "https://...",  // optional
  "aiDisclosure": "ai_generated" // original | ai_assisted | ai_generated
}`;

const REGISTER_RESPONSE = `{
  "success": true,
  "wid": "WID-MUS-A1B2C3D4-E5F6G7H8",
  "workId": 4821,
  "title": "My Track",
  "contentType": "audio",
  "registeredAt": "2026-06-17T14:30:00.000Z",
  "verifyUrl": "https://www.livingnexus.org/verify/WID-MUS-A1B2C3D4-E5F6G7H8",
  "widLookupUrl": "/api/v1/works/WID-MUS-A1B2C3D4-E5F6G7H8",
  "badge": {
    "badgeUrl": "/api/v1/badge/WID-MUS-A1B2C3D4-E5F6G7H8",
    "embedHtml": "<a href=\\"...\\"><img src=\\"/api/v1/badge/WID-MUS-A1B2C3D4-E5F6G7H8\\" /></a>"
  }
}`;

const WID_LOOKUP_RESPONSE = `{
  "wid": "WID-MUS-A1B2C3D4-E5F6G7H8",
  "title": "My Track",
  "contentType": "audio",
  "creator": {
    "id": 12,
    "handle": "@greg-speed",
    "name": "Greg Speed"
  },
  "registeredAt": "2026-06-17T14:30:00.000Z",
  "verifyUrl": "https://www.livingnexus.org/verify/WID-MUS-A1B2C3D4-E5F6G7H8",
  "coverArtUrl": "https://cdn.livingnexus.org/...",
  "aiDisclosure": "ai_generated"
}`;

const CREATOR_WORKS_RESPONSE = `{
  "creator": {
    "id": 12,
    "handle": "@greg-speed",
    "name": "Greg Speed"
  },
  "total": 523,
  "limit": 20,
  "offset": 0,
  "works": [
    {
      "id": 4821,
      "title": "My Track",
      "contentType": "audio",
      "wid": "WID-MUS-A1B2C3D4-E5F6G7H8",
      "registeredAt": "2026-06-17T14:30:00.000Z",
      "verifyUrl": "https://www.livingnexus.org/verify/WID-MUS-A1B2C3D4-E5F6G7H8"
    }
  ]
}`;

const PYTHON_EXAMPLE = `import requests

API_KEY = "lnk_your_key_here"
BASE_URL = "https://www.livingnexus.org/api/v1"

def register_work(title, content_type, file_url=None, ai_disclosure="ai_generated"):
    response = requests.post(
        f"{BASE_URL}/works/register",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={
            "title": title,
            "contentType": content_type,
            "fileUrl": file_url,
            "aiDisclosure": ai_disclosure
        }
    )
    data = response.json()
    return data["wid"]  # e.g. "WID-MUS-A1B2C3D4-E5F6G7H8"

# Register a generated track
wid = register_work("Midnight Drift", "audio", "https://cdn.example.com/track.mp3")
print(f"Registered: {wid}")`;

const JS_EXAMPLE = `// Node.js / browser
const API_KEY = "lnk_your_key_here";
const BASE_URL = "https://www.livingnexus.org/api/v1";

async function registerWork({ title, contentType, fileUrl, aiDisclosure = "ai_generated" }) {
  const res = await fetch(\`\${BASE_URL}/works/register\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({ title, contentType, fileUrl, aiDisclosure })
  });
  const data = await res.json();
  return data; // { wid, verifyUrl, badge, ... }
}

// Register a generated image
const result = await registerWork({
  title: "Neon Horizon",
  contentType: "image",
  fileUrl: "https://cdn.example.com/image.png",
  aiDisclosure: "ai_generated"
});
console.log(result.wid); // "WID-IMG-..."
console.log(result.badge.embedHtml); // paste into your UI`;

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-950 to-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-950/40 border border-amber-700/40 rounded-full px-4 py-1.5 text-amber-400 text-xs font-mono mb-6">
            <Terminal className="w-3 h-3" />
            Living Nexus Provenance API — v1
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Register creative works.<br />
            <span className="text-amber-400">Prove they exist.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
            One API call. One WID. Permanent provenance on every work your platform generates — 
            audio, images, manuscripts, comics. No algorithm. No feed. Just the record.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/developer">
              <Button className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-2">
                <Key className="w-4 h-4" />
                Get API Key
              </Button>
            </Link>
            <a href="#quickstart">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white gap-2">
                <BookOpen className="w-4 h-4" />
                Quick Start
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">

        {/* Why section */}
        <section>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Provenance at creation", desc: "WIDs are issued the moment a work is registered — timestamped, immutable, verifiable." },
              { icon: Zap, title: "One call, done", desc: "POST to /works/register. Receive a WID. Embed the badge. That is the entire integration." },
              { icon: Globe, title: "Platform-agnostic", desc: "Audio, images, text, comics. Any content type. Any platform. Same provenance chain." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5">
                <Icon className="w-5 h-5 text-amber-500 mb-3" />
                <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick start */}
        <section id="quickstart">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-500" />
            Quick Start
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-black text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span className="text-zinc-200 text-sm font-medium">Get an API key from your Developer Dashboard</span>
              </div>
              <Link href="/developer">
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white gap-2 ml-7">
                  <ExternalLink className="w-3 h-3" /> Open Developer Dashboard
                </Button>
              </Link>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-black text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span className="text-zinc-200 text-sm font-medium">Register a work</span>
              </div>
              <div className="ml-7">
                <CodeBlock code={`curl -X POST https://www.livingnexus.org/api/v1/works/register \\
  -H "Authorization: Bearer lnk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"My Track","contentType":"audio","aiDisclosure":"ai_generated"}'`} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-black text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <span className="text-zinc-200 text-sm font-medium">Receive a WID and embed the badge</span>
              </div>
              <div className="ml-7">
                <CodeBlock code={`{
  "wid": "WID-MUS-A1B2C3D4-E5F6G7H8",
  "verifyUrl": "https://www.livingnexus.org/verify/WID-MUS-A1B2C3D4-E5F6G7H8",
  "badge": {
    "badgeUrl": "/api/v1/badge/WID-MUS-A1B2C3D4-E5F6G7H8",
    "embedHtml": "<a href=\\"...\\"><img src=\\"/api/v1/badge/WID-MUS-A1B2C3D4-E5F6G7H8\\" /></a>"
  }
}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Authentication
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            All write endpoints require a Bearer token. Pass your API key in the <code className="text-amber-300">Authorization</code> header.
          </p>
          <CodeBlock code={`Authorization: Bearer lnk_your_key_here`} />
          <p className="text-zinc-500 text-xs mt-3">
            API keys start with <code className="text-zinc-400">lnk_</code>. Generate them in your{" "}
            <Link href="/developer" className="text-amber-400 hover:text-amber-300">Developer Dashboard</Link>.
            Read endpoints (GET) are public — no key required.
          </p>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            Endpoints
          </h2>
          <div className="space-y-3">
            <EndpointCard
              method="POST"
              path="/api/v1/works/register"
              auth={true}
              desc="Register a creative work and receive a permanent WID. The work is immediately associated with the creator who owns the API key."
              request={REGISTER_REQUEST}
              response={REGISTER_RESPONSE}
            />
            <EndpointCard
              method="GET"
              path="/api/v1/works/:wid"
              auth={false}
              desc="Look up a registered work by its WID. Returns full provenance record including creator, registration timestamp, and verification URL."
              response={WID_LOOKUP_RESPONSE}
            />
            <EndpointCard
              method="GET"
              path="/api/v1/creator/:handle/works"
              auth={false}
              desc="List all registered works for a creator by their handle (without the @ symbol). Supports pagination via ?limit= and ?offset= query params."
              response={CREATOR_WORKS_RESPONSE}
            />
            <EndpointCard
              method="GET"
              path="/api/v1/verify/:wid"
              auth={false}
              desc="Verify a WID and return its provenance record. Identical to /works/:wid — provided for legacy compatibility."
              response={WID_LOOKUP_RESPONSE}
            />
            <EndpointCard
              method="GET"
              path="/api/v1/badge/:wid"
              auth={false}
              desc="Returns an SVG badge for embedding in your UI. The badge links to the verification page and includes the WID."
            />
            <EndpointCard
              method="GET"
              path="/api/v1/catalog"
              auth={false}
              desc="Paginated public catalog of all published works. Compatible with Plex and Jellyfin metadata scrapers. Supports ?page=, ?limit=, ?contentType= filters."
            />
            <EndpointCard
              method="GET"
              path="/api/v1/health"
              auth={false}
              desc="Health check endpoint. Returns status, version, and uptime. Use for monitoring and integration health checks."
            />
          </div>
        </section>

        {/* Content types */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-500" />
            Content Types &amp; WID Prefixes
          </h2>
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">contentType</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">WID Prefix</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { type: "audio", prefix: "WID-MUS-", example: "WID-MUS-A1B2C3D4-E5F6G7H8" },
                  { type: "lyrics", prefix: "WID-LYR-", example: "WID-LYR-A1B2C3D4-E5F6G7H8" },
                  { type: "manuscript", prefix: "WID-MSS-", example: "WID-MSS-A1B2C3D4-E5F6G7H8" },
                  { type: "comic", prefix: "WID-COM-", example: "WID-COM-A1B2C3D4-E5F6G7H8" },
                  { type: "image", prefix: "WID-IMG-", example: "WID-IMG-A1B2C3D4-E5F6G7H8" },
                ].map((row) => (
                  <tr key={row.type} className="bg-zinc-950/40">
                    <td className="px-4 py-3"><code className="text-amber-300 text-xs">{row.type}</code></td>
                    <td className="px-4 py-3"><code className="text-green-400 text-xs">{row.prefix}</code></td>
                    <td className="px-4 py-3"><code className="text-zinc-400 text-xs">{row.example}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Rate limits */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Rate Limits
          </h2>
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">Daily Limit</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs uppercase tracking-wider">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { tier: "Free", limit: "100 registrations / day", access: "Self-serve, instant" },
                  { tier: "Pro", limit: "5,000 registrations / day", access: "Contact us" },
                  { tier: "Enterprise", limit: "Unlimited", access: "Platform partnerships" },
                ].map((row) => (
                  <tr key={row.tier} className="bg-zinc-950/40">
                    <td className="px-4 py-3 text-white text-xs font-medium">{row.tier}</td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">{row.limit}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{row.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-500 text-xs mt-3">
            Rate limit headers are returned on every response: <code className="text-zinc-400">X-RateLimit-Limit</code>, <code className="text-zinc-400">X-RateLimit-Remaining</code>, <code className="text-zinc-400">X-RateLimit-Reset</code>.
          </p>
        </section>

        {/* Code examples */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-500" />
            Code Examples
          </h2>
          <div className="space-y-6">
            <div>
              <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-mono">Python</div>
              <CodeBlock code={PYTHON_EXAMPLE} lang="python" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-mono">JavaScript / Node.js</div>
              <CodeBlock code={JS_EXAMPLE} lang="javascript" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border border-amber-800/40 bg-amber-950/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to integrate?</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Generate your free API key and register your first work in under five minutes. 
            Platform-scale integrations welcome — reach out for Enterprise access.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/developer">
              <Button className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-2">
                <Key className="w-4 h-4" />
                Get API Key
              </Button>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
