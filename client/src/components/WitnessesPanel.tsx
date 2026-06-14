import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, ChevronDown, ChevronUp, Loader2, Copy, Check, UserCheck, Clock } from "lucide-react";
import { toast } from "sonner";

const WITNESS_ROLES = [
  { value: "producer",        label: "Producer" },
  { value: "mix_engineer",    label: "Mix Engineer" },
  { value: "mastering_engineer", label: "Mastering Engineer" },
  { value: "publisher",       label: "Publisher" },
  { value: "co_writer",       label: "Co-Writer" },
  { value: "featured_artist", label: "Featured Artist" },
  { value: "label",           label: "Label / Imprint" },
  { value: "distributor",     label: "Distributor" },
  { value: "manager",         label: "Manager" },
  { value: "attorney",        label: "Attorney" },
  { value: "custom",          label: "Custom Role" },
];

const ROLE_COLORS: Record<string, string> = {
  producer:            "text-amber-400 bg-amber-900/20 border-amber-800/40",
  mix_engineer:        "text-blue-400 bg-blue-900/20 border-blue-800/40",
  mastering_engineer:  "text-cyan-400 bg-cyan-900/20 border-cyan-800/40",
  publisher:           "text-purple-400 bg-purple-900/20 border-purple-800/40",
  co_writer:           "text-green-400 bg-green-900/20 border-green-800/40",
  featured_artist:     "text-pink-400 bg-pink-900/20 border-pink-800/40",
  label:               "text-orange-400 bg-orange-900/20 border-orange-800/40",
  distributor:         "text-teal-400 bg-teal-900/20 border-teal-800/40",
  manager:             "text-violet-400 bg-violet-900/20 border-violet-800/40",
  attorney:            "text-red-400 bg-red-900/20 border-red-800/40",
  custom:              "text-stone-400 bg-stone-800/30 border-stone-700/40",
};

function getRoleColor(role: string) {
  return ROLE_COLORS[role] ?? ROLE_COLORS.custom;
}

function getRoleLabel(role: string, customRole?: string | null) {
  if (role === "custom" && customRole) return customRole;
  return WITNESS_ROLES.find(r => r.value === role)?.label ?? role;
}

// ─── Invite Dialog ────────────────────────────────────────────────────────────
interface InviteDialogProps {
  songId: number;
  open: boolean;
  onClose: () => void;
  onInvited: (inviteUrl: string) => void;
}

function InviteDialog({ songId, open, onClose, onInvited }: InviteDialogProps) {
  const [role, setRole] = useState("producer");
  const [customRole, setCustomRole] = useState("");
  const [inviteeName, setInviteeName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [contributionPercent, setContributionPercent] = useState("");

  const invite = trpc.provenance.inviteWitness.useMutation({
    onSuccess: (data) => {
      onInvited(data.inviteUrl);
      onClose();
      setRole("producer"); setCustomRole(""); setInviteeName(""); setInviteEmail(""); setContributionPercent("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d1117] border border-amber-900/30 text-stone-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-amber-400 tracking-widest uppercase text-sm">
            Invite a Witness
          </DialogTitle>
        </DialogHeader>
        <p className="text-stone-500 text-xs leading-relaxed">
          A witness co-signs this work with their testimony. They receive an invite link to accept and attach their statement to the provenance record.
        </p>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-[#1a1f2e] border-amber-900/30 text-stone-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-amber-900/30">
                {WITNESS_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-stone-200 focus:bg-amber-900/20">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "custom" && (
            <div>
              <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Custom Role Name</Label>
              <Input
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="e.g. Executive Producer"
                className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
              />
            </div>
          )}
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Witness Name (optional)</Label>
            <Input
              value={inviteeName}
              onChange={e => setInviteeName(e.target.value)}
              placeholder="e.g. DJ Phantom"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Email (optional)</Label>
            <Input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="witness@example.com"
              type="email"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Contribution % (optional)</Label>
            <Input
              value={contributionPercent}
              onChange={e => setContributionPercent(e.target.value)}
              placeholder="e.g. 25"
              type="number"
              min="0"
              max="100"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-400 hover:text-stone-200">Cancel</Button>
          <Button
            onClick={() => invite.mutate({
              songId,
              role,
              customRole: customRole || undefined,
              inviteeName: inviteeName || undefined,
              inviteEmail: inviteEmail || undefined,
              contributionPercent: contributionPercent ? parseInt(contributionPercent) : undefined,
            })}
            disabled={invite.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-black font-mono uppercase tracking-widest text-xs"
          >
            {invite.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            Generate Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invite Link Display ──────────────────────────────────────────────────────
function InviteLinkCard({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4 space-y-3">
      <div className="text-amber-400 text-xs font-mono uppercase tracking-widest">Witness Invite Generated</div>
      <div className="text-stone-400 text-xs">Share this link with the witness. They will need a Living Nexus account to accept.</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[10px] font-mono text-stone-300 bg-[#0d1117] px-2 py-1.5 rounded border border-amber-900/30 truncate">
          {url}
        </code>
        <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2 text-amber-500 hover:text-amber-300 flex-shrink-0">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="text-stone-600 hover:text-stone-400 text-xs h-6 px-0">
        Dismiss
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface WitnessesPanelProps {
  songId: number;
  ownerId: number;
  className?: string;
}

export function WitnessesPanel({ songId, ownerId, className = "" }: WitnessesPanelProps) {
  const { user } = useAuth();
  const isOwner = user?.id === ownerId;
  const [expanded, setExpanded] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);


  const { data: witnesses = [], refetch, isLoading } = trpc.provenance.getWitnesses.useQuery({ songId });

  type WitnessRow = NonNullable<typeof witnesses>[number];
  const accepted = witnesses.filter((w: WitnessRow) => w.status === "accepted");
  const pending  = witnesses.filter((w: WitnessRow) => w.status === "pending");

  return (
    <div className={`rounded-xl border border-amber-900/20 bg-[#0d1117] overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-amber-500" />
          <span className="font-mono text-amber-400 text-xs uppercase tracking-widest">Witnesses</span>
          {accepted.length > 0 && (
            <Badge className="bg-amber-900/30 text-amber-400 border-0 text-[10px] font-mono">{accepted.length}</Badge>
          )}
          {pending.length > 0 && (
            <Badge className="bg-stone-800/50 text-stone-500 border-0 text-[10px] font-mono">{pending.length} pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && expanded && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-amber-500 hover:text-amber-300 hover:bg-amber-900/20"
              onClick={e => { e.stopPropagation(); setInviteOpen(true); }}
            >
              <Plus size={13} className="mr-1" /> Invite
            </Button>
          )}
          {expanded ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
        </div>
      </div>

      {/* Panel body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Invite link card */}
          {inviteUrl && (
            <InviteLinkCard url={inviteUrl} onDismiss={() => setInviteUrl(null)} />
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-4">
              <Loader2 size={13} className="animate-spin" /> Loading witnesses…
            </div>
          ) : witnesses.length === 0 ? (
            <div className="text-stone-600 text-xs font-mono py-4 text-center">
              No witnesses recorded.
              {isOwner && (
                <span className="block mt-1 text-amber-700">
                  Invite a producer, mix engineer, publisher, or collaborator to co-sign this work.
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Accepted witnesses */}
              {accepted.map((w: WitnessRow) => (
                <div key={w.id} className="flex items-start gap-3 p-3 rounded-lg border border-amber-900/20 bg-[#0d1117]">
                  <UserCheck size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-stone-200 text-xs font-medium">
                        {w.inviteeName ?? "Anonymous Witness"}
                      </span>
                      <Badge className={`text-[10px] font-mono border px-1.5 py-0 ${getRoleColor(w.role)}`}>
                        {getRoleLabel(w.role, w.customRole)}
                      </Badge>
                      {w.contributionPercent != null && (
                        <span className="text-[10px] font-mono text-stone-500">{w.contributionPercent}%</span>
                      )}
                    </div>
                    {w.testimony && (
                      <p className="text-stone-500 text-[11px] mt-1 leading-relaxed italic">
                        "{w.testimony}"
                      </p>
                    )}
                    <div className="text-[10px] text-stone-700 font-mono mt-1">
                      Witnessed {new Date(w.witnessedAt ?? w.invitedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending witnesses */}
              {pending.length > 0 && isOwner && (
                <div>
                  <div className="text-[10px] font-mono text-stone-600 uppercase tracking-widest mb-2">Pending Invites</div>
                  {pending.map((w: WitnessRow) => (
                    <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-800/40 bg-[#0d1117] opacity-60">
                      <Clock size={13} className="text-stone-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-400 text-xs">
                            {w.inviteeName ?? w.inviteEmail ?? "Unnamed Witness"}
                          </span>
                          <Badge className={`text-[10px] font-mono border px-1.5 py-0 ${getRoleColor(w.role)}`}>
                            {getRoleLabel(w.role, w.customRole)}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-700 font-mono flex-shrink-0">Awaiting</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <InviteDialog
        songId={songId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(url) => { setInviteUrl(url); refetch(); }}
      />
    </div>
  );
}
