import { useEffect, useMemo } from "react";
import { useFeedPosts, useMarkVisited } from "@/hooks/useMessageCenter";
import { CreatePostForm } from "./CreatePostForm";
import { FeedPost } from "./FeedPost";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Radio, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

export function MessageBoard() {
  const { data: posts, isLoading, error } = useFeedPosts();
  const markVisited = useMarkVisited();
  const location = useLocation();
  const highlightedPostId = useMemo(() => {
    if (!location.hash.startsWith("#feed-post-")) return null;
    return location.hash.replace("#feed-post-", "");
  }, [location.hash]);

  useEffect(() => {
    markVisited.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!highlightedPostId || !posts?.length) return;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(`feed-post-${highlightedPostId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [highlightedPostId, posts]);

  if (error) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Unable to load the feed. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Radio className="h-3.5 w-3.5" />
              Live team updates
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-extrabold text-foreground">Team Feed</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Celebrate wins, share updates, and keep everyone in sync from one place.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {posts?.length ? `${posts.length} recent post${posts.length === 1 ? "" : "s"}` : "Start the conversation"}
        </div>
      </div>

      <CreatePostForm />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              isHighlighted={highlightedPostId === post.id}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-primary/25 bg-card/90 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No posts yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Be the first to share a win, announcement, or update with the team!
          </p>
        </div>
      )}
    </section>
  );
}
