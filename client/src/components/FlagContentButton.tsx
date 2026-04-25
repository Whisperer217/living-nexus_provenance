import { useState } from "react";
import { Flag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface FlagContentButtonProps {
  workId: number;
  workType: "audio" | "lyrics" | "manuscript" | "comic" | "post";
  workTitle?: string;
  className?: string;
  size?: "sm" | "default";
}

const REASON_LABELS: Record<string, string> = {
  dehumanization: "Dehumanization — strips human dignity from a person or group",
  csam: "Child exploitation — sexualizes or endangers a minor",
  facilitates_harm: "Facilitates real-world harm — instructions for violence or abuse",
  harassment: "Targeted harassment of a specific person",
  spam: "Spam or fraudulent content",
  other: "Other violation — describe below",
};

export function FlagContentButton({
  workId,
  workType,
  workTitle,
  className = "",
  size = "sm",
}: FlagContentButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");

  const flagMutation = trpc.moderation.flagContent.useMutation({
    onSuccess: () => {
      toast.success("Report submitted — a moderator will review this against the Living Nexus Covenant.");
      setOpen(false);
      setReason("");
      setDetails("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors ${className}`}
        title="Report this content"
      >
        <Flag className="w-3 h-3" />
        <span className={size === "sm" ? "sr-only" : ""}>Report</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-amber-400 font-serif">Report Content</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              The Living Nexus Covenant protects human dignity. Every report is reviewed by a moderator.
              {workTitle && (
                <span className="block mt-1 text-zinc-300">"{workTitle}"</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Reason for report
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-zinc-200 focus:bg-zinc-800">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Additional details (optional)
              </label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe the specific violation..."
                className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-zinc-600 mt-1">{details.length}/1000</p>
            </div>

            {/* Covenant reminder */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500 leading-relaxed">
              <span className="text-amber-500/80 font-medium">The Covenant line:</span> Content that dehumanizes,
              exploits children, or facilitates real harm is unpublishable — not because of taste, but because
              it denies the dignity that this platform exists to protect.
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!reason || flagMutation.isPending}
                onClick={() =>
                  flagMutation.mutate({
                    workId,
                    workType,
                    workTitle,
                    reason: reason as "dehumanization" | "csam" | "facilitates_harm" | "harassment" | "spam" | "other",
                    details: details || undefined,
                  })
                }
                className="bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-800"
              >
                {flagMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
