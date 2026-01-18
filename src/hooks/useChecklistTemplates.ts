import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ChecklistTemplate = Database["public"]["Tables"]["checklist_templates"]["Row"];
type ChecklistTemplateInsert = Database["public"]["Tables"]["checklist_templates"]["Insert"];
type ChecklistTemplateUpdate = Database["public"]["Tables"]["checklist_templates"]["Update"];

export function useChecklistTemplates(type?: "onboarding" | "offboarding") {
  return useQuery({
    queryKey: ["checklist-templates", type],
    queryFn: async () => {
      let query = supabase
        .from("checklist_templates")
        .select(`
          *,
          applications(app_name)
        `)
        .eq("is_active", true)
        .order("title");

      if (type) {
        query = query.eq("template_type", type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: ChecklistTemplateInsert) => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ChecklistTemplateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
      toast.success("Template updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}
