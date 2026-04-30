/**
 * AddToCollectionModal
 * Opens when the user clicks the + button on any track card.
 * Shows their existing collections + a "New Collection" option.
 * Clicking a collection adds the track to it immediately (optimistic).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FolderPlus, Check, Loader2, Plus, Music } from "lucide-react";

interface AddToCollectionModalProps {
  songId: number;
  songTitle: string;
  open: boolean;
  onClose: () => void;
}

export function AddToCollectionModal({ songId, songTitle, open, onClose }: AddToCollectionModalProps) {
  const utils = trpc.useUtils();
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const { data: collections, isLoading } = trpc.userCollections.list.useQuery(undefined, {
    enabled: open,
  });

  const addTrack = trpc.userCollections.addTrack.useMutation({
    onSuccess: (result: { alreadyExists?: boolean } | undefined, vars: { collectionId: number; songId: number }) => {
      if (result?.alreadyExists) {
        toast.info("Already in collection");
      } else {
        setAddedIds(prev => new Set(prev).add(vars.collectionId));
        toast.success(`"${songTitle}" added to collection.`);
        utils.userCollections.list.invalidate();
        utils.userCollections.getTracks.invalidate();
      }
    },
    onError: () => toast.error("Could not add track."),
  });

  const createCollection = trpc.userCollections.create.useMutation({
    onSuccess: async (newCol: { id: number; name: string }) => {
      // Immediately add the track to the newly created collection
      await addTrack.mutateAsync({ collectionId: newCol.id, songId });
      utils.userCollections.list.invalidate();
      setCreatingNew(false);
      setNewName("");
    },
    onError: () => toast.error("Could not create collection."),
  });

  function handleCreateAndAdd() {
    if (!newName.trim()) return;
    createCollection.mutate({ name: newName.trim() });
  }

  function handleClose() {
    setCreatingNew(false);
    setNewName("");
    setAddedIds(new Set());
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: "var(--ln-panel, #0d1117)",
          border: "1px solid rgba(255,215,0,0.2)",
          color: "#e8e0d0",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#ffd700", fontFamily: "Orbitron, sans-serif", fontSize: "0.95rem" }}>
            Add to Collection
          </DialogTitle>
          <p style={{ color: "#a09070", fontSize: "0.8rem", marginTop: "2px" }}>
            "{songTitle}"
          </p>
        </DialogHeader>

        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
              <Loader2 size={20} style={{ color: "#ffd700", animation: "spin 1s linear infinite" }} />
            </div>
          ) : collections && collections.length > 0 ? (
            collections.map((col: { id: number; name: string; trackCount: number }) => {
              const added = addedIds.has(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => !added && addTrack.mutate({ collectionId: col.id, songId })}
                  disabled={added || addTrack.isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    background: added ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${added ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: added ? "#ffd700" : "#c8b890",
                    cursor: added ? "default" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    width: "100%",
                  }}
                >
                  {added ? (
                    <Check size={14} style={{ color: "#ffd700", flexShrink: 0 }} />
                  ) : (
                    <Music size={14} style={{ color: "#a09070", flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: "0.88rem", fontWeight: 500 }}>{col.name}</span>
                  <span style={{ fontSize: "0.75rem", color: "#706050" }}>{col.trackCount} tracks</span>
                </button>
              );
            })
          ) : (
            <p style={{ color: "#706050", fontSize: "0.82rem", textAlign: "center", padding: "12px 0" }}>
              No collections yet. Create one below.
            </p>
          )}

          {/* New Collection row */}
          {creatingNew ? (
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <Input
                autoFocus
                placeholder="Collection name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,215,0,0.3)",
                  color: "#e8e0d0",
                  fontSize: "0.85rem",
                  height: "34px",
                }}
              />
              <Button
                size="sm"
                onClick={handleCreateAndAdd}
                disabled={!newName.trim() || createCollection.isPending}
                style={{ background: "#ffd700", color: "#0a0812", fontWeight: 700, height: "34px", padding: "0 12px" }}
              >
                {createCollection.isPending ? <Loader2 size={14} className="animate-spin" /> : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setCreatingNew(false); setNewName(""); }}
                style={{ height: "34px", color: "#a09070" }}
              >
                ✕
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "6px",
                background: "transparent",
                border: "1px dashed rgba(255,215,0,0.3)",
                color: "#ffd700",
                cursor: "pointer",
                fontSize: "0.85rem",
                marginTop: "4px",
                width: "100%",
              }}
            >
              <FolderPlus size={14} />
              New Collection
            </button>
          )}
        </div>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={handleClose} style={{ color: "#a09070" }}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AddToCollectionButton
 * Small + button to place on track cards. Manages its own modal state.
 */
interface AddToCollectionButtonProps {
  songId: number;
  songTitle: string;
  size?: number;
  className?: string;
}

export function AddToCollectionButton({ songId, songTitle, size = 14, className }: AddToCollectionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        title="Add to collection"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size + 10,
          height: size + 10,
          borderRadius: "50%",
          background: "rgba(255,215,0,0.12)",
          border: "1px solid rgba(255,215,0,0.35)",
          color: "#ffd700",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,215,0,0.25)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,215,0,0.12)";
        }}
      >
        <Plus size={size} />
      </button>
      <AddToCollectionModal
        songId={songId}
        songTitle={songTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
