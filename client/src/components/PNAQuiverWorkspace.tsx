import { ArrowLeft, Image, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function PNAQuiverWorkspace({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const shelf = trpc.quiver.list.useQuery({ search: search || undefined, limit: 48 });
  const detail = trpc.quiver.get.useQuery({ id: selectedId! }, { enabled: selectedId !== null });

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Private Quiver workspace">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}>
        <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-lg px-3" style={{ color: "var(--ln-smoke)", border: "1px solid var(--ln-panel-border)", fontFamily: "var(--font-display)", fontSize: "0.6rem" }}>
          <ArrowLeft size={14} /> RETURN TO THREAD
        </button>
        <div className="min-w-0 flex-1">
          <div style={{ color: "var(--ln-gold)", fontFamily: "var(--font-display)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>PRIVATE QUIVER</div>
          <div style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-body)", fontSize: "0.74rem" }}>Your generated and saved visual working assets. Nothing here is public by default.</div>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-lg px-3" style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)" }}>
          <Search size={14} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search prompts" className="w-32 bg-transparent outline-none" style={{ color: "var(--ln-bone)", fontFamily: "var(--font-body)", fontSize: "0.8rem" }} />
        </label>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(280px,34%)]">
        <div className="min-h-0 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}>
          {shelf.isLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" style={{ color: "var(--ln-gold)" }} /></div> : shelf.data?.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shelf.data.map((asset: { id: number; url: string; title: string | null }) => (
                <button key={asset.id} type="button" onClick={() => setSelectedId(asset.id)} className="overflow-hidden rounded-xl text-left transition-opacity hover:opacity-85" style={{ border: selectedId === asset.id ? "1px solid var(--ln-gold)" : "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}>
                  <img src={asset.url} alt={asset.title || "Private Quiver asset"} className="aspect-square w-full object-cover" loading="lazy" />
                  <div className="p-2" style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-body)", fontSize: "0.72rem" }}>{asset.title || "Private visual"}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center" style={{ color: "var(--ln-smoke)" }}><Image size={28} /><p style={{ fontFamily: "var(--font-body)" }}>Your private Quiver is empty. Generate in Vision, then choose Save to Quiver privately.</p></div>
          )}
        </div>
        <aside className="min-h-0 overflow-y-auto border-l p-4" style={{ borderColor: "var(--ln-panel-border)", background: "color-mix(in srgb, var(--ln-panel) 82%, transparent)" }}>
          {detail.isLoading ? <Loader2 className="animate-spin" style={{ color: "var(--ln-gold)" }} /> : detail.data ? <>
            <img src={detail.data.url} alt={detail.data.title || "Private Quiver asset"} className="aspect-square w-full rounded-xl object-cover" />
            <div className="mt-4" style={{ color: "var(--ln-gold)", fontFamily: "var(--font-display)", fontSize: "0.7rem" }}>{detail.data.title || "PRIVATE QUIVER ASSET"}</div>
            <p className="mt-2 whitespace-pre-wrap" style={{ color: "var(--ln-bone)", fontFamily: "var(--font-body)", fontSize: "0.85rem", lineHeight: 1.55 }}>{detail.data.prompt}</p>
            <p className="mt-4" style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-body)", fontSize: "0.72rem" }}>Private working asset. It has not been attached, registered, or published.</p>
          </> : <p style={{ color: "var(--ln-smoke)", fontFamily: "var(--font-body)", fontSize: "0.82rem" }}>Select an image to review its prompt and private working state.</p>}
        </aside>
      </div>
    </section>
  );
}
