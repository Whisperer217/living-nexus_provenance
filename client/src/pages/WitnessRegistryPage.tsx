import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, FileText, Video, Image, ChevronDown, ExternalLink, ShieldCheck } from "lucide-react";

type RegistryType = "all" | "full_works" | "lyrics";

const LIMIT = 50;

function AssetBadges({
  hasAudio,
  hasVideo,
  hasLyrics,
  isLyricsOnly,
}: {
  hasAudio: boolean;
  hasVideo: boolean;
  hasLyrics: boolean;
  isLyricsOnly: boolean | null;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Cover art is always present for witnessed works */}
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
        <Image className="w-2.5 h-2.5" /> Art
      </span>
      {hasAudio && !isLyricsOnly && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
          <Music className="w-2.5 h-2.5" /> Audio
        </span>
      )}
      {hasVideo && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-950 text-blue-400 border border-blue-800">
          <Video className="w-2.5 h-2.5" /> Video
        </span>
      )}
      {hasLyrics && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950 text-amber-400 border border-amber-800">
          <FileText className="w-2.5 h-2.5" /> Lyrics
        </span>
      )}
    </div>
  );
}

function RegistryRow({ item }: { item: any }) {
  const handle = item.artistHandle || `user-${item.userId}`;
  const creatorPath = `/creator/${item.userId}`;
  const songPath = `/song/${item.id}`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors group">
      {/* Thumbnail */}
      <Link href={songPath}>
        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
          {item.coverArtUrl ? (
            <img
              src={item.coverArtUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-4 h-4 text-zinc-600" />
            </div>
          )}
        </div>
      </Link>

      {/* WID + title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Link href={`/verify/${item.witnessId}`}>
            <span className="font-mono text-[11px] text-amber-400/80 hover:text-amber-400 transition-colors truncate max-w-[180px] sm:max-w-xs">
              {item.witnessId}
            </span>
          </Link>
        </div>
        <Link href={songPath}>
          <p className="text-sm font-medium text-zinc-200 truncate hover:text-white transition-colors">
            {item.title}
          </p>
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <Link href={creatorPath}>
            <span className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              @{handle}
            </span>
          </Link>
          {item.genre && (
            <span className="text-xs text-zinc-600">· {item.genre}</span>
          )}
        </div>
      </div>

      {/* Asset type badges */}
      <div className="hidden sm:flex items-center">
        <AssetBadges
          hasAudio={item.hasAudio}
          hasVideo={item.hasVideo}
          hasLyrics={item.hasLyrics}
          isLyricsOnly={item.isLyricsOnly}
        />
      </div>

      {/* Date + link */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[11px] text-zinc-600">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
        <Link href={songPath}>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

export default function WitnessRegistryPage() {
  const [activeTab, setActiveTab] = useState<RegistryType>("all");
  const [cursor, setCursor] = useState(0);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isFetching } = trpc.witnessRegistry.list.useQuery(
    { type: activeTab, cursor, limit: LIMIT },
    { staleTime: 30_000 }
  );

  // Accumulate pages when cursor advances
  useEffect(() => {
    if (!data) return;
    if (cursor === 0) {
      setAllItems(data.items);
    } else {
      setAllItems(prev => [...prev, ...data.items]);
    }
    setHasMore(data.nextCursor !== null);
  }, [data, cursor]);

  const handleTabChange = (val: string) => {
    setActiveTab(val as RegistryType);
    setCursor(0);
    setAllItems([]);
    setHasMore(true);
  };

  const loadMore = () => {
    if (data?.nextCursor !== null && data?.nextCursor !== undefined) {
      setCursor(data.nextCursor);
    }
  };

  const displayItems = allItems.length > 0 ? allItems : (data?.items ?? []);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight">Witness Registry</h1>
          </div>
          <p className="text-sm text-zinc-500 max-w-xl">
            A public ledger of every Witness ID issued on Living Nexus. Each entry is a
            cryptographic timestamp linking a creative work to its creator. Click any WID
            to verify provenance.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-transparent border-0 h-12 gap-1 p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:border-b-2 data-[state=active]:border-amber-400 data-[state=active]:text-amber-400 rounded-none bg-transparent px-4 h-12 text-sm"
              >
                All Records
              </TabsTrigger>
              <TabsTrigger
                value="full_works"
                className="data-[state=active]:border-b-2 data-[state=active]:border-amber-400 data-[state=active]:text-amber-400 rounded-none bg-transparent px-4 h-12 text-sm"
              >
                Full Works
              </TabsTrigger>
              <TabsTrigger
                value="lyrics"
                className="data-[state=active]:border-b-2 data-[state=active]:border-amber-400 data-[state=active]:text-amber-400 rounded-none bg-transparent px-4 h-12 text-sm"
              >
                Lyrics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Table header */}
      <div className="max-w-4xl mx-auto">
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-zinc-800/40 text-[11px] text-zinc-600 uppercase tracking-wider">
          <div className="w-10 flex-shrink-0" />
          <div className="flex-1">WID / Title / Creator</div>
          <div className="w-40">Asset Types</div>
          <div className="w-20 text-right">Date</div>
        </div>

        {/* Rows */}
        {isLoading && cursor === 0 ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 animate-pulse">
                <div className="w-10 h-10 rounded bg-zinc-800 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-48" />
                  <div className="h-3 bg-zinc-800 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShieldCheck className="w-12 h-12 text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm">No witnessed works in this category yet.</p>
            <p className="text-zinc-600 text-xs mt-1">
              Upload and witness a track to appear in the registry.
            </p>
          </div>
        ) : (
          <>
            {displayItems.map((item: any) => (
              <RegistryRow key={item.id} item={item} />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isFetching}
                  className="gap-2 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                >
                  <ChevronDown className="w-4 h-4" />
                  {isFetching ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}

            {!hasMore && displayItems.length > 0 && (
              <div className="text-center py-6 text-xs text-zinc-600">
                {displayItems.length} records — end of registry
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
