import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleReaction, useDeletePost } from "@/hooks/useMessageCenter";
import type { FeedPost as FeedPostData } from "@/hooks/useMessageCenter";
import { CommentSection } from "./CommentSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ThumbsUp,
  Flame,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Trophy,
  Megaphone,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import { formatDisplayName } from "@/lib/displayName";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ReactionEmoji = Database["public"]["Enums"]["feed_reaction_emoji"];

const POST_TYPE_BADGE: Record<
  string,
  { label: string; icon: typeof Trophy; bg: string; text: string }
> = {
  win: {
    label: "Win",
    icon: Trophy,
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  update: {
    label: "Update",
    icon: Newspaper,
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface FeedPostProps {
  post: FeedPostData;
}

export function FeedPost({ post }: FeedPostProps) {
  const { user, isAdmin } = useAuth();
  const toggleReaction = useToggleReaction();
  const deletePost = useDeletePost();
  const [showComments, setShowComments] = useState(false);

  const authorName = formatDisplayName(post.author?.full_name, undefined);
  const initials = getInitials(authorName);
  const badge = POST_TYPE_BADGE[post.post_type];
  const BadgeIcon = badge?.icon;

  const canDelete = user?.id === post.author_id || isAdmin;

  const thumbsCount = post.reactions.filter((r) => r.emoji === "thumbs_up").length;
  const fireCount = post.reactions.filter((r) => r.emoji === "fire").length;
  const totalReactions = thumbsCount + fireCount;
  const commentCount = post.comments.length;

  const userReaction = post.reactions.find((r) => r.user_id === user?.id);

  async function handleReaction(emoji: ReactionEmoji) {
    try {
      await toggleReaction.mutateAsync({ post_id: post.id, emoji });
    } catch {
      toast.error("Failed to react");
    }
  }

  async function handleDelete() {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{authorName}</span>
            {badge && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                  badge.bg,
                  badge.text
                )}
              >
                <BadgeIcon className="h-3 w-3" />
                {badge.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {post.author?.job_title && (
              <>
                <span>{post.author.job_title}</span>
                <span>·</span>
              </>
            )}
            <span>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="px-4 pb-2">
          <img
            src={post.image_url}
            alt="Post attachment"
            className="w-full rounded-lg object-cover max-h-96 border border-border/50"
          />
        </div>
      )}

      {/* Reaction / Comment counts */}
      {(totalReactions > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {thumbsCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                  👍
                </span>
              </span>
            )}
            {fireCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                  🔥
                </span>
              </span>
            )}
            {totalReactions > 0 && <span className="ml-1">{totalReactions}</span>}
          </div>
          {commentCount > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {commentCount} comment{commentCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center border-t border-border mx-4">
        <button
          onClick={() => handleReaction("thumbs_up")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60 rounded-md",
            userReaction?.emoji === "thumbs_up"
              ? "text-blue-500"
              : "text-muted-foreground"
          )}
        >
          <ThumbsUp
            className={cn(
              "h-4 w-4",
              userReaction?.emoji === "thumbs_up" && "fill-current"
            )}
          />
          Like
        </button>

        <button
          onClick={() => handleReaction("fire")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60 rounded-md",
            userReaction?.emoji === "fire"
              ? "text-orange-500"
              : "text-muted-foreground"
          )}
        >
          <Flame
            className={cn(
              "h-4 w-4",
              userReaction?.emoji === "fire" && "fill-current"
            )}
          />
          Fire
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 rounded-md"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection postId={post.id} comments={post.comments} />
      )}
    </div>
  );
}
