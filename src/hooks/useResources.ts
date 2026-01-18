import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  body: string | null;
  category_id: string | null;
  tags: string[];
  owner_id: string | null;
  url: string | null;
  file_path: string | null;
  version: string;
  effective_date: string | null;
  visibility: "admin" | "manager" | "employee";
  view_count: number;
  created_at: string;
  updated_at: string;
  // New SOP metadata fields
  task_type: string | null;
  role_target: string[] | null;
  urgency: string | null;
  owner_role: string | null;
  last_updated_by: string | null;
  purpose: string | null;
  when_to_use: string | null;
  common_mistakes: string[] | null;
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  parent_id: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useResources(categorySlug?: string) {
  return useQuery({
    queryKey: ["resources", categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("resources")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .order("updated_at", { ascending: false });

      if (categorySlug) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function useRecentResources(limit = 5) {
  return useQuery({
    queryKey: ["resources", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .order("updated_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function usePopularResources(limit = 5) {
  return useQuery({
    queryKey: ["resources", "popular", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .order("view_count", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Resource[];
    },
  });
}

export function useSearchResources(query: string) {
  return useQuery({
    queryKey: ["resources", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,purpose.ilike.%${query}%,body.ilike.%${query}%`)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data as Resource[];
    },
    enabled: query.length > 0,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resource: Omit<Resource, "id" | "created_at" | "updated_at" | "view_count" | "categories" | "task_type" | "role_target" | "urgency" | "owner_role" | "last_updated_by" | "purpose" | "when_to_use" | "common_mistakes"> & {
      task_type?: string | null;
      role_target?: string[] | null;
      urgency?: string | null;
      owner_role?: string | null;
      last_updated_by?: string | null;
      purpose?: string | null;
      when_to_use?: string | null;
      common_mistakes?: string[] | null;
    }) => {
      const { data, error } = await supabase
        .from("resources")
        .insert(resource)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create resource: " + error.message);
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...resource }: Partial<Resource> & { id: string }) => {
      const { data, error } = await supabase
        .from("resources")
        .update(resource)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update resource: " + error.message);
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete resource: " + error.message);
    },
  });
}

export function useIncrementViewCount() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await supabase.from("resources").select("view_count").eq("id", id).single();
      if (data) {
        await supabase.from("resources").update({ view_count: (data.view_count || 0) + 1 }).eq("id", id);
      }
    },
  });
}
