import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CommissionComment {
  id: string;
  commission_id: string;
  user_id: string;
  comment_text: string;
  comment_type: "rejection_note" | "reply" | "revision_note";
  is_read: boolean;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export function useCommissionComments(commissionId: string | undefined) {
  return useQuery({
    queryKey: ["commission-comments", commissionId],
    queryFn: async () => {
      if (!commissionId) return [];

      const { data, error } = await (supabase.from as any)("commission_comments")
        .select("*")
        .eq("commission_id", commissionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map((c: any) => c.user_id).filter(Boolean))];
      let profileMap: Record<string, { name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds as string[]);
        profileMap = (profiles || []).reduce(
          (acc: Record<string, { name: string; email: string }>, p: any) => {
            acc[p.id] = { name: p.full_name || p.email || "Unknown", email: p.email || "" };
            return acc;
          },
          {}
        );
      }

      return (data || []).map((comment: any) => ({
        ...comment,
        user_name: comment.user_id ? profileMap[comment.user_id]?.name || "Unknown" : "System",
        user_email: comment.user_id ? profileMap[comment.user_id]?.email || "" : "",
      })) as CommissionComment[];
    },
    enabled: !!commissionId,
  });
}

export function useAddCommissionComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      commissionId,
      commentText,
      commentType = "reply",
    }: {
      commissionId: string;
      commentText: string;
      commentType?: "rejection_note" | "reply" | "revision_note";
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase.from as any)("commission_comments")
        .insert({
          commission_id: commissionId,
          user_id: user.id,
          comment_text: commentText,
          comment_type: commentType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-comments", variables.commissionId] });
      queryClient.invalidateQueries({ queryKey: ["unread-commission-comments"] });
    },
  });
}

export function useMarkCommissionCommentsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (commissionId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase.from as any)("commission_comments")
        .update({ is_read: true })
        .eq("commission_id", commissionId)
        .eq("is_read", false)
        .neq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, commissionId) => {
      queryClient.invalidateQueries({ queryKey: ["commission-comments", commissionId] });
      queryClient.invalidateQueries({ queryKey: ["unread-commission-comments"] });
    },
  });
}

export function useUnreadCommissionCommentCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-commission-comments", user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data, error } = await (supabase.from as any)("commission_comments")
        .select("commission_id")
        .eq("is_read", false)
        .neq("user_id", user.id);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.commission_id] = (counts[row.commission_id] || 0) + 1;
      }
      return counts;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
