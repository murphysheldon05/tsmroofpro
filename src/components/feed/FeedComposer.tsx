import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FeedMentionTextarea, extractMentionIds } from "./FeedMentionTextarea";
import { useCreateFeedPost } from "@/hooks/useFeed";
import { useAuth } from "@/contexts/AuthContext";
import type { FeedPostType } from "@/hooks/useFeed";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Megaphone, RefreshCw, ImagePlus, Loader2 } from "lucide-react";

const POST_TYPES: { value: FeedPostType; label: string; icon: React.ElementType; adminOrManagerOnly?: boolean }[] = [
  { value: "win", label: "Win", icon: Trophy },
  { value: "announcement", label: "Announcement", icon: Megaphone, adminOrManagerOnly: true },
  { value: "update", label: "Update", icon: RefreshCw, adminOrManagerOnly: true },
];

export function FeedComposer() {
  const { user, isManager } = useAuth();
  const [postType, setPostType] = useState<FeedPostType>("win");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const createPost = useCreateFeedPost();

  const canPostType = (t: typeof POST_TYPES[0]) => !t.adminOrManagerOnly || isManager;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const onSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Enter some content");
      return;
    }
    if (POST_TYPES.find((t) => t.value === postType)?.adminOrManagerOnly && !isManager) {
      toast.error("Only admins and managers can post announcements or updates.");
      return;
    }

    let imageUrl: string | null = null;
    if (imageFile && user) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("message-center-images").upload(path, imageFile, { upsert: true });
      if (upErr) {
        toast.error("Failed to upload image");
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("message-center-images").getPublicUrl(path);
      imageUrl = publicUrl;
    }

    createPost.mutate(
      {
        post_type: postType,
        content: trimmed,
        image_url: imageUrl,
        mentioned_user_ids: extractMentionIds(content),
      },
      {
        onSuccess: () => {
          setContent("");
          clearImage();
          toast.success("Post shared");
        },
        onError: (err: Error) => toast.error(err.message || "Failed to post"),
      }
    );
  }, [content, postType, imageFile, user, createPost, isManager]);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {POST_TYPES.filter(canPostType).map((t) => (
          <Button
            key={t.value}
            type="button"
            variant={postType === t.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPostType(t.value)}
          >
            <t.icon className="w-3.5 h-3.5 mr-1.5" />
            {t.label}
          </Button>
        ))}
      </div>
      <FeedMentionTextarea
        value={content}
        onChange={setContent}
        onMentionedUserIds={() => {}}
        placeholder="Share a win, announcement, or update... Use @ to mention someone"
        rows={3}
      />
      {imagePreview && (
        <div className="relative inline-block">
          <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border object-cover" />
          <Button type="button" variant="secondary" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={clearImage}>
            ×
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          <span className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ImagePlus className="w-4 h-4" /> Add image
          </span>
        </label>
        <Button onClick={onSubmit} disabled={createPost.isPending || !content.trim()}>
          {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
        </Button>
      </div>
    </div>
  );
}
