import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { useFeedPosts } from "@/hooks/useFeed";
import { useRecordMessageCenterVisit } from "@/hooks/useFeed";
import { MessageCircle, Loader2 } from "lucide-react";

export default function MessageCenter() {
  const { data: posts = [], isLoading } = useFeedPosts();
  const recordVisit = useRecordMessageCenterVisit();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("post");
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    recordVisit.mutate();
  }, []);

  useEffect(() => {
    if (!postId) return;
    const el = postRefs.current[postId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [postId, posts.length]);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0 pb-8">
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Message Center</h1>
              <p className="text-sm text-muted-foreground">Company feed — wins, announcements, and updates</p>
            </div>
          </div>
        </header>

        <FeedComposer />

        <section>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No posts yet</p>
              <p className="text-sm mt-1">Share a win, or post an announcement or update above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  ref={(el) => { postRefs.current[post.id] = el; }}
                  className={postId === post.id ? "ring-2 ring-primary/30 rounded-xl" : undefined}
                >
                  <FeedPostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
