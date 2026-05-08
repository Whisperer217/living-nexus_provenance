/**
 * TosAcceptanceModal
 *
 * Self-contained — reads auth state, shows automatically when:
 *   - User is authenticated AND
 *   - user.tosAcceptedAt is null OR user.tosVersion !== CURRENT_TOS_VERSION
 *
 * Non-dismissible: the user must accept before the modal closes.
 * On acceptance: calls trpc.onboarding.acceptTos and invalidates profile.me.
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

// Bump this when a new TOS version is published to re-prompt existing users
export const CURRENT_TOS_VERSION = "2.1";

export function TosAcceptanceModal() {
  const { user, isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const acceptTos = trpc.onboarding.acceptTos.useMutation({
    onSuccess: () => {
      setOpen(false);
      // Invalidate profile so the parent knows tosAcceptedAt is now set
      utils.profile.me.invalidate();
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      setError(err.message || "Failed to record acceptance. Please try again.");
    },
  });

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;
    const u = user as any;
    const needsAcceptance =
      !u.tosAcceptedAt ||
      !u.tosVersion ||
      u.tosVersion !== CURRENT_TOS_VERSION;
    if (needsAcceptance) setOpen(true);
  }, [loading, isAuthenticated, user]);

  function handleAccept() {
    if (!checked) {
      setError("Please check the box to confirm you have read and agree to the Terms of Service.");
      return;
    }
    setError(null);
    acceptTos.mutate({ version: CURRENT_TOS_VERSION });
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {/* intentionally non-dismissible */}}>
      <DialogContent
        className="max-w-2xl bg-[#0d0d0d] border border-[#2a2a2a] text-[#e8dcc8] shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-[#e8dcc8] tracking-wide">
                Terms of Service — Version {CURRENT_TOS_VERSION}
              </DialogTitle>
              <DialogDescription className="text-[#8a7a6a] text-sm mt-0.5">
                Please read and accept before continuing to Living Nexus.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable TOS summary */}
        <ScrollArea className="h-64 rounded-md border border-[#2a2a2a] bg-[#111] px-4 py-3 text-sm text-[#b0a090] leading-relaxed">
          <div className="space-y-4">
            <section>
              <h3 className="text-[#e8dcc8] font-semibold mb-1">1. Platform Purpose</h3>
              <p>
                Living Nexus is a creative provenance registry operated by BDDT Publishing / Command Domains LLC.
                The platform provides Witness IDs (WIDs) and related tools to help creators establish verifiable
                records of authorship, creation date, and work integrity.
              </p>
            </section>

            <section>
              <h3 className="text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                2. Witness IDs — Scope and Limitations
              </h3>
              <p>
                A Witness ID (WID) is a cryptographic provenance record that documents the existence and integrity
                of a work at a specific point in time.{" "}
                <strong className="text-[#e8dcc8]">
                  A WID is not a copyright registration and does not confer copyright ownership.
                </strong>{" "}
                It supports but does not replace official copyright registration with the U.S. Copyright Office
                or equivalent authority in your jurisdiction.
              </p>
              <p className="mt-2">
                BDDT Publishing / Command Domains LLC makes no warranty that a WID will be recognized as legal
                proof of copyright in any jurisdiction. Creators are solely responsible for pursuing official
                copyright registration if legal protection is required.
              </p>
            </section>

            <section>
              <h3 className="text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                3. Platform Infrastructure & Governing Terms
              </h3>
              <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/5 mb-2">
                <p className="text-amber-200/80 text-xs leading-relaxed">
                  <strong className="text-amber-300">Current Limitation:</strong> Living Nexus currently
                  operates within a third-party AI infrastructure platform. Until we migrate to fully
                  sovereign hosting, the host platform's Terms of Service may take precedence over these
                  terms in areas of conflict. We cannot fully confirm our TOS is self-enforcing until that
                  migration is complete.
                </p>
              </div>
              <p>
                We are actively working toward sovereign infrastructure fully owned by BDDT Publishing /
                Command Domains LLC. A public notice will be posted when these Terms become the sole
                governing document. We encourage you to review the host platform's terms independently.
              </p>
            </section>

            <section>
              <h3 className="text-[#e8dcc8] font-semibold mb-1">4. Creator Responsibilities</h3>
              <p>
                By uploading content to Living Nexus, you affirm that you are the original creator or have
                obtained all necessary rights, licenses, and permissions. You are solely responsible for the
                accuracy of all metadata, authorship declarations, and AI disclosure information you provide.
              </p>
            </section>

            <section>
              <h3 className="text-[#e8dcc8] font-semibold mb-1">5. AI Disclosure</h3>
              <p>
                You agree to accurately disclose the role of AI tools in the creation of your works using
                the platform's disclosure system (Human-Made, AI-Assisted, AI-Assisted Manifestation, or
                Human-Authored via AI Instrument). Misrepresentation of AI involvement may result in
                account suspension.
              </p>
            </section>

            <section>
              <h3 className="text-[#e8dcc8] font-semibold mb-1">6. Platform Liability</h3>
              <p>
                Living Nexus is provided "as is." BDDT Publishing / Command Domains LLC is not liable for
                any loss of data, infringement claims, or damages arising from your use of the platform.
                The platform does not provide legal advice.
              </p>
            </section>

            <p className="text-[#6a5a4a] text-xs pt-2 border-t border-[#2a2a2a]">
              Full Terms of Service are available at{" "}
              <Link href="/terms" className="text-amber-400 underline underline-offset-2">
                /terms
              </Link>
              . By accepting, you acknowledge you have read, understood, and agree to be bound by these terms.
            </p>
          </div>
        </ScrollArea>

        {/* Read full TOS link */}
        <div className="flex items-center gap-2 text-xs text-[#6a5a4a]">
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Read the complete Terms of Service at{" "}
            <Link href="/terms" className="text-amber-400 underline underline-offset-2 hover:text-amber-300">
              /terms
            </Link>{" "}
            before accepting.
          </span>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-[#2a2a2a] bg-[#0a0a0a]">
          <Checkbox
            id="tos-accept"
            checked={checked}
            onCheckedChange={(v) => {
              setChecked(v === true);
              if (v) setError(null);
            }}
            className="mt-0.5 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
          />
          <label
            htmlFor="tos-accept"
            className="text-sm text-[#b0a090] leading-relaxed cursor-pointer select-none"
          >
            I have read and agree to the Living Nexus Terms of Service (v{CURRENT_TOS_VERSION}), including the
            Witness ID scope and limitations, and the platform infrastructure disclosure. I understand that
            a WID supports but does not replace official copyright registration, and that Living Nexus
            currently operates within a third-party AI infrastructure platform whose terms may supersede
            these terms until sovereign migration is complete.
          </label>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleAccept}
            disabled={!checked || acceptTos.isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-40"
          >
            {acceptTos.isPending ? "Recording acceptance…" : "Accept & Continue"}
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-[#2a2a2a] text-[#8a7a6a] hover:text-[#e8dcc8] bg-transparent"
          >
            <Link href="/terms">Read Full TOS</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
