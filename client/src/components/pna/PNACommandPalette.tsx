import React, { useEffect } from "react";
import { Archive, BookMarked, Image, Keyboard, Layers, MessageSquarePlus, Search, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { PNAMode, PNAModeOption, PNAThreadSummary, PNAWorkspaceSurface } from "./pnaWorkspaceTypes";
import { PNAOperationsPauseNotice } from "./PNAOperationsPauseNotice";
import { AI_OPERATIONS_ENABLED } from "@shared/aiAvailability";

interface PNACommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modes: PNAModeOption[];
  activeMode: PNAMode;
  threads: PNAThreadSummary[];
  activeThreadId: string | null;
  onCreateThread: () => void;
  onSelectThread: (id: string) => void;
  onSelectMode: (mode: PNAMode) => void;
  onOpenSurface: (surface: PNAWorkspaceSurface) => void;
  onFocusComposer: () => void;
  onNavigate: (href: string) => void;
}

export function PNACommandPalette({
  open,
  onOpenChange,
  modes,
  activeMode,
  threads,
  activeThreadId,
  onCreateThread,
  onSelectThread,
  onSelectMode,
  onOpenSurface,
  onFocusComposer,
  onNavigate,
}: PNACommandPaletteProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="PNA workspace command palette"
      description="Search private threads, stewardship tools, and workspace surfaces."
      className="border-[var(--ln-panel-border)] bg-[var(--ln-panel)] text-[var(--ln-parchment)] shadow-2xl"
    >
      <CommandInput placeholder="Search your private workspace…" />
      <div className="px-3 pb-2"><PNAOperationsPauseNotice compact /></div>
      <CommandList>
        <CommandEmpty>No private workspace action found.</CommandEmpty>
        <CommandGroup heading="Workspace">
          <CommandItem onSelect={() => run(onCreateThread)}>
            <MessageSquarePlus />
            <span>Begin private thread</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem disabled={!AI_OPERATIONS_ENABLED} onSelect={() => run(onFocusComposer)}>
            <Keyboard />
            <span>{AI_OPERATIONS_ENABLED ? "Focus composer" : "Composer paused"}</span>
            <CommandShortcut>{AI_OPERATIONS_ENABLED ? "⌘↵" : "PAUSED"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSurface("conversation"))}>
            <Search />
            <span>Open conversation</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSurface("context"))}>
            <Layers />
            <span>Inspect context and sources</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenSurface("artifacts"))}>
            <Image />
            <span>Review private artifacts</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Stewardship profiles">
          {modes.map((mode) => (
            <CommandItem
              key={mode.id}
              value={`${mode.label} ${mode.desc}`}
              onSelect={() => run(() => onSelectMode(mode.id))}
            >
              <mode.icon />
              <span>{mode.label}</span>
              <CommandShortcut>{activeMode === mode.id ? "ACTIVE" : ""}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Private thread history">
          {threads.length === 0 ? (
            <CommandItem disabled value="No private threads yet">No private threads yet</CommandItem>
          ) : (
            threads.map((thread) => (
              <CommandItem
                key={thread.id}
                value={`${thread.title} ${thread.activeMode}`}
                onSelect={() => run(() => onSelectThread(thread.id))}
              >
                <Sparkles />
                <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                <CommandShortcut>{activeThreadId === thread.id ? "OPEN" : ""}</CommandShortcut>
              </CommandItem>
            ))
          )}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Private library">
          <CommandItem onSelect={() => run(() => onNavigate("/pna?view=quiver"))}>
            <Image />
            <span>Open Quiver</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onNavigate("/keeper"))}>
            <BookMarked />
            <span>Open notes and diaries</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onNavigate("/archive"))}>
            <Archive />
            <span>Open my archive</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
