import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteFeedPost,
  useFeedReaction,
  useFeedComments,
  useAddFeedComment,
  useDeleteFeedComment,
  type FeedPost as FeedPostType,
  type FeedReactionEmoji,
} from "@/hooks/useFeed";
import { FeedMentionTextarea, renderFeedMentionText, extractMentionIds } from "@/components/feed/FeedMentionTextarea";
import { formatDistanceToNow } from "date-fns";
import { Trophy, Megaphone, RefreshCw, ThumbsUp, Flame, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const POST_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  win: { label: "Win", icon: Trophy, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  announcement: { label: "Announcement", icon: Megaphone, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  update: { label: "Update", icon: RefreshCw, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "User";
  if (role === "admin") return "Admin";
  if (role === "manager" || role === "sales_manager") return "Manager";
  if (role === "sales_rep") return "Sales Rep";
  return "User";
}

export function FeedPostCard({ post }: { post: FeedPostType }) {
  const { user, isAdmin } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const deletePost = useDeleteFeedPost();
  const react = useFeedReaction();
  const { data: comments = [], isLoading: commentsLoading } = useFeedComments(showComments ? post.id : null);
  const addComment = useAddFeedComment();
  const deleteComment = useDeleteFeedComment();

  const config = POST_TYPE_CONFIG[post.post_type] ?? POST_TYPE_CONFIG.win;
  const canDelete = isAdmin || post.author_id === user?.id;
  const authorName = post.author?.full_name ?? "Unknown";
  const authorInitials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleReaction = (emoji: FeedReactionEmoji) => {
    if (!user) return;
    const toggled = post.user_reaction === emoji;
    react.mutate(
      { postId: post.id, emoji },
      { onError: (e) => toast.error(e.message) }
    );
  };

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addComment.mutate(
      {
        postId: post.id,
        content: trimmed,
        mentioned_user_ids: extractMentionIds(commentText),
      },
      {
        onSuccess: () => setCommentText(""),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDeletePost = () => {
    if (!canDelete) return;
    if (!confirm("Delete this post?")) return;
    deletePost.mutate(post.id, { onError: (e) => toast.error(e.message) });
  };

  return (
    <article className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 border border-border">
            <AvatarImage src={post.author?.avatar_url ?? undefined} alt={authorName} />
            <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-semibold text-foreground">{authorName}</span>
              <span className="text-xs text-muted-foreground">
                {getRoleLabel(post.author_role)}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                  config.className
                )}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
            <div className="mt-2 text-sm whitespace-pre-wrap break-words">
              {renderFeedMentionText(post.content)}
            </div>
            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post attachment"
                className="mt-3 rounded-lg max-h-80 w-full object-cover"
              />
            )}
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleDeletePost}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1", post.user_reaction === "thumbs_up" && "text-primary")}
              onClick={() => handleReaction("thumbs_up")}
              disabled={react.isPending}
            >
              <ThumbsUp className="w-4 h-4" />
              {post.reaction_counts?.thumbs_up ? (
                <span className="text-xs">{post.reaction_counts.thumbs_up}</span>
              ) : null}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1", post.user_reaction === "fire" && "text-orange-500")}
              onClick={() => handleReaction("fire")}
              disabled={react.isPending}
            >
              <Flame className="w-4 h-4" />
              {post.reaction_counts?.fire ? (
                <span className="text-xs">{post.reaction_counts.fire}</span>
              ) : null}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{post.comments_count ?? 0}</span> Comments
          </Button>
        </div>
      </div>

      {showComments && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-3">
          <div className="space-y-2">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments…</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={c.author?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(c.author?.full_name ?? "?")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {c.author?.full_name ?? "Unknown"} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                    <p className="text-sm">{renderFeedMentionText(c.content)}</p>
                  </div>
                  {(user?.id === c.author_id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this comment?"))
                          deleteComment.mutate({ commentId: c.id, postId: post.id });
                      }}
                      disabled={deleteComment.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <FeedMentionTextarea
                value={commentText}
                onChange={setCommentText}
                onMentionedUserIds={() => {}}
                placeholder="Write a comment... @ to mention"
                rows={2}
                className="min-h-[60px]"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!commentText.trim() || addComment.isPending}
            >
              {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Comment"}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
