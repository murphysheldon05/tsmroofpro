import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrainingDocumentCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingDocument {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  category?: TrainingDocumentCategory;
  uploader_name?: string;
}

export function useTrainingDocumentCategories() {
  return useQuery({
    queryKey: ["training-document-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_document_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as TrainingDocumentCategory[];
    },
  });
}

export function useTrainingDocuments(categoryId?: string) {
  return useQuery({
    queryKey: ["training-documents", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("training_documents")
        .select("*, training_document_categories(*)")
        .order("created_at", { ascending: false });

      if (categoryId && categoryId !== "all") {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch uploader names
      const uploaderIds = [...new Set((data || []).map(d => d.uploaded_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", uploaderIds);
        profiles?.forEach(p => { profileMap[p.id] = p.full_name || "Unknown"; });
      }

      return (data || []).map(d => ({
        ...d,
        category: d.training_document_categories as TrainingDocumentCategory | undefined,
        uploader_name: d.uploaded_by ? profileMap[d.uploaded_by] || "Unknown" : "Unknown",
      })) as TrainingDocument[];
    },
  });
}

export function useUploadTrainingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      name,
      description,
      categoryId,
    }: {
      file: File;
      name: string;
      description?: string;
      categoryId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("training-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("training_documents")
        .insert({
          name,
          description: description || null,
          category_id: categoryId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || null,
          file_size: file.size,
          uploaded_by: user.id,
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (e: Error) => {
      toast.error("Upload failed: " + e.message);
    },
  });
}

export function useUpdateTrainingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      categoryId,
    }: {
      id: string;
      name: string;
      description?: string;
      categoryId: string;
    }) => {
      const { error } = await supabase
        .from("training_documents")
        .update({
          name,
          description: description || null,
          category_id: categoryId,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-documents"] });
      toast.success("Document updated");
    },
    onError: (e: Error) => {
      toast.error("Update failed: " + e.message);
    },
  });
}

export function useDeleteTrainingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      // Delete from storage
      await supabase.storage.from("training-documents").remove([filePath]);
      // Delete from DB
      const { error } = await supabase.from("training_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-documents"] });
      toast.success("Document deleted");
    },
    onError: (e: Error) => {
      toast.error("Delete failed: " + e.message);
    },
  });
}

export function useCreateTrainingCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase
        .from("training_document_categories")
        .insert({ name, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-document-categories"] });
      toast.success("Category created");
    },
    onError: (e: Error) => {
      toast.error("Failed: " + e.message);
    },
  });
}

export function useDeleteTrainingCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_document_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-document-categories"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) => {
      toast.error("Failed: " + e.message);
    },
  });
}

export function useDownloadTrainingDocument() {
  return async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("training-documents")
      .download(filePath);
    if (error) {
      toast.error("Download failed: " + error.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
}
