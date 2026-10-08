import type { KeyboardEvent, RefObject } from "react";
import { Layers, Loader2, Send, Settings2 } from "lucide-react";
import type { PNAMode, PNAModeOption, PNAProfileSettingView } from "./pnaWorkspaceTypes";

interface PNAComposerBarProps {
  activeMode: PNAMode;
  modes: PNAModeOption[];
  profile: PNAProfileSettingView | null;
  contextCount: number;
  value: string;
  isSending: boolean;
  isWorkInProgress: boolean;
  isVisionPromptInvalid: boolean;
  visionCounter?: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelectProfile: (mode: PNAMode) => void;
  onAttachContext: () => void;
  onOpenSettings: () => void;
  onSend: () => void;
}

export function PNAComposerBar({
  activeMode,
  modes,
  profile,
  contextCount,
  value,
  isSending,
  isWorkInProgress,
  isVisionPromptInvalid,
  visionCounter,
  inputRef,
  onChange,
  onKeyDown,
  onSelectProfile,
  onAttachContext,
  onOpenSettings,
  onSend,
}: PNAComposerBarProps) {
  const active = modes.find((mode) => mode.id === activeMode) ?? modes[0];
  const profileDisabled = Boolean(profile && !profile.isEnabled);
  const routeCopy = profileDisabled
    ? "Profile disabled"
    : contextCount === 0
      ? "No context attached"
      : profile?.allowRemoteContext
        ? "Remote selected-context permitted"
        : "Selected context stays local until permitted";

  return (
    <section className="flex-shrink-0 p-4" aria-label="PNA composer" style={{ borderTop: "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
        <label className="flex min-h-10 items-center gap-2 rounded-lg px-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}>
          <span className="font-display text-[var(--text-xs)] tracking-[0.1em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Profile</span>
          <select
            value={activeMode}
            onChange={(event) => onSelectProfile(event.target.value as PNAMode)}
            disabled={isWorkInProgress}
            className="bg-transparent font-body text-[var(--text-sm)] outline-none"
            style={{ color: "var(--ln-parchment)" }}
            aria-label="Active Stewardship Profile"
          >
            {modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={onAttachContext} disabled={isWorkInProgress} className="flex min-h-10 items-center gap-2 rounded-lg px-3 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-panel-border)", color: contextCount > 0 ? "var(--ln-gold)" : "var(--ln-bone)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.06em" }}>
          <Layers size={13} /> {contextCount === 0 ? "ATTACH CONTEXT" : `${contextCount} SOURCE${contextCount === 1 ? "" : "S"}`}
        </button>
        <button type="button" onClick={onOpenSettings} className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-left focus-visible:outline-none focus-visible:ring-2" style={{ color: profileDisabled ? "var(--ln-gold-hot)" : "var(--ln-smoke)" }} title="Open Stewardship settings">
          <Settings2 size={13} aria-hidden="true" />
          <span className="truncate font-body text-[var(--text-xs)]">{routeCopy}</span>
        </button>
      </div>

      <div className="rounded-xl p-2.5" style={{ background: "var(--ln-coal)", border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, var(--ln-panel-border))" }}>
        {contextCount > 0 && !profileDisabled && !profile?.allowRemoteContext ? (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2" role="status" style={{ background: "color-mix(in srgb, var(--ln-gold) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 20%, var(--ln-panel-border))" }}>
            <p className="font-body text-[var(--text-xs)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>Attached context remains private and will not be sent with this reply.</p>
            <button type="button" onClick={onOpenSettings} className="min-h-9 rounded px-2 font-display text-[var(--text-xs)] tracking-[0.06em] uppercase focus-visible:outline-none focus-visible:ring-2" style={{ color: "var(--ln-gold)" }}>Review permissions</button>
          </div>
        ) : null}
        {isWorkInProgress ? (
          <div className="mb-2 rounded-lg px-3 py-2" role="status" style={{ background: "color-mix(in srgb, var(--ln-gold) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 25%, var(--ln-panel-border))" }}>
            <p className="font-display text-[var(--text-xs)] tracking-[0.1em] uppercase" style={{ color: "var(--ln-gold)" }}>PNA is in active construction</p>
            <p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>Messages, visual proposals, and model use are paused. You can still inspect private threads, context, and artifacts.</p>
          </div>
        ) : null}
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={isWorkInProgress}
            placeholder={isWorkInProgress ? "PNA model operations are paused while this service is under construction." : activeMode === "vision" ? "Describe a private visual proposal…" : `Message ${active.label}…`}
            aria-label={activeMode === "vision" ? "Private visual proposal prompt" : `Message ${active.label}`}
            aria-invalid={isVisionPromptInvalid}
            rows={1}
            className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 font-body text-[var(--text-base)] leading-relaxed outline-none placeholder:text-[var(--ln-smoke)]"
            style={{ color: "var(--ln-parchment)", maxHeight: "160px", overflowY: "auto" }}
            onInput={(event) => {
              const element = event.currentTarget;
              element.style.height = "auto";
              element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
            }}
          />
          <button type="button" onClick={onSend} disabled={isWorkInProgress || !value.trim() || isSending || isVisionPromptInvalid || profileDisabled} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-85 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-gold)", color: "var(--ln-void)" }} aria-label={isWorkInProgress ? "PNA model operations are paused" : isSending ? "PNA is responding" : `Send message to ${active.label}`}>
            {isSending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 pb-0.5 pt-2">
          <p className="font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>Enter sends · Shift + Enter adds a line · PNA does not register or publish from this thread.</p>
          {visionCounter ? <p aria-live="polite" className="font-mono text-[var(--text-xs)]" style={{ color: isVisionPromptInvalid ? "var(--ln-gold-hot)" : "var(--ln-smoke)" }}>{visionCounter}</p> : null}
        </div>
      </div>
    </section>
  );
}
