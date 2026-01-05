import { useState } from "react";
import { Play, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Resource } from "@/hooks/useResources";

interface VideoCardProps {
  video: Resource;
}

// Extract video ID and type from URL
function parseVideoUrl(url: string): { type: "youtube" | "loom" | "vimeo" | "unknown"; id: string | null } {
  if (!url) return { type: "unknown", id: null };

  // YouTube patterns
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  if (youtubeMatch) {
    return { type: "youtube", id: youtubeMatch[1] };
  }

  // Loom patterns
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { type: "loom", id: loomMatch[1] };
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { type: "vimeo", id: vimeoMatch[1] };
  }

  return { type: "unknown", id: null };
}

// Get thumbnail URL based on video type
function getThumbnailUrl(url: string, customThumbnail?: string | null): string | null {
  if (customThumbnail) return customThumbnail;

  const { type, id } = parseVideoUrl(url);

  switch (type) {
    case "youtube":
      return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    case "loom":
      return `https://cdn.loom.com/sessions/thumbnails/${id}-with-play.gif`;
    case "vimeo":
      // Vimeo requires API call for thumbnail, return null for now
      return null;
    default:
      return null;
  }
}

// Get embed URL based on video type
function getEmbedUrl(url: string): string | null {
  const { type, id } = parseVideoUrl(url);

  switch (type) {
    case "youtube":
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    case "loom":
      return `https://www.loom.com/embed/${id}?autoplay=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    default:
      return null;
  }
}

export function VideoCard({ video }: VideoCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const thumbnailUrl = video.url ? getThumbnailUrl(video.url, video.file_path) : null;
  const embedUrl = video.url ? getEmbedUrl(video.url) : null;
  const { type } = video.url ? parseVideoUrl(video.url) : { type: "unknown" };

  const handleClick = () => {
    if (embedUrl) {
      setIsOpen(true);
    } else if (video.url) {
      window.open(video.url, "_blank");
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="group cursor-pointer"
      >
        <div className="aspect-video bg-card rounded-xl border border-border/50 overflow-hidden relative mb-3 group-hover:border-primary/30 transition-all group-hover:shadow-lg group-hover:shadow-primary/5">
          {thumbnailUrl && !thumbnailError ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setThumbnailError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/50" />
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all shadow-lg">
              <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>

          {/* Video type badge */}
          {type !== "unknown" && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 text-xs font-medium bg-black/60 text-white rounded-md capitalize">
                {type}
              </span>
            </div>
          )}
        </div>
        
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {video.description}
          </p>
        )}
      </div>

      {/* Video Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none overflow-hidden">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="aspect-video w-full">
            {embedUrl && (
              <iframe
                src={embedUrl}
                title={video.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { parseVideoUrl, getThumbnailUrl, getEmbedUrl };
