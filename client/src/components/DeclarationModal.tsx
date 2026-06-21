import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ScrollText, Feather, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";

const DECLARATION_TEXT = `We hold these truths to be self-evident:

That every human being is a creator. That the work of the mind, the spirit, and the lived experience belongs first and always to the one who created it. That no platform, no algorithm, no institution has the right to strip a creator of their origin — to take what was made in the dark hours, in the grief, in the joy, in the testimony of a life lived — and claim it as their own.

We, the creators who register our work on Living Nexus, declare:

I. That every work I register here is mine — born from my experience, my craft, my witness.

II. That I will not use this platform to dehumanize any person or group — to strip them of their dignity as a human being made in the image of God.

III. That I will not upload content that sexualizes, exploits, or endangers children. This is the hardest line. There are no exceptions.

IV. That I will not use this platform to facilitate real-world harm — to instruct, incite, or enable violence or abuse against another person.

V. That I understand the difference between darkness and dehumanization. My testimony — however painful, however raw — is witnessable. The denial of another's humanity is not.

VI. That I stand behind my work with my name. Not a username. My name.

This is not a terms of service. This is a covenant. When you sign it, you are not clicking a button — you are putting your name on a declaration, as the founders of this nation put their names on theirs, knowing what it meant to stand for something.

Sign with your name. Stand behind your work.`;

interface DeclarationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned?: () => void;
}

export function DeclarationModal({ open, onOpenChange, onSigned }: DeclarationModalProps) {
  const { user } = useAuth();
  const [signatureName, setSignatureName] = useState("");
  const [signed, setSigned] = useState(false);

  const utils = trpc.useUtils();

  const signMutation = trpc.declaration.sign.useMutation({
    onSuccess: (result) => {
      if (result.alreadySigned) {
        toast.info("You have already signed the Living Nexus Declaration.");
        onOpenChange(false);
        return;
      }
      setSigned(true);
      utils.declaration.myStatus.invalidate();
      toast.success("Your signature has been recorded. Welcome to the covenant.");
      setTimeout(() => {
        onOpenChange(false);
        setSigned(false);
        onSigned?.();
      }, 2500);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSign = () => {
    if (!signatureName.trim() || signatureName.trim().length < 2) {
      toast.error("Please enter your name to sign the declaration.");
      return;
    }
    signMutation.mutate({ signatureName: signatureName.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border border-amber-900/40 flex flex-col" style={{ maxHeight: "min(90dvh, 90vh)", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-amber-400 font-serif text-lg">The Living Nexus Declaration</DialogTitle>
              <p className="text-xs text-zinc-500">Version 1.0 — Living Document</p>
            </div>
          </div>
        </DialogHeader>

        {signed ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-amber-400 mb-4" />
            <h3 className="text-xl font-serif text-amber-400 mb-2">Covenant Signed</h3>
            <p className="text-zinc-400 text-sm max-w-sm">
              Your signature has been recorded. You are now a witness — to your own work, and to this covenant.
            </p>
            <p className="text-zinc-600 text-xs mt-4 italic">"{signatureName}"</p>
          </div>
        ) : (
          <>
            {/* Scrollable declaration text */}
            <div className="flex-1 overflow-y-auto my-4 pr-2">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6">
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line font-serif">
                  {DECLARATION_TEXT}
                </div>
              </div>
            </div>

            {/* Signature area */}
            <div className="flex-shrink-0 border-t border-zinc-800 pt-4 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  <Feather className="w-3 h-3 text-amber-400" />
                  Sign with your name
                </label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={user?.name ?? "Your full name or creator name"}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 font-serif text-base"
                  maxLength={128}
                  onKeyDown={(e) => e.key === "Enter" && handleSign()}
                />
                <p className="text-xs text-zinc-600 mt-1">
                  By entering your name and clicking Sign, you affirm this declaration.
                  This is not a legal contract — it is a covenant.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Read later
                </Button>
                <Button
                  size="sm"
                  disabled={signatureName.trim().length < 2 || signMutation.isPending}
                  onClick={handleSign}
                  className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-2"
                >
                  <Feather className="w-3 h-3" />
                  {signMutation.isPending ? "Signing..." : "Sign the Declaration"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact badge for profile pages showing covenant status
export function CovenantBadge({ signedAt }: { signedAt: Date | string | null }) {
  if (!signedAt) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
      <ScrollText className="w-3 h-3" />
      <span>Covenant Signed</span>
      <span className="text-amber-600">·</span>
      <span className="text-amber-600">{new Date(signedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
    </div>
  );
}
