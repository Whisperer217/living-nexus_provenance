import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, EyeOff, GripVertical, ExternalLink, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// ─── Platform metadata (mirrors server PLATFORM_REGISTRY) ─────────────────────
const PLATFORMS = [
  // Music / Distribution
  { type: "spotify",      label: "Spotify",        color: "#1DB954", group: "Music", placeholder: "https://open.spotify.com/artist/..." },
  { type: "soundcloud",   label: "SoundCloud",     color: "#FF5500", group: "Music", placeholder: "https://soundcloud.com/yourname" },
  { type: "bandcamp",     label: "Bandcamp",       color: "#1DA0C3", group: "Music", placeholder: "https://yourname.bandcamp.com" },
  { type: "distrokid",   label: "DistroKid",      color: "#00D4FF", group: "Music", placeholder: "https://distrokid.com/hyperfollow/..." },
  { type: "apple_music",  label: "Apple Music",    color: "#FC3C44", group: "Music", placeholder: "https://music.apple.com/artist/..." },
  // Video
  { type: "youtube",      label: "YouTube",        color: "#FF0000", group: "Video", placeholder: "@yourchannel or UCxxxxxxx (channel ID)" },
  { type: "twitch",       label: "Twitch",         color: "#9146FF", group: "Video", placeholder: "https://twitch.tv/yourname" },
  { type: "tiktok",       label: "TikTok",         color: "#69C9D0", group: "Video", placeholder: "https://tiktok.com/@yourname" },
  // Writing / Research
  { type: "substack",     label: "Substack",       color: "#FF6719", group: "Writing", placeholder: "yourname (your Substack handle)" },
  { type: "orcid",        label: "ORCID",          color: "#A6CE39", group: "Research", placeholder: "https://orcid.org/0000-0000-0000-0000" },
  { type: "figshare",     label: "Figshare",       color: "#E5522B", group: "Research", placeholder: "https://figshare.com/authors/..." },
  { type: "zenodo",       label: "Zenodo",         color: "#024D9E", group: "Research", placeholder: "https://zenodo.org/communities/..." },
  { type: "researchgate", label: "ResearchGate",   color: "#00CCBB", group: "Research", placeholder: "https://www.researchgate.net/profile/..." },
  { type: "academia",     label: "Academia.edu",   color: "#41A85F", group: "Research", placeholder: "https://independent.academia.edu/..." },
  // Social
  { type: "instagram",    label: "Instagram",      color: "#E1306C", group: "Social", placeholder: "https://instagram.com/yourname" },
  { type: "twitter",      label: "X / Twitter",    color: "#1DA1F2", group: "Social", placeholder: "https://x.com/yourname" },
  { type: "linkedin",     label: "LinkedIn",       color: "#0A66C2", group: "Social", placeholder: "https://linkedin.com/in/yourname" },
  { type: "discord",      label: "Discord",        color: "#5865F2", group: "Social", placeholder: "https://discord.gg/yourserver" },
  // Support
  { type: "patreon",      label: "Patreon",        color: "#FF424D", group: "Support", placeholder: "https://patreon.com/yourname" },
  { type: "kofi",         label: "Ko-fi",          color: "#FF5E5B", group: "Support", placeholder: "https://ko-fi.com/yourname" },
  // Dev
  { type: "github",       label: "GitHub",         color: "#6E40C9", group: "Dev", placeholder: "yourhandle (GitHub username)" },
  // Custom
  { type: "website",      label: "Website",        color: "#D4AF37", group: "Other", placeholder: "https://yourwebsite.com" },
  { type: "custom",       label: "Custom Link",    color: "#888888", group: "Other", placeholder: "https://..." },
] as const;

type PlatformType = typeof PLATFORMS[number]["type"];

const GROUPS = ["Music", "Video", "Writing", "Research", "Social", "Support", "Dev", "Other"];

function PlatformIcon({ type, color, size = 16 }: { type: string; color: string; size?: number }) {
  // Use first letter of platform name as icon fallback
  const label = PLATFORMS.find(p => p.type === type)?.label ?? type;
  return (
    <div
      className="flex items-center justify-center rounded-md font-bold flex-shrink-0"
      style={{ width: size + 8, height: size + 8, background: color + "22", border: `1px solid ${color}55`, color, fontSize: size * 0.6, fontFamily: "monospace" }}
    >
      {label[0].toUpperCase()}
    </div>
  );
}

interface Props {
  userId: number;
  onClose?: () => void;
}

export function PlatformHubEditor({ userId, onClose }: Props) {
  const utils = trpc.useUtils();
  const { data: platforms = [], isLoading } = trpc.platformHub.getMine.useQuery();

  const addMutation = trpc.platformHub.add.useMutation({
    onSuccess: () => { utils.platformHub.getMine.invalidate(); utils.platformHub.getByCreator.invalidate({ userId }); toast.success("Platform added"); setShowAdd(false); setForm({ platformType: "youtube", url: "", handle: "", displayName: "", description: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.platformHub.remove.useMutation({
    onSuccess: () => { utils.platformHub.getMine.invalidate(); utils.platformHub.getByCreator.invalidate({ userId }); toast.success("Removed"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.platformHub.update.useMutation({
    onSuccess: () => { utils.platformHub.getMine.invalidate(); utils.platformHub.getByCreator.invalidate({ userId }); },
    onError: (e) => toast.error(e.message),
  });
  const refreshMutation = trpc.platformHub.refreshPreview.useMutation({
    onSuccess: () => { utils.platformHub.getMine.invalidate(); toast.success("Preview refreshed"); },
    onError: (e) => toast.error(e.message),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("Music");
  const [form, setForm] = useState({ platformType: "youtube" as PlatformType, url: "", handle: "", displayName: "", description: "" });

  const selectedPlatform = PLATFORMS.find(p => p.type === form.platformType);

  function handleAdd() {
    if (!form.url.trim()) { toast.error("URL is required"); return; }
    addMutation.mutate({
      platformType: form.platformType,
      url: form.url.trim(),
      handle: form.handle.trim() || undefined,
      displayName: form.displayName.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: "#D4AF37", letterSpacing: "0.12em" }}>PLATFORM HUB</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Add your presence across the web. Each platform appears as a live panel on your profile.</p>
        </div>
        {onClose && <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={16} /></button>}
      </div>

      {/* Existing platforms */}
      {isLoading ? (
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Loading…</div>
      ) : platforms.length === 0 ? (
        <div className="text-center py-6" style={{ color: "rgba(255,255,255,0.30)", fontSize: 12 }}>
          No platforms added yet. Click "Add Platform" to connect your first presence.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {platforms.map((p: any) => {
            const meta = PLATFORMS.find(x => x.type === p.platformType);
            const color = meta?.color ?? "#888";
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}33` }}
              >
                <GripVertical size={14} style={{ color: "rgba(255,255,255,0.20)", flexShrink: 0 }} />
                <PlatformIcon type={p.platformType} color={color} size={14} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, color: "#E8DCC8", fontWeight: 500 }}>{p.displayName ?? meta?.label ?? p.platformType}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }} className="truncate">{p.url}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => refreshMutation.mutate({ id: p.id })}
                    title="Refresh preview"
                    className="p-1 rounded hover:bg-white/5"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: p.id, isVisible: !p.isVisible })}
                    title={p.isVisible ? "Hide" : "Show"}
                    className="p-1 rounded hover:bg-white/5"
                    style={{ color: p.isVisible ? "#D4AF37" : "rgba(255,255,255,0.25)" }}
                  >
                    {p.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <ExternalLink size={12} />
                  </a>
                  <button
                    onClick={() => { if (confirm("Remove this platform?")) removeMutation.mutate({ id: p.id }); }}
                    className="p-1 rounded hover:bg-red-500/10"
                    style={{ color: "rgba(255,100,100,0.50)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Platform */}
      {!showAdd ? (
        <Button
          onClick={() => setShowAdd(true)}
          className="w-full"
          style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.30)", color: "#D4AF37", fontSize: 12, height: 38 }}
        >
          <Plus size={14} className="mr-2" /> Add Platform
        </Button>
      ) : (
        <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.20)" }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: "#D4AF37", fontFamily: "'Cinzel', serif", letterSpacing: "0.10em" }}>ADD PLATFORM</span>
            <button onClick={() => setShowAdd(false)} style={{ color: "rgba(255,255,255,0.30)" }}><X size={14} /></button>
          </div>

          {/* Group tabs */}
          <div className="flex flex-wrap gap-1">
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className="px-2 py-1 rounded text-xs"
                style={{
                  background: selectedGroup === g ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedGroup === g ? "rgba(212,175,55,0.40)" : "rgba(255,255,255,0.08)"}`,
                  color: selectedGroup === g ? "#D4AF37" : "rgba(255,255,255,0.45)",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Platform grid */}
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.filter(p => p.group === selectedGroup).map(p => (
              <button
                key={p.type}
                onClick={() => setForm(f => ({ ...f, platformType: p.type }))}
                className="flex items-center gap-2 p-2 rounded-lg text-left"
                style={{
                  background: form.platformType === p.type ? p.color + "18" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${form.platformType === p.type ? p.color + "66" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <PlatformIcon type={p.type} color={p.color} size={12} />
                <span style={{ fontSize: 12, color: form.platformType === p.type ? p.color : "rgba(255,255,255,0.60)" }}>{p.label}</span>
              </button>
            ))}
          </div>

          {/* URL / handle input */}
          {selectedPlatform && (
            <div className="flex flex-col gap-2">
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.06em" }}>
                  {["youtube", "substack", "github"].includes(form.platformType) ? "HANDLE / CHANNEL ID" : "PROFILE URL"}
                </label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#E8DCC8", outline: "none" }}
                  placeholder={selectedPlatform.placeholder}
                  value={["youtube", "substack", "github"].includes(form.platformType) ? form.handle : form.url}
                  onChange={e => {
                    if (["youtube", "substack", "github"].includes(form.platformType)) {
                      setForm(f => ({ ...f, handle: e.target.value, url: e.target.value.startsWith("http") ? e.target.value : `https://${form.platformType}.com/${e.target.value}` }));
                    } else {
                      setForm(f => ({ ...f, url: e.target.value }));
                    }
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.06em" }}>DISPLAY NAME (optional)</label>
                <input
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#E8DCC8", outline: "none" }}
                  placeholder={`e.g. ${selectedPlatform.label} — My Channel`}
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.06em" }}>DESCRIPTION (optional)</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm resize-none"
                  rows={2}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#E8DCC8", outline: "none" }}
                  placeholder="What do you share on this platform?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="w-full"
                style={{ background: selectedPlatform.color, color: "#fff", fontSize: 12, height: 36, border: "none" }}
              >
                {addMutation.isPending ? "Adding…" : `Add ${selectedPlatform.label}`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
