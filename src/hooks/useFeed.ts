import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/hooks/useNotifications";

export type FeedPostType = "win" | "announcement" | "update";
export type FeedReactionEmoji = "thumbs_up" | "fire";

export interface FeedPost {
  id: string;
  author_id: string;
  post_type: FeedPostType;
  content: string;
  image_url: string | null;
  created_at: string;
  author?: { id: string; full_name: string | null; avatar_url: string | null };
  author_role?: string;
  reaction_counts?: { thumbs_up: number; fire: number };
  user_reaction?: FeedReactionEmoji | null;
  comments_count?: number;
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { id: string; full_name: string | null; avatar_url: string | null };
}

/** Fetch all feed posts (newest first) with author and reaction counts */
export function useFeedPosts() {
  return useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("feed_posts")
        .select(`
          id,
          author_id,
          post_type,
          content,
          image_url,
          created_at
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!posts?.length) return [];

      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", authorIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role]));

      const postIds = posts.map((p) => p.id);
      const { data: reactions } = await supabase
        .from("feed_reactions")
        .select("post_id, user_id, emoji")
        .in("post_id", postIds);
      const { data: commentsCount } = await supabase
        .from("feed_comments")
        .select("post_id")
        .in("post_id", postIds);

      const { data: { user } } = await supabase.auth.getUser();
      const reactionCounts = new Map<string, { thumbs_up: number; fire: number }>();
      const userReactions = new Map<string, FeedReactionEmoji>();
      (reactions || []).forEach((r) => {
        const key = r.post_id;
        if (!reactionCounts.has(key)) reactionCounts.set(key, { thumbs_up: 0, fire: 0 });
        reactionCounts.get(key)![r.emoji as FeedReactionEmoji]++;
        if (user && r.user_id === user.id) userReactions.set(key, r.emoji as FeedReactionEmoji);
      });
      const commentCountByPost = new Map<string, number>();
      (commentsCount || []).forEach((c) => {
        commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
      });

      return posts.map((p) => ({
        ...p,
        author: profileMap.get(p.author_id),
        author_role: roleMap.get(p.author_id) ?? null,
        reaction_counts: reactionCounts.get(p.id) ?? { thumbs_up: 0, fire: 0 },
        user_reaction: userReactions.get(p.id) ?? null,
        comments_count: commentCountByPost.get(p.id) ?? 0,
      })) as FeedPost[];
    },
  });
}

/** Fetch comments for a post */
export function useFeedComments(postId: string | null) {
  return useQuery({
    queryKey: ["feed-comments", postId],
    queryFn: async () => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from("feed_comments")
        .select("id, post_id, author_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data?.length) return [];

      const authorIds = [...new Set(data.map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      return data.map((c) => ({
        ...c,
        author: profileMap.get(c.author_id),
      })) as FeedComment[];
    },
    enabled: !!postId,
  });
}

/** Create a feed post */
export function useCreateFeedPost() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      post_type: FeedPostType;
      content: string;
      image_url?: string | null;
      mentioned_user_ids?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("feed_posts")
        .insert({
          author_id: user.id,
          post_type: payload.post_type,
          content: payload.content,
          image_url: payload.image_url ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Notify tagged users
      const postId = data.id;
      for (const userId of payload.mentioned_user_ids ?? []) {
        if (userId === user.id) continue;
        await createNotification(userId, {
          notification_type: "feed_mention",
          title: "You were mentioned in Message Center",
          message: payload.content.slice(0, 100) + (payload.content.length > 100 ? "…" : ""),
          entity_type: "feed_post",
          entity_id: postId,
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

/** Delete a feed post (author or admin) */
export function useDeleteFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("feed_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

/** Add or toggle reaction */
export function useFeedReaction() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      emoji,
    }: { postId: string; emoji: FeedReactionEmoji }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("feed_reactions")
        .select("emoji")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.emoji === emoji) {
        await supabase.from("feed_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
        return { removed: true };
      }
      await supabase.from("feed_reactions").upsert(
        { post_id: postId, user_id: user.id, emoji },
        { onConflict: "post_id,user_id" }
      );
      return { removed: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

/** Add comment (with @mention notifications) */
export function useAddFeedComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      mentioned_user_ids = [],
    }: { postId: string; content: string; mentioned_user_ids?: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("feed_comments")
        .insert({ post_id: postId, author_id: user.id, content })
        .select("id")
        .single();
      if (error) throw error;

      for (const userId of mentioned_user_ids) {
        if (userId === user.id) continue;
        await createNotification(userId, {
          notification_type: "feed_comment_mention",
          title: "You were mentioned in a Message Center comment",
          message: content.slice(0, 100) + (content.length > 100 ? "…" : ""),
          entity_type: "feed_post",
          entity_id: postId,
        });
      }
      return data;
    },
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["feed-comments", postId] });
    },
  });
}

/** Delete own comment */
export function useDeleteFeedComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from("feed_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["feed-comments", postId] });
    },
  });
}

/** Record Message Center visit to clear announcement/update badge */
export function useRecordMessageCenterVisit() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("message_center_last_visit")
        .upsert({ user_id: user.id, last_visited_at: new Date().toISOString() }, { onConflict: "user_id" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["message-center-badge-count"] });
    },
  });
}
