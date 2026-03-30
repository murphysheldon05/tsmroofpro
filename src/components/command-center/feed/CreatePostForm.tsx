import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePost, useUploadFeedImage } from "@/hooks/useMessageCenter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, X, Send, Megaphone, Trophy, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { formatDisplayName } from "@/lib/displayName";
import type { Database } from "@/integrations/supabase/types";

type FeedPostType = Database["public"]["Enums"]["feed_post_type"];

const POST_TYPE_CONFIG: Record<
  FeedPostType,
  { label: string; icon: typeof Trophy; color: string }
> = {
  win: { label: "Win", icon: Trophy, color: "text-yellow-500" },
  announcement: { label: "Announcement", icon: Megaphone, color: "text-blue-500" },
  update: { label: "Update", icon: Newspaper, color: "text-green-500" },
};

export function CreatePostForm() {
  const { user, isAdmin, isManager } = useAuth();
  const createPost = useCreatePost();
  const uploadImage = useUploadFeedImage();

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<FeedPostType>("win");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = formatDisplayName(fullName, user?.email);
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canPostAnnouncement = isAdmin || isManager;

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    if (!content.trim()) return;

    try {
      let image_url: string | null = null;
      if (imageFile) {
        image_url = await uploadImage.mutateAsync(imageFile);
      }
      await createPost.mutateAsync({ content: content.trim(), post_type: postType, image_url });
      setContent("");
      setPostType("win");
      clearImage();
      setExpanded(false);
      toast.success("Post shared!");
    } catch {
      toast.error("Failed to create post");
    }
  }

  const isSubmitting = createPost.isPending || uploadImage.isPending;

  if (!expanded) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setExpanded(true)}
            className="flex-1 text-left px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground text-sm transition-colors"
          >
            What's on your mind, {displayName.split(" ")[0]}?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{displayName}</p>
            <Select
              value={postType}
              onValueChange={(v) => setPostType(v as FeedPostType)}
            >
              <SelectTrigger className="h-7 w-auto text-xs gap-1 border-0 bg-muted/50 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="win">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Win
                  </span>
                </SelectItem>
                {canPostAnnouncement && (
                  <>
                    <SelectItem value="announcement">
                      <span className="flex items-center gap-1.5">
                        <Megaphone className="h-3.5 w-3.5 text-blue-500" /> Announcement
                      </span>
                    </SelectItem>
                    <SelectItem value="update">
                      <span className="flex items-center gap-1.5">
                        <Newspaper className="h-3.5 w-3.5 text-green-500" /> Update
                      </span>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setExpanded(false);
              setContent("");
              clearImage();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`What's on your mind, ${displayName.split(" ")[0]}?`}
          className="min-h-[100px] border-0 bg-transparent resize-none focus-visible:ring-0 text-base p-0 placeholder:text-muted-foreground/60"
          autoFocus
        />

        {imagePreview && (
          <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-64 w-full object-cover"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80"
              onClick={clearImage}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4 text-green-500" />
            <span className="text-xs">Photo</span>
          </Button>
        </div>

        <Button
          size="sm"
          disabled={!content.trim() || isSubmitting}
          onClick={handleSubmit}
          className="gap-1.5 rounded-full px-5"
        >
          <Send className="h-3.5 w-3.5" />
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
