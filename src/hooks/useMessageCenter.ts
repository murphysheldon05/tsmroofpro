import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type FeedPostType = Database["public"]["Enums"]["feed_post_type"];
type ReactionEmoji = Database["public"]["Enums"]["feed_reaction_emoji"];

export interface FeedAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  job_title: string | null;
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: FeedAuthor;
}

export interface FeedReaction {
  post_id: string;
  user_id: string;
  emoji: ReactionEmoji;
  created_at: string;
}

export interface FeedPost {
  id: string;
  author_id: string;
  post_type: FeedPostType;
  content: string;
  image_url: string | null;
  created_at: string;
  author: FeedAuthor;
  comments: FeedComment[];
  reactions: FeedReaction[];
}

// ── Feed posts ──────────────────────────────────────────────────

export function useFeedPosts() {
  return useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("feed_posts")
        .select(
          `
          *,
          author:profiles!feed_posts_author_id_fkey(id, full_name, avatar_url, department, job_title),
          comments:feed_comments(
            *,
            author:profiles!feed_comments_author_id_fkey(id, full_name, avatar_url, department, job_title)
          ),
          reactions:feed_reactions(*)
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (posts ?? []) as unknown as FeedPost[];
    },
    refetchInterval: 30_000,
  });
}

// ── Create post ─────────────────────────────────────────────────

export function useCreatePost() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      content,
      post_type = "update" as FeedPostType,
      image_url,
    }: {
      content: string;
      post_type?: FeedPostType;
      image_url?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("feed_posts")
        .insert({
          author_id: user.id,
          content,
          post_type,
          image_url: image_url ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

// ── Delete post ─────────────────────────────────────────────────

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("feed_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

// ── Comments ────────────────────────────────────────────────────

export function useCreateComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      post_id,
      content,
    }: {
      post_id: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("feed_comments")
        .insert({ post_id, author_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("feed_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

// ── Reactions ───────────────────────────────────────────────────

export function useToggleReaction() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      post_id,
      emoji,
    }: {
      post_id: string;
      emoji: ReactionEmoji;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("feed_reactions")
        .select("*")
        .eq("post_id", post_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.emoji === emoji) {
          const { error } = await supabase
            .from("feed_reactions")
            .delete()
            .eq("post_id", post_id)
            .eq("user_id", user.id);
          if (error) throw error;
          return null;
        }
        const { error } = await supabase
          .from("feed_reactions")
          .delete()
          .eq("post_id", post_id)
          .eq("user_id", user.id);
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from("feed_reactions")
        .insert({ post_id, user_id: user.id, emoji })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

// ── Last visit (badge tracking) ─────────────────────────────────

export function useMarkVisited() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("message_center_last_visit")
        .upsert(
          { user_id: user.id, last_visited_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
  });
}

// ── Image upload ────────────────────────────────────────────────

export function useUploadFeedImage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("feed-images")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("feed-images").getPublicUrl(path);
      return publicUrl;
    },
  });
}
