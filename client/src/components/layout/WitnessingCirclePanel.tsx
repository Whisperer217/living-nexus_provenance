import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ExternalLink, Search, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { WitnessSigil } from "@/components/icons/WitnessSigil";

type WitnessedCreator = {
  creatorId: number;
  name: string | null;
  artistHandle: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  tier: "witness" | "reserve" | "steward";
  witnessedAt: Date | string;
  updatedAt: Date | string;
};

type CircleOrder = "recent" | "name";

function tierLabel(tier: WitnessedCreator["tier"]) {
  if (tier === "reserve") return "Reserve witness";
  if (tier === "steward") return "Steward witness";
  return "Witness";
}

export function WitnessingCirclePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<CircleOrder>("recent");
  const { data: witnessedCreators = [], isLoading } = trpc.witnessSubscription.myWitnessing.useQuery(undefined, {
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const rows = (witnessedCreators as WitnessedCreator[]).filter((creator) => {
      if (!normalizedQuery) return true;
      return [creator.artistHandle, creator.name, creator.bio]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
    });
    return rows.sort((a, b) => {
      if (order === "name") return (a.artistHandle || a.name || "").localeCompare(b.artistHandle || b.name || "");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [order, query, witnessedCreators]);

  const openCreator = (creator: WitnessedCreator) => {
    navigate(`/creator/${creator.artistHandle || creator.creatorId}`);
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className={`ln-witnessing-circle-backdrop ${open ? "ln-witnessing-circle-backdrop--open" : ""}`}
        onClick={onClose}
        aria-label="Close Witnessing Circle"
        tabIndex={open ? 0 : -1}
      />
      <aside
        id="witnessing-circle-panel"
        className={`ln-witnessing-circle ${open ? "ln-witnessing-circle--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="witnessing-circle-title"
        aria-hidden={!open}
      >
        <header className="ln-witnessing-circle__header">
          <div className="flex min-w-0 items-center gap-3">
            <span className="ln-witnessing-circle__sigil" aria-hidden="true"><WitnessSigil size={19} /></span>
            <div className="min-w-0">
              <p className="ln-overline !mb-0 !text-[var(--ln-gold-hot)]">Creator relationships</p>
              <h2 id="witnessing-circle-title" className="ln-section-header !mt-0 !text-[var(--ln-parchment)]">Witnessing Circle</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ln-witnessing-circle__close" aria-label="Close Witnessing Circle"><X size={18} /></button>
        </header>

        <p className="ln-witnessing-circle__intro">Creators whose future registered manifestations you have chosen to witness.</p>

        <div className="ln-witnessing-circle__filters">
          <label className="ln-dimensional-field ln-witnessing-circle__search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search witnessed creators</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a creator" autoComplete="off" />
          </label>
          <label className="ln-witnessing-circle__order">
            <ArrowUpDown size={14} aria-hidden="true" />
            <span className="sr-only">Order witnessed creators</span>
            <select value={order} onChange={(event) => setOrder(event.target.value as CircleOrder)}>
              <option value="recent">Recently witnessed</option>
              <option value="name">Creator name</option>
            </select>
          </label>
        </div>

        <div className="ln-witnessing-circle__results" aria-live="polite">
          {isLoading ? (
            [0, 1, 2].map((index) => <div key={index} className="ln-witnessing-circle__skeleton" />)
          ) : visibleCreators.length === 0 ? (
            <div className="ln-witnessing-circle__empty">
              <WitnessSigil size={26} />
              <p>{query ? "No witnessed creators match that search." : "Your Witnessing Circle is ready to receive the creators you choose to witness."}</p>
              {!query && <button type="button" onClick={() => { navigate("/explore?view=creators"); onClose(); }}>Explore creators</button>}
            </div>
          ) : (
            visibleCreators.map((creator) => {
              const identity = creator.artistHandle || creator.name || "Creator";
              return (
                <button key={creator.creatorId} type="button" className="ln-witnessing-circle__creator" onClick={() => openCreator(creator)}>
                  <span className="ln-witnessing-circle__avatar">
                    {creator.profilePhotoUrl ? <img src={creator.profilePhotoUrl} alt="" /> : identity.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="ln-witnessing-circle__identity">{identity}</span>
                    {creator.artistHandle && creator.name && creator.artistHandle !== creator.name && <span className="ln-witnessing-circle__name">{creator.name}</span>}
                    <span className="ln-witnessing-circle__bio">{creator.bio || "Creator domain witnessed through the Living Nexus Registry."}</span>
                    <span className="ln-witnessing-circle__meta">{tierLabel(creator.tier)} · established {new Date(creator.witnessedAt).toLocaleDateString()}</span>
                  </span>
                  <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                </button>
              );
            })
          )}
        </div>

        <footer className="ln-witnessing-circle__footer">
          <span>{isLoading ? "" : `${witnessedCreators.length} witnessed creator${witnessedCreators.length === 1 ? "" : "s"}`}</span>
          <button type="button" onClick={() => { navigate("/profile?tab=witnessing"); onClose(); }}>Open full directory</button>
        </footer>
      </aside>
    </>
  );
}
