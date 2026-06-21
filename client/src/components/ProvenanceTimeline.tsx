import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, Music, Upload, Radio, Globe, Wrench, RefreshCw, Award, Eye,
  FileText, Plus, ExternalLink, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  created:            { icon: <Music size={14} />,      label: "Created",             color: "text-amber-400" },
  wid_assigned:       { icon: <Award size={14} />,      label: "WID Assigned",        color: "text-yellow-400" },
  mastered:           { icon: <Wrench size={14} />,     label: "Mastered",            color: "text-blue-400" },
  distributed:        { icon: <Upload size={14} />,     label: "Distributed",         color: "text-purple-400" },
  published:          { icon: <Globe size={14} />,      label: "Published",           color: "text-green-400" },
  remastered:         { icon: <RefreshCw size={14} />,  label: "Remastered",          color: "text-cyan-400" },
  re_released:        { icon: <Radio size={14} />,      label: "Re-Released",         color: "text-pink-400" },
  licensed:           { icon: <FileText size={14} />,   label: "Licensed",            color: "text-orange-400" },
  witnessed:          { icon: <Eye size={14} />,        label: "Witnessed",           color: "text-violet-400" },
  imported:           { icon: <Upload size={14} />,     label: "Imported",            color: "text-teal-400" },
  version_created:    { icon: <RefreshCw size={14} />,  label: "Version Created",     color: "text-blue-300" },
  credential_attached:{ icon: <Award size={14} />,      label: "Credential Attached", color: "text-yellow-300" },
  rights_registered:  { icon: <FileText size={14} />,   label: "Rights Registered",   color: "text-emerald-400" },
  custom:             { icon: <Clock size={14} />,      label: "Event",               color: "text-stone-400" },
};

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] ?? EVENT_CONFIG.custom;
}

// ─── Add Event Dialog ─────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: "mastered",            label: "Mastered" },
  { value: "distributed",        label: "Distributed" },
  { value: "published",          label: "Published to Platform" },
  { value: "remastered",         label: "Remastered" },
  { value: "re_released",        label: "Re-Released" },
  { value: "licensed",           label: "Licensed" },
  { value: "rights_registered",  label: "Rights Registered (ASCAP/BMI/etc.)" },
  { value: "credential_attached",label: "Credential Attached" },
  { value: "custom",             label: "Custom Event" },
];

interface AddEventDialogProps {
  songId: number;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

function AddEventDialog({ songId, open, onClose, onAdded }: AddEventDialogProps) {
  const [eventType, setEventType] = useState("published");
  const [eventLabel, setEventLabel] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");

  const addEvent = trpc.provenance.addEvent.useMutation({
    onSuccess: () => { onAdded(); onClose(); setEventLabel(""); setPlatformName(""); setPlatformUrl(""); },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d1117] border border-amber-900/30 text-stone-200 max-w-md flex flex-col" style={{ maxHeight: "min(90dvh, 90vh)", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
        <DialogHeader>
          <DialogTitle className="font-mono text-amber-400 tracking-widest uppercase text-sm">
            Add Provenance Event
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-[#1a1f2e] border-amber-900/30 text-stone-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-amber-900/30">
                {EVENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-stone-200 focus:bg-amber-900/20">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Label (optional)</Label>
            <Input
              value={eventLabel}
              onChange={e => setEventLabel(e.target.value)}
              placeholder="e.g. Published to Spotify"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Platform (optional)</Label>
            <Input
              value={platformName}
              onChange={e => setPlatformName(e.target.value)}
              placeholder="e.g. Spotify, DistroKid, Apple Music"
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
          <div>
            <Label className="text-stone-400 text-xs uppercase tracking-widest mb-1 block">Platform URL (optional)</Label>
            <Input
              value={platformUrl}
              onChange={e => setPlatformUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/..."
              className="bg-[#1a1f2e] border-amber-900/30 text-stone-200 placeholder:text-stone-600"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-stone-400 hover:text-stone-200">Cancel</Button>
          <Button
            onClick={() => addEvent.mutate({ songId, eventType, eventLabel: eventLabel || undefined, platformName: platformName || undefined, platformUrl: platformUrl || undefined })}
            disabled={addEvent.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-black font-mono uppercase tracking-widest text-xs"
          >
            {addEvent.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            Record Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ProvenanceTimelineProps {
  songId: number;
  ownerId: number;
  className?: string;
}

export function ProvenanceTimeline({ songId, ownerId, className = "" }: ProvenanceTimelineProps) {
  const { user } = useAuth();
  const isOwner = user?.id === ownerId;
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const { data: rawEvents = [], refetch, isLoading } = trpc.provenance.getTimeline.useQuery({ songId });
  type EventRow = NonNullable<typeof rawEvents>[number];
  const events: EventRow[] = rawEvents;

  return (
    <div className={`rounded-xl border border-amber-900/20 bg-[#0d1117] overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-amber-500" />
          <span className="font-mono text-amber-400 text-xs uppercase tracking-widest">Provenance Timeline</span>
          {events.length > 0 && (
            <Badge className="bg-amber-900/30 text-amber-400 border-0 text-[10px] font-mono">{events.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && expanded && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-amber-500 hover:text-amber-300 hover:bg-amber-900/20"
              onClick={e => { e.stopPropagation(); setAddOpen(true); }}
            >
              <Plus size={13} className="mr-1" /> Add Event
            </Button>
          )}
          {expanded ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
        </div>
      </div>

      {/* Timeline body */}
      {expanded && (
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-4">
              <Loader2 size={13} className="animate-spin" /> Loading timeline…
            </div>
          ) : events.length === 0 ? (
            <div className="text-stone-600 text-xs font-mono py-4 text-center">
              No provenance events recorded yet.
              {isOwner && <span className="block mt-1 text-amber-700">Add the first event to start the record.</span>}
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-amber-900/30" />
              <div className="space-y-4">
                {events.map((event: EventRow, i: number) => {
                  const cfg = getEventConfig(event.eventType);
                  const isLast = i === events.length - 1;
                  return (
                    <div key={event.id} className="flex gap-4 relative">
                      {/* Dot */}
                      <div className={`relative z-10 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 ${isLast ? 'bg-amber-500 border-amber-400' : 'bg-[#0d1117] border-amber-900/40'}`}>
                        <span className={`${cfg.color} ${isLast ? 'text-black' : ''}`}>{cfg.icon}</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-xs font-mono font-semibold ${cfg.color}`}>
                              {event.eventLabel || cfg.label}
                            </span>
                            {event.platformName && (
                              <span className="ml-2 text-[10px] font-mono text-stone-500 bg-stone-800/50 px-1.5 py-0.5 rounded">
                                {event.platformName}
                              </span>
                            )}
                          </div>
                          {event.platformUrl && (
                            <a
                              href={event.platformUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-600 hover:text-amber-400 flex-shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-stone-600 font-mono">
                            {new Date(event.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          {event.actorName && (
                            <span className="text-[10px] text-stone-600 font-mono">· {event.actorName}</span>
                          )}
                          {event.isSystemEvent && (
                            <span className="text-[10px] text-stone-700 font-mono italic">system</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <AddEventDialog
        songId={songId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => refetch()}
      />
    </div>
  );
}
