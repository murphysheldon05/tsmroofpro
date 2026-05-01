import { useState } from "react";
import { GraduationCap, Play, Search, ExternalLink } from "lucide-react";
import trainingData from "@/data/training-videos.json";

const BRAND = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  neonGreen: "#00D26A",
  border: "#D9D9D9",
  muted: "#5C5C5C",
  soft: "#F6F6F6",
};

interface Video {
  id: string;
  title: string;
  shareUrl: string;
  embedUrl: string;
}

interface Category {
  name: string;
  slug: string;
  description: string;
  videoCount: number;
  videos: Video[];
}

const data = trainingData as {
  generatedAt: string;
  totalVideos: number;
  categories: Category[];
};

export default function Training() {
  const [activeCategory, setActiveCategory] = useState(data.categories[0]?.slug ?? "");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const current = data.categories.find((c) => c.slug === activeCategory);
  const filteredVideos = current
    ? current.videos.filter((v) =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div
      className="max-w-7xl mx-auto space-y-6"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BRAND.black }}
    >
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
                {data.totalVideos} training videos across {data.categories.length} categories
              </p>
            </div>
          </div>
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
                boxShadow: "0 0 0 0 rgba(0, 210, 106, 0)",
              }}
            />
          </div>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2 border-b pb-2"
        style={{ borderColor: BRAND.border }}
      >
        {data.categories.map((cat) => (
          <button
            key={cat.slug}
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
              {cat.videoCount}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 min-h-[60vh]">
        <div
          className={`${
            activeVideo ? "xl:w-96 xl:flex-shrink-0" : "w-full"
          } space-y-1 overflow-y-auto transition-all rounded-3xl border p-3 sm:p-4`}
          style={{ borderColor: BRAND.border, backgroundColor: BRAND.white }}
        >
          {current && (
            <p className="text-sm mb-3 px-1" style={{ color: BRAND.muted }}>
              {current.description}
            </p>
          )}
          {filteredVideos.map((video) => (
            <button
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border-l-2 transition-colors"
              style={{
                backgroundColor: activeVideo?.id === video.id ? "#F0FFF7" : BRAND.white,
                borderLeftColor: activeVideo?.id === video.id ? BRAND.neonGreen : "transparent",
              }}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: BRAND.black }}
              >
                <Play className="w-3.5 h-3.5 fill-current" style={{ color: BRAND.white }} />
              </div>
              <span className="text-sm leading-snug line-clamp-2">
                {video.title}
              </span>
            </button>
          ))}
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
            <h2 className="text-lg font-semibold">
              {activeVideo.title}
            </h2>
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
    </div>
  );
}
