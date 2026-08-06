import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Search, Upload, Shield, Star, Download, Filter,
  ChevronDown, X, Eye, Lock, Globe, Users, Crown,
  Zap, BarChart2, Archive, Layers, Sparkles,
  ExternalLink, Hash, Clock, Award
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type LicenseType = "free" | "paid" | "subscription" | "private" | "org_only" | "invite_only" | "platform_exclusive" | "public_domain";
type SortBy = "popular" | "recent" | "price_asc" | "price_desc" | "rating";

const LICENSE_LABELS: Record<LicenseType, string> = {
  free: "Free",
  paid: "Paid",
  subscription: "Subscription",
  private: "Private",
  org_only: "Org Only",
  invite_only: "Invite Only",
  platform_exclusive: "Platform Exclusive",
  public_domain: "Public Domain",
};

const LICENSE_COLORS: Record<LicenseType, string> = {
  free: "#7BA67B",
  paid: "#C9A84C",
  subscription: "#7B9EA6",
  private: "#A67B7B",
  org_only: "#9B7B55",
  invite_only: "#8B5CF6",
  platform_exclusive: "#D4956A",
  public_domain: "#6B7280",
};

const LICENSE_ICONS: Record<LicenseType, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  free: (props) => <Globe {...props} />,
  paid: (props) => <Crown {...props} />,
  subscription: (props) => <Zap {...props} />,
  private: (props) => <Lock {...props} />,
  org_only: (props) => <Users {...props} />,
  invite_only: (props) => <Shield {...props} />,
  platform_exclusive: (props) => <Award {...props} />,
  public_domain: (props) => <Globe {...props} />,
};

const STEWARDSHIP_MODES = ["Guide", "Compose", "Witness", "Registry", "Archive", "Vision"];
const STEWARDSHIP_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  Guide: (props) => <Zap {...props} />,
  Compose: (props) => <BarChart2 {...props} />,
  Witness: (props) => <Eye {...props} />,
  Registry: (props) => <Layers {...props} />,
  Archive: (props) => <Archive {...props} />,
  Vision: (props) => <Sparkles {...props} />,
};

// ─── Attribution Badge ────────────────────────────────────────────────────────

function AttributionBadge({ item }: { item: any }) {
  const licenseType = (item.licenseType ?? "free") as LicenseType;
  const LicenseIcon = LICENSE_ICONS[licenseType] ?? Globe;
  const licenseColor = LICENSE_COLORS[licenseType] ?? "#6B7280";
  const ratingAvg = item.ratingCount > 0 ? (item.ratingSum / item.ratingCount).toFixed(1) : null;

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(196,154,40,0.2)" }}
    >
      {/* Creator */}
      <div className="flex items-center gap-2">
        {item.creatorPhoto ? (
          <img src={item.creatorPhoto} alt={item.creatorName} className="w-6 h-6 rounded-full object-cover" style={{ border: "1px solid rgba(196,154,40,0.4)" }} />
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.3)" }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#C9A84C" }}>
              {(item.creatorName || "?")[0].toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>CREATED BY</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.65rem", color: "#C9A84C" }}>
            {item.creatorName || item.creatorHandle || "Unknown Creator"}
          </div>
        </div>
      </div>

      {/* AVT-WID */}
      {item.avatarWid && (
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(196,154,40,0.5)" }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.06em" }}>
            {item.avatarWid}
          </span>
        </div>
      )}

      {/* License */}
      <div className="flex items-center gap-1.5">
        <LicenseIcon className="w-3 h-3 flex-shrink-0" style={{ color: licenseColor }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: licenseColor, letterSpacing: "0.06em" }}>
          Licensed {LICENSE_LABELS[licenseType]}
        </span>
      </div>

      {/* Version + Rating row */}
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.4)" }}>
          v{item.versionNumber ?? 1}
        </span>
        {ratingAvg && (
          <div className="flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5" style={{ color: "#C9A84C" }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "#C9A84C" }}>{ratingAvg}</span>
          </div>
        )}
        {item.downloadCount > 0 && (
          <div className="flex items-center gap-0.5">
            <Download className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.4)" }}>{item.downloadCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Avatar Card ──────────────────────────────────────────────────────────────

function AvatarCard({ item, onEquip, onViewProvenance }: { item: any; onEquip: (item: any) => void; onViewProvenance: (item: any) => void }) {
  const licenseType = (item.licenseType ?? "free") as LicenseType;
  const licenseColor = LICENSE_COLORS[licenseType] ?? "#6B7280";
  const StewardshipIcon = item.stewardshipMode ? STEWARDSHIP_ICONS[item.stewardshipMode] : null;

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{ background: "rgba(10,8,5,0.95)", border: "1px solid rgba(196,154,40,0.15)" }}
    >
      {/* Artwork */}
      <div className="relative aspect-square overflow-hidden">
        {item.artworkUrl ? (
          <img
            src={item.artworkUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(196,154,40,0.05)" }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "2rem", color: "rgba(196,154,40,0.3)" }}>?</span>
          </div>
        )}
        {/* Gold border overlay — immutable attribution marker */}
        <div className="absolute inset-0 pointer-events-none" style={{ border: "2px solid rgba(196,154,40,0.4)", borderRadius: "inherit" }} />
        {/* License badge */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded"
          style={{ background: `${licenseColor}22`, border: `1px solid ${licenseColor}66` }}
        >
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: licenseColor, letterSpacing: "0.06em" }}>
            {LICENSE_LABELS[licenseType].toUpperCase()}
          </span>
        </div>
        {/* Stewardship mode badge */}
        {StewardshipIcon && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(196,154,40,0.3)" }}
            title={item.stewardshipMode}
          >
            <StewardshipIcon className="w-3 h-3" style={{ color: "#C9A84C" }} />
          </div>
        )}
        {/* Featured star */}
        {item.featured && (
          <div className="absolute bottom-2 right-2">
            <Star className="w-4 h-4" style={{ color: "#C9A84C", fill: "#C9A84C" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: "0.8rem", color: "#E8D5A3", lineHeight: 1.3 }} className="line-clamp-1">
            {item.title}
          </h3>
          {item.creatorName && (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", marginTop: 2 }}>
              by {item.creatorName}
            </p>
          )}
        </div>

        {/* AVT-WID chip */}
        {item.avatarWid && (
          <div className="flex items-center gap-1">
            <Hash className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.5)" }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.04em" }} className="truncate">
              {item.avatarWid}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: item.priceCents > 0 ? "#C9A84C" : "#7BA67B" }}>
            {item.priceCents > 0 ? `$${(item.priceCents / 100).toFixed(2)}` : "FREE"}
          </span>
          <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download className="w-3 h-3" />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem" }}>{item.downloadCount ?? 0}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => onEquip(item)}
            className="flex-1 py-1.5 rounded text-center transition-all hover:opacity-80"
            style={{
              background: "rgba(196,154,40,0.15)",
              border: "1px solid rgba(196,154,40,0.4)",
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.5rem",
              color: "#C9A84C",
              letterSpacing: "0.06em",
            }}
          >
            {item.priceCents > 0 ? "LICENSE" : "EQUIP"}
          </button>
          <button
            onClick={() => onViewProvenance(item)}
            className="w-8 h-8 rounded flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            title="View Provenance"
          >
            <Shield className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provenance Modal ─────────────────────────────────────────────────────────

function ProvenanceModal({ itemId, onClose }: { itemId: number; onClose: () => void }) {
  const { data } = trpc.marketplace.getAvatarProvenance.useQuery({ id: itemId });

  if (!data) return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="rounded-xl p-8" style={{ background: "#0a0805", border: "1px solid rgba(196,154,40,0.3)" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "rgba(196,154,40,0.7)" }}>Loading provenance...</div>
      </div>
    </div>
  );

  const licenseType = (data.licenseType ?? "free") as LicenseType;
  const licenseColor = LICENSE_COLORS[licenseType] ?? "#6B7280";

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "#0a0805", border: "1px solid rgba(196,154,40,0.4)", maxHeight: "85vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(196,154,40,0.15)" }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: "#C9A84C" }}>Avatar Provenance</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Chain of custody record
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {/* Artwork + title */}
        <div className="flex gap-4 p-5">
          {data.artworkUrl && (
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ border: "2px solid rgba(196,154,40,0.4)" }}>
              <img src={data.artworkUrl} alt={data.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: "#E8D5A3" }}>{data.title}</h2>
            {data.description && (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginTop: 4, lineHeight: 1.5 }}>
                {data.description}
              </p>
            )}
          </div>
        </div>

        {/* Provenance fields */}
        <div className="px-5 pb-5 space-y-3">
          {/* Creator */}
          <div className="rounded-lg p-3" style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.15)" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 6 }}>CREATOR</div>
            <div className="flex items-center gap-2">
              {data.creatorPhoto && <img src={data.creatorPhoto} alt={data.creatorName ?? ""} className="w-8 h-8 rounded-full object-cover" />}
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.8rem", color: "#C9A84C" }}>{data.creatorName}</div>
                {data.creatorHandle && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.4)" }}>@{data.creatorHandle}</div>}
              </div>
            </div>
          </div>

          {/* AVT-WID */}
          {data.avatarWid && (
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.15)" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 4 }}>AVATAR WID</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#C9A84C", letterSpacing: "0.06em" }}>{data.avatarWid}</div>
            </div>
          )}

          {/* License */}
          <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${licenseColor}33` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.1em", marginBottom: 4 }}>LICENSE</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: licenseColor }}>{LICENSE_LABELS[licenseType]}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Attribution is permanent and cannot be removed.
            </div>
          </div>

          {/* Technical fields */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 2 }}>VERSION</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>v{data.versionNumber ?? 1}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 2 }}>REGISTERED</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>
                {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
            {data.artStyle && (
              <div className="rounded-lg p-2.5" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 2 }}>ART STYLE</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>{data.artStyle}</div>
              </div>
            )}
            {data.imageHash && (
              <div className="rounded-lg p-2.5 col-span-2" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 2 }}>FINGERPRINT (SHA-256)</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.5)", wordBreak: "break-all" }}>{data.imageHash}</div>
              </div>
            )}
          </div>

          {/* AI Prompt disclosure */}
          {data.aiPrompt && (
            <div className="rounded-lg p-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(139,92,246,0.8)", letterSpacing: "0.1em", marginBottom: 4 }}>AI GENERATION PROMPT</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{data.aiPrompt}</div>
            </div>
          )}

          {/* Artist credit */}
          {data.artistCredit && (
            <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 4 }}>ARTIST CREDIT</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.7)" }}>{data.artistCredit}</div>
            </div>
          )}

          {/* Recent license events */}
          {data.recentLicenses && data.recentLicenses.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 6 }}>RECENT LICENSE EVENTS</div>
              <div className="space-y-1">
                {(data.recentLicenses as any[]).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between px-3 py-1.5 rounded" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.5)" }}>{ev.status}</span>
                    {ev.provenanceWid && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(196,154,40,0.5)" }}>{ev.provenanceWid}</span>}
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)" }}>
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upload / Register Avatar Modal ──────────────────────────────────────────

function RegisterAvatarModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [licenseType, setLicenseType] = useState<LicenseType>("free");
  const [priceCents, setPriceCents] = useState(0);
  const [tags, setTags] = useState("");
  const [stewardshipMode, setStewardshipMode] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [artistCredit, setArtistCredit] = useState("");
  const [artStyle, setArtStyle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const registerMutation = trpc.marketplace.registerAvatar.useMutation({
    onSuccess: (data) => {
      toast.success(`Avatar registered! AVT-WID: ${data.avatarWid}`);
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setArtworkUrl(url);
      toast.success("Image uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!artworkUrl) { toast.error("Please upload an image first"); return; }
    registerMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      artworkUrl,
      licenseType,
      priceCents: licenseType === "paid" ? priceCents : 0,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      stewardshipMode: stewardshipMode || undefined,
      aiPrompt: aiPrompt.trim() || undefined,
      artistCredit: artistCredit.trim() || undefined,
      artStyle: artStyle.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "#0a0805", border: "1px solid rgba(196,154,40,0.4)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(196,154,40,0.15)" }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: "#C9A84C" }}>Register Avatar</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              Every avatar becomes a registered asset with its own AVT-WID
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image upload */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>AVATAR IMAGE *</label>
            <div
              className="mt-2 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
              style={{ height: artworkUrl ? "auto" : 120, background: "rgba(196,154,40,0.05)", border: "2px dashed rgba(196,154,40,0.3)" }}
              onClick={() => fileRef.current?.click()}
            >
              {artworkUrl ? (
                <img src={artworkUrl} alt="Preview" className="w-full max-h-48 object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Upload className="w-6 h-6" style={{ color: "rgba(196,154,40,0.5)" }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.5)" }}>
                    {uploading ? "UPLOADING..." : "CLICK TO UPLOAD"}
                  </span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>

          {/* Title */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>TITLE *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="The Conductor"
              className="mt-1.5 w-full px-3 py-2 rounded outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>DESCRIPTION</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="A brief description of this avatar..."
              className="mt-1.5 w-full px-3 py-2 rounded outline-none resize-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            />
          </div>

          {/* License type */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>LICENSE TYPE</label>
            <select
              value={licenseType}
              onChange={e => setLicenseType(e.target.value as LicenseType)}
              className="mt-1.5 w-full px-3 py-2 rounded outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            >
              {Object.entries(LICENSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Price (only for paid) */}
          {licenseType === "paid" && (
            <div>
              <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>PRICE (USD)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={priceCents / 100}
                onChange={e => setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                className="mt-1.5 w-full px-3 py-2 rounded outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
              />
            </div>
          )}

          {/* Stewardship mode */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>STEWARDSHIP MODE (OPTIONAL)</label>
            <select
              value={stewardshipMode}
              onChange={e => setStewardshipMode(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            >
              <option value="">— Any mode —</option>
              {STEWARDSHIP_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>TAGS (COMMA SEPARATED)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="dark, armored, warrior, cinematic"
              className="mt-1.5 w-full px-3 py-2 rounded outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            />
          </div>

          {/* Art style */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>ART STYLE</label>
            <input
              value={artStyle}
              onChange={e => setArtStyle(e.target.value)}
              placeholder="digital concept art, hand-drawn, photorealistic..."
              className="mt-1.5 w-full px-3 py-2 rounded outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            />
          </div>

          {/* AI prompt disclosure */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(139,92,246,0.7)", letterSpacing: "0.08em" }}>AI GENERATION PROMPT (IF AI-GENERATED)</label>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              rows={2}
              placeholder="Leave blank if hand-drawn or photographed..."
              className="mt-1.5 w-full px-3 py-2 rounded outline-none resize-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(139,92,246,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            />
          </div>

          {/* Artist credit */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>ARTIST CREDIT (IF COMMISSIONED)</label>
            <input
              value={artistCredit}
              onChange={e => setArtistCredit(e.target.value)}
              placeholder="Artist name or handle..."
              className="mt-1.5 w-full px-3 py-2 rounded outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "#E8D5A3", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            />
          </div>

          {/* Attribution notice */}
          <div className="rounded-lg p-3" style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.2)" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.8)", lineHeight: 1.7 }}>
              By registering this avatar, you confirm you hold the rights to this image. An AVT-WID will be permanently assigned. Attribution cannot be removed. Living Nexus treats avatars as creative works, not UI assets.
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={registerMutation.isPending || uploading}
            className="w-full py-3 rounded transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              background: "rgba(196,154,40,0.2)",
              border: "1px solid rgba(196,154,40,0.5)",
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.6rem",
              color: "#C9A84C",
              letterSpacing: "0.1em",
            }}
          >
            {registerMutation.isPending ? "REGISTERING..." : "REGISTER AVATAR & GENERATE AVT-WID"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AvatarMarketplacePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [licenseFilter, setLicenseFilter] = useState<LicenseType | "">("");
  const [stewardshipFilter, setStewardshipFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [showRegister, setShowRegister] = useState(false);
  const [provenanceItemId, setProvenanceItemId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, refetch } = trpc.marketplace.listAvatarMarketplace.useQuery({
    search: search || undefined,
    licenseType: licenseFilter || undefined,
    stewardshipMode: stewardshipFilter || undefined,
    sortBy,
    limit: 80,
  });

  const equipMutation = trpc.marketplace.equipAvatar.useMutation({
    onSuccess: () => toast.success("Keeper appearance updated."),
    onError: (e) => toast.error(e.message),
  });

  const handleEquip = (item: any) => {
    if (!user) { toast.error("Please log in to equip an avatar"); return; }
    if (item.priceCents > 0) {
      toast.info("Paid licensing coming soon. Contact the creator directly.");
      return;
    }
    equipMutation.mutate({ itemId: item.id });
  };

  const items = data?.items ?? [];

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-obsidian)", backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(196,154,40,0.04) 0%, transparent 60%)" }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: "rgba(196,154,40,0.1)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.75rem", color: "#C9A84C", letterSpacing: "0.08em" }}>
                Avatar Registry
              </h1>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.7 }}>
                Every avatar is a registered creative work with permanent attribution, provenance, and licensing.
              </p>
            </div>
            {user && (
              <button
                onClick={() => setShowRegister(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.4)", color: "#C9A84C", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.08em" }}
              >
                <Upload className="w-3.5 h-3.5" />
                REGISTER AVATAR
              </button>
            )}
          </div>

          {/* Search + filter bar */}
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.15)" }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.5)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search avatars..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#E8D5A3" }}
              />
              {search && <button onClick={() => setSearch("")}><X className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} /></button>}
            </div>

            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: showFilters ? "rgba(196,154,40,0.15)" : "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.2)", color: "rgba(196,154,40,0.7)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
            >
              <Filter className="w-3.5 h-3.5" />
              FILTER
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 rounded-lg outline-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(196,154,40,0.15)", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
            >
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low</option>
              <option value="price_desc">Price: High</option>
            </select>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-3 p-4 rounded-lg" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(196,154,40,0.1)" }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.08em", marginBottom: 4 }}>LICENSE</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setLicenseFilter("")}
                    className="px-2 py-1 rounded text-xs transition-all"
                    style={{ background: !licenseFilter ? "rgba(196,154,40,0.2)" : "rgba(0,0,0,0.4)", border: `1px solid ${!licenseFilter ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: !licenseFilter ? "#C9A84C" : "rgba(255,255,255,0.5)" }}
                  >ALL</button>
                  {Object.entries(LICENSE_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setLicenseFilter(k as LicenseType)}
                      className="px-2 py-1 rounded transition-all"
                      style={{
                        background: licenseFilter === k ? `${LICENSE_COLORS[k as LicenseType]}22` : "rgba(0,0,0,0.4)",
                        border: `1px solid ${licenseFilter === k ? LICENSE_COLORS[k as LicenseType] : "rgba(255,255,255,0.1)"}`,
                        fontFamily: "'Space Mono', monospace", fontSize: "0.45rem",
                        color: licenseFilter === k ? LICENSE_COLORS[k as LicenseType] : "rgba(255,255,255,0.5)",
                      }}
                    >{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.08em", marginBottom: 4 }}>STEWARDSHIP</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setStewardshipFilter("")}
                    className="px-2 py-1 rounded transition-all"
                    style={{ background: !stewardshipFilter ? "rgba(196,154,40,0.2)" : "rgba(0,0,0,0.4)", border: `1px solid ${!stewardshipFilter ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: !stewardshipFilter ? "#C9A84C" : "rgba(255,255,255,0.5)" }}
                  >ALL</button>
                  {STEWARDSHIP_MODES.map(m => (
                    <button
                      key={m}
                      onClick={() => setStewardshipFilter(m)}
                      className="px-2 py-1 rounded transition-all"
                      style={{ background: stewardshipFilter === m ? "rgba(196,154,40,0.2)" : "rgba(0,0,0,0.4)", border: `1px solid ${stewardshipFilter === m ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: stewardshipFilter === m ? "#C9A84C" : "rgba(255,255,255,0.5)" }}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.2rem", color: "rgba(196,154,40,0.4)" }}>No Avatars Registered Yet</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", textAlign: "center", maxWidth: 320, lineHeight: 1.7 }}>
              Be the first to register an avatar. Every upload becomes a permanent creative record with its own AVT-WID.
            </div>
            {user && (
              <button
                onClick={() => setShowRegister(true)}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.4)", color: "#C9A84C", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.08em" }}
              >
                <Upload className="w-3.5 h-3.5" />
                REGISTER FIRST AVATAR
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
              {items.length} avatar{items.length !== 1 ? "s" : ""} registered
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item: any) => (
                <AvatarCard
                  key={item.id}
                  item={item}
                  onEquip={handleEquip}
                  onViewProvenance={(i: any) => setProvenanceItemId(i.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showRegister && (
        <RegisterAvatarModal onClose={() => setShowRegister(false)} onSuccess={() => refetch()} />
      )}
      {provenanceItemId !== null && (
        <ProvenanceModal itemId={provenanceItemId} onClose={() => setProvenanceItemId(null)} />
      )}
    </div>
  );
}
