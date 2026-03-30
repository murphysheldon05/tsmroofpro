import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateComment, useDeleteComment } from "@/hooks/useMessageCenter";
import type { FeedComment } from "@/hooks/useMessageCenter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDisplayName } from "@/lib/displayName";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface CommentSectionProps {
  postId: string;
  comments: FeedComment[];
}

export function CommentSection({ postId, comments }: CommentSectionProps) {
  const { user, isAdmin } = useAuth();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);

  const sorted = [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const visibleComments = showAll ? sorted : sorted.slice(-3);
  const hiddenCount = sorted.length - visibleComments.length;

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const displayName = formatDisplayName(fullName, user?.email);
  const initials = getInitials(displayName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await createComment.mutateAsync({ post_id: postId, content: text.trim() });
      setText("");
    } catch {
      toast.error("Failed to add comment");
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment.mutateAsync(commentId);
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  return (
    <div className="bg-muted/20">
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
        >
          View {hiddenCount} more comment{hiddenCount > 1 ? "s" : ""}
        </button>
      )}

      {visibleComments.length > 0 && (
        <div className="px-4 py-2 space-y-2.5">
          {visibleComments.map((comment) => {
            const authorName = formatDisplayName(
              comment.author?.full_name,
              undefined
            );
            const canDelete =
              user?.id === comment.author_id || isAdmin;

            return (
              <div key={comment.id} className="flex gap-2 group">
                <Avatar className="h-7 w-7 mt-0.5 flex-shrink-0">
                  <AvatarImage src={comment.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {getInitials(authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="inline-block bg-muted/60 rounded-2xl px-3 py-1.5 max-w-full">
                    <p className="text-xs font-semibold text-foreground leading-tight">
                      {authorName}
                    </p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 px-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2.5 border-t border-border/50">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            disabled={!text.trim() || createComment.isPending}
          >
            <Send className="h-3.5 w-3.5 text-primary" />
          </Button>
        </div>
      </form>
    </div>
  );
}
