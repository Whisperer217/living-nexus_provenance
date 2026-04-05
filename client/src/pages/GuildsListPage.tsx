/**
 * GuildsListPage — /guilds
 * Shows all public guilds + create guild modal
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Plus, ArrowRight, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";

/* ── Create Guild Modal ─────────────────────────────────────────────────── */
function CreateGuildModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();

  const create = trpc.guilds.create.useMutation({
    onSuccess: () => {
      toast.success("Guild created!");
      utils.guilds.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create guild"),
  });

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.05 0.02 265 / 0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "oklch(0.12 0.05 270)", border: "1px solid oklch(0.22 0.04 270)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}
        >
          Create a Guild
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "oklch(0.55 0.03 280)" }}>
              Guild Name
            </label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Cosmic Frequencies"
              className="text-sm"
              style={{ background: "oklch(0.09 0.03 265)", border: "1px solid oklch(0.22 0.02 280)", color: "oklch(0.9 0.02 85)" }}
            />
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "oklch(0.55 0.03 280)" }}>
              Slug (URL)
            </label>
            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: "1px solid oklch(0.22 0.02 280)", background: "oklch(0.09 0.03 265)" }}
            >
              <span className="px-2 text-[11px]" style={{ color: "oklch(0.45 0.03 280)" }}>
                /guild/
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="cosmic-frequencies"
                className="border-0 text-sm flex-1"
                style={{ background: "transparent", color: "oklch(0.9 0.02 85)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "oklch(0.55 0.03 280)" }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this guild about?"
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{
                background: "oklch(0.09 0.03 265)",
                border: "1px solid oklch(0.22 0.02 280)",
                color: "oklch(0.9 0.02 85)",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
            style={{ color: "oklch(0.6 0.03 280)" }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!name.trim() || !slug.trim() || create.isPending}
            onClick={() => create.mutate({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined })}
            className="flex-1"
            style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
          >
            {create.isPending ? "Creating…" : "Create Guild"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function GuildsListPage() {
  const { isAuthenticated } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const { data: guilds, isLoading } = trpc.guilds.list.useQuery();

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.10 0.022 55)", paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}
    >
      {showCreate && <CreateGuildModal onClose={() => setShowCreate(false)} />}

      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}
            >
              Guilds
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "oklch(0.55 0.03 280)" }}>
              Collective spaces for witnessed creators
            </p>
          </div>
          {isAuthenticated ? (
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
            >
              <Plus size={13} className="mr-1.5" /> New Guild
            </Button>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm" variant="outline">
                Sign in to create
              </Button>
            </a>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl animate-pulse"
                style={{ background: "oklch(0.125 0.028 52)" }}
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!guilds || guilds.length === 0) && (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "oklch(0.10 0.03 270 / 0.5)",
              border: "1px dashed oklch(0.22 0.02 280)",
            }}
          >
            <Shield size={32} className="mx-auto mb-3 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
            <p className="text-sm mb-4" style={{ color: "oklch(0.55 0.03 280)" }}>
              No guilds yet. Be the first to create one.
            </p>
            {isAuthenticated && (
              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
              >
                <Plus size={13} className="mr-1.5" /> Create a Guild
              </Button>
            )}
          </div>
        )}

        {/* Guild cards */}
        {!isLoading && guilds && guilds.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guilds.map((guild: any) => (
              <Link key={guild.id} href={`/guild/${guild.slug}`}>
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer hover:brightness-110"
                  style={{
                    background: "oklch(0.125 0.028 52)",
                    border: "1px solid oklch(0.18 0.015 280)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: "oklch(0.10 0.025 270)" }}
                  >
                    {guild.avatarUrl ? (
                      <img src={guild.avatarUrl} alt={guild.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={20} style={{ color: "oklch(0.84 0.155 85 / 0.4)" }} />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-semibold truncate"
                      style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}
                    >
                      {guild.name}
                    </p>
                    {guild.description && (
                      <p
                        className="text-[11px] truncate mt-0.5"
                        style={{ color: "oklch(0.5 0.03 280)" }}
                      >
                        {guild.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={14} style={{ color: "oklch(0.45 0.03 280)" }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
