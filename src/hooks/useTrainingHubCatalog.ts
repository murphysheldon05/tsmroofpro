import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import staticCatalog from "@/data/training-videos.json";
import { buildLoomEmbedUrl, buildLoomShareUrl, extractLoomVideoId } from "@/lib/loomUrls";

export type TrainingHubVideo = {
  id: string;
  title: string;
  shareUrl: string;
  embedUrl: string;
  kind: "catalog" | "custom";
};

export type TrainingHubCategory = {
  name: string;
  slug: string;
  description: string;
  videos: TrainingHubVideo[];
};

const STATIC = staticCatalog as {
  categories: Array<{
    name: string;
    slug: string;
    description: string;
    videoCount: number;
    videos: Array<{ id: string; title: string; shareUrl: string; embedUrl: string }>;
  }>;
};

const QUERY_KEYS = {
  suppressions: ["training-hub-suppressions"] as const,
  custom: ["training-hub-custom-videos"] as const,
};

async function fetchSuppressions(): Promise<Set<string>> {
  const { data, error } = await supabase.from("training_hub_suppressions").select("loom_video_id");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.loom_video_id.replace(/-/g, "")));
}

async function fetchCustomVideos() {
  const { data, error } = await supabase
    .from("training_hub_custom_videos")
    .select("id, category_slug, loom_video_id, title, share_url, embed_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useTrainingHubCatalog() {
  const queryClient = useQueryClient();

  const suppressionsQuery = useQuery({
    queryKey: QUERY_KEYS.suppressions,
    queryFn: fetchSuppressions,
    staleTime: 60_000,
  });

  const customQuery = useQuery({
    queryKey: QUERY_KEYS.custom,
    queryFn: fetchCustomVideos,
    staleTime: 60_000,
  });

  const categories = useMemo((): TrainingHubCategory[] => {
    const suppressed = suppressionsQuery.isError
      ? new Set<string>()
      : suppressionsQuery.data ?? new Set<string>();
    const customRows = customQuery.isError ? [] : customQuery.data ?? [];

    return STATIC.categories.map((cat) => {
      const baseVideos = cat.videos
        .filter((v) => !suppressed.has(v.id.replace(/-/g, "")))
        .map(
          (v): TrainingHubVideo => ({
            id: v.id.replace(/-/g, ""),
            title: v.title,
            shareUrl: v.shareUrl,
            embedUrl: v.embedUrl,
            kind: "catalog",
          })
        );

      const extras = customRows
        .filter((row) => row.category_slug === cat.slug)
        .map(
          (row): TrainingHubVideo => ({
            id: row.id,
            title: row.title,
            shareUrl: row.share_url,
            embedUrl: row.embed_url,
            kind: "custom",
          })
        );

      return {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        videos: [...baseVideos, ...extras],
      };
    });
  }, [
    suppressionsQuery.data,
    suppressionsQuery.isError,
    customQuery.data,
    customQuery.isError,
  ]);

  const suppressedCatalogEntries = useMemo(() => {
    if (!suppressionsQuery.isSuccess || !suppressionsQuery.data?.size) return [];
    const suppressed = suppressionsQuery.data;
    const out: { loomVideoId: string; title: string; categoryLabel: string }[] = [];
    for (const cat of STATIC.categories) {
      for (const v of cat.videos) {
        const nid = v.id.replace(/-/g, "");
        if (suppressed.has(nid)) {
          out.push({ loomVideoId: nid, title: v.title, categoryLabel: cat.name });
        }
      }
    }
    return out.sort((a, b) => a.title.localeCompare(b.title));
  }, [suppressionsQuery.isSuccess, suppressionsQuery.data]);

  const totalVideos = useMemo(
    () => categories.reduce((sum, c) => sum + c.videos.length, 0),
    [categories]
  );

  const suppressMutation = useMutation({
    mutationFn: async (loomVideoId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      const { error } = await supabase.from("training_hub_suppressions").insert({
        loom_video_id: loomVideoId.replace(/-/g, ""),
        created_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppressions });
    },
  });

  const unsuppressMutation = useMutation({
    mutationFn: async (loomVideoId: string) => {
      const { error } = await supabase
        .from("training_hub_suppressions")
        .delete()
        .eq("loom_video_id", loomVideoId.replace(/-/g, ""));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppressions });
    },
  });

  const addCustomMutation = useMutation({
    mutationFn: async (input: { categorySlug: string; loomUrlOrId: string; title: string }) => {
      const parsed = extractLoomVideoId(input.loomUrlOrId) ?? extractLoomVideoId(`https://www.loom.com/embed/${input.loomUrlOrId.trim()}`);
      if (!parsed) throw new Error("Could not read a Loom link. Paste a full share or embed URL.");

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;

      const { error } = await supabase.from("training_hub_custom_videos").insert({
        category_slug: input.categorySlug,
        loom_video_id: parsed,
        title: input.title.trim(),
        share_url: buildLoomShareUrl(parsed),
        embed_url: buildLoomEmbedUrl(parsed),
        created_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.custom });
    },
  });

  const deleteCustomMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_hub_custom_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.custom });
    },
  });

  const removeVideo = async (video: TrainingHubVideo) => {
    if (video.kind === "custom") {
      await deleteCustomMutation.mutateAsync(video.id);
      return;
    }
    await suppressMutation.mutateAsync(video.id);
  };

  const restoreCatalogVideo = async (loomVideoId: string) => {
    await unsuppressMutation.mutateAsync(loomVideoId);
  };

  return {
    categories,
    totalVideos,
    suppressedCatalogEntries,
    isLoading: suppressionsQuery.isLoading || customQuery.isLoading,
    isError: suppressionsQuery.isError || customQuery.isError,
    refetch: () => {
      void suppressionsQuery.refetch();
      void customQuery.refetch();
    },
    removeVideo,
    restoreCatalogVideo,
    addCustomVideo: (input: { categorySlug: string; loomUrlOrId: string; title: string }) =>
      addCustomMutation.mutateAsync(input),
    isMutating:
      suppressMutation.isPending ||
      unsuppressMutation.isPending ||
      addCustomMutation.isPending ||
      deleteCustomMutation.isPending,
  };
}
