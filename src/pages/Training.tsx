import { useState } from "react";
import { GraduationCap, Search, ExternalLink, Trash2, Plus, RotateCcw, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTrainingHubCatalog,
  type TrainingHubVideo,
} from "@/hooks/useTrainingHubCatalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRAND = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  neonGreen: "#00D26A",
  border: "#D9D9D9",
  muted: "#5C5C5C",
  soft: "#F6F6F6",
};

export default function Training() {
  const { isManager } = useAuth();
  const {
    categories,
    totalVideos,
    suppressedCatalogEntries,
    isLoading,
    isError,
    removeVideo,
    restoreCatalogVideo,
    addCustomVideo,
    isMutating,
  } = useTrainingHubCatalog();

  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? "");
  const [activeVideo, setActiveVideo] = useState<TrainingHubVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState(categories[0]?.slug ?? "sales");
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");

  const current = categories.find((c) => c.slug === activeCategory);
  const q = searchQuery.toLowerCase();
  const filteredVideos = current
    ? current.videos.filter((v) => {
        if (!q) return true;
        if (v.title.toLowerCase().includes(q)) return true;
        return (v.description ?? "").toLowerCase().includes(q);
      })
    : [];

  const handleRemove = async (video: TrainingHubVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const label = video.kind === "custom" ? "this added video" : "this video from the catalog";
    if (!confirm(`Remove ${label} for everyone?`)) return;
    try {
      await removeVideo(video);
      if (activeVideo?.id === video.id) setActiveVideo(null);
      toast.success(video.kind === "custom" ? "Video removed" : "Video hidden from the hub");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update the catalog";
      toast.error(message);
    }
  };

  const handleRestore = async (loomVideoId: string) => {
    try {
      await restoreCatalogVideo(loomVideoId);
      toast.success("Video restored to the hub");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not restore";
      toast.error(message);
    }
  };

  const handleAddSubmit = async () => {
    try {
      await addCustomVideo({
        categorySlug: addCategory,
        loomUrlOrId: addUrl,
        title: addTitle,
        description: addDescription.trim() || undefined,
      });
      toast.success("Video added");
      setAddOpen(false);
      setAddUrl("");
      setAddTitle("");
      setAddDescription("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not add video";
      toast.error(message);
    }
  };

  return (
    <div
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BRAND.black }}
    >
      {isError && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: BRAND.border, backgroundColor: "#FFF8F8", color: BRAND.black }}
        >
          Live catalog updates are unavailable (database tables may not be migrated yet). Showing
          the default video list only. After applying migrations, refresh the page.
        </div>
      )}

      <header
        className="pt-4 lg:pt-0 rounded-3xl border p-5 sm:p-6"
        style={{ borderColor: BRAND.border, backgroundColor: BRAND.white }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: BRAND.black }}
            >
              <GraduationCap className="w-5 h-5" style={{ color: BRAND.white }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Training Hub</h1>
              <p className="text-sm" style={{ color: BRAND.muted }}>
                {isLoading ? "Loading catalog…" : `${totalVideos} training videos across ${categories.length} categories`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: BRAND.muted }}
              />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 max-w-full rounded-lg border text-sm focus:outline-none"
                style={{
                  borderColor: BRAND.border,
                  backgroundColor: BRAND.white,
                  color: BRAND.black,
                }}
              />
            </div>
            {isManager && !isError && (
              <Button
                type="button"
                size="sm"
                className="gap-2 rounded-lg font-medium"
                style={{ backgroundColor: BRAND.neonGreen, color: BRAND.black }}
                onClick={() => {
                  setAddCategory(activeCategory || "sales");
                  setAddOpen(true);
                }}
                disabled={isMutating}
              >
                <Plus className="h-4 w-4" />
                Add video
              </Button>
            )}
          </div>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2 border-b pb-2"
        style={{ borderColor: BRAND.border }}
      >
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => {
              setActiveCategory(cat.slug);
              setActiveVideo(null);
              setSearchQuery("");
            }}
            className="px-4 py-2.5 text-sm font-medium border rounded-full transition-colors"
            style={{
              borderColor: activeCategory === cat.slug ? BRAND.neonGreen : BRAND.border,
              color: BRAND.black,
              backgroundColor: activeCategory === cat.slug ? BRAND.neonGreen : BRAND.white,
            }}
          >
            {cat.name}
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: activeCategory === cat.slug ? BRAND.black : BRAND.soft,
                color: activeCategory === cat.slug ? BRAND.white : BRAND.muted,
              }}
            >
              {cat.videos.length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 min-h-[60vh]">
        <div
          className={`${
            activeVideo ? "xl:w-[420px] xl:flex-shrink-0" : "w-full"
          } space-y-2 overflow-y-auto transition-all rounded-3xl border p-3 sm:p-4`}
          style={{ borderColor: BRAND.border, backgroundColor: BRAND.white }}
        >
          {current && (
            <p className="text-sm mb-2 px-1" style={{ color: BRAND.muted }}>
              {current.description}
            </p>
          )}
          {filteredVideos.map((video) => {
            const selected = activeVideo?.id === video.id;
            return (
              <div
                key={video.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveVideo(video)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveVideo(video);
                  }
                }}
                className="w-full flex gap-3 p-2 rounded-xl border-l-4 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{
                  backgroundColor: selected ? "#F0FFF7" : BRAND.white,
                  borderLeftColor: selected ? BRAND.neonGreen : "transparent",
                  borderColor: BRAND.border,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderLeftWidth: 4,
                }}
              >
                <div
                  className="relative shrink-0 overflow-hidden rounded-lg bg-black"
                  style={{ aspectRatio: "16 / 9", width: 128 }}
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  {!video.thumbnailUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-90" fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <span className="text-sm font-medium leading-snug line-clamp-3">{video.title}</span>
                  {video.description ? (
                    <span className="text-xs leading-snug line-clamp-2" style={{ color: BRAND.muted }}>
                      {video.description}
                    </span>
                  ) : null}
                  {video.kind === "custom" && (
                    <span className="text-[11px] uppercase tracking-wide" style={{ color: BRAND.muted }}>
                      Added link
                    </span>
                  )}
                </div>
                {isManager && !isError && (
                  <button
                    type="button"
                    className="shrink-0 self-start rounded-lg p-2 transition-colors hover:bg-red-50"
                    style={{ color: BRAND.black }}
                    title={video.kind === "custom" ? "Remove added video" : "Hide from hub"}
                    onClick={(e) => void handleRemove(video, e)}
                    disabled={isMutating}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
          {filteredVideos.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: BRAND.muted }}>
              No videos match your search.
            </div>
          )}
        </div>

        {activeVideo && (
          <div
            className="flex-1 space-y-4 rounded-3xl border p-4 sm:p-6"
            style={{ borderColor: BRAND.border, backgroundColor: BRAND.white }}
          >
            <h2 className="text-lg font-semibold">{activeVideo.title}</h2>
            {activeVideo.description ? (
              <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>
                {activeVideo.description}
              </p>
            ) : null}
            <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden bg-black shadow-lg">
              <iframe
                src={activeVideo.embedUrl}
                title={activeVideo.title}
                frameBorder={0}
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            <a
              href={activeVideo.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: BRAND.black, color: BRAND.white }}
            >
              <ExternalLink className="w-4 h-4" />
              Open in Loom
            </a>
          </div>
        )}
      </div>

      {isManager && !isError && suppressedCatalogEntries.length > 0 && (
        <section
          className="rounded-3xl border p-5 sm:p-6"
          style={{ borderColor: BRAND.border, backgroundColor: BRAND.white }}
        >
          <h3 className="text-base font-bold mb-2">Hidden from catalog</h3>
          <p className="text-sm mb-4" style={{ color: BRAND.muted }}>
            These default Loom links are hidden for all users. Restore a video to show it again.
          </p>
          <ul className="divide-y" style={{ borderColor: BRAND.border }}>
            {suppressedCatalogEntries.map((row) => (
              <li
                key={row.loomVideoId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{row.title}</div>
                  <div className="text-xs" style={{ color: BRAND.muted }}>
                    {row.categoryLabel}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => void handleRestore(row.loomVideoId)}
                  disabled={isMutating}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Loom video</DialogTitle>
            <DialogDescription>
              Paste a Loom share or embed URL. It appears in the selected category for everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="training-cat">Category</Label>
              <Select value={addCategory} onValueChange={setAddCategory}>
                <SelectTrigger id="training-cat">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="training-url">Loom URL</Label>
              <Input
                id="training-url"
                placeholder="https://www.loom.com/share/…"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="training-title">Title</Label>
              <Input
                id="training-title"
                placeholder="Short label shown in the list"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="training-desc">Description (optional)</Label>
              <Textarea
                id="training-desc"
                placeholder="Shown under the title in the list and in the detail panel"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                rows={3}
                className="resize-y min-h-[72px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isMutating || !addTitle.trim() || !addUrl.trim()}
              onClick={() => void handleAddSubmit()}
              style={{ backgroundColor: BRAND.neonGreen, color: BRAND.black }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
