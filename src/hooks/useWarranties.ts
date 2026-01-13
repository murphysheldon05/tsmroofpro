import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RoofType = "shingle" | "tile" | "foam" | "coating" | "other";
export type WarrantyType = "workmanship" | "manufacturer" | "combination";
export type SourceOfRequest = "homeowner" | "office" | "sales" | "manufacturer";
export type PriorityLevel = "low" | "medium" | "high" | "emergency";
export type WarrantyStatus = 
  | "new" 
  | "assigned" 
  | "in_review" 
  | "scheduled" 
  | "in_progress" 
  | "waiting_on_materials" 
  | "waiting_on_manufacturer" 
  | "completed" 
  | "denied";

export interface WarrantyRequest {
  id: string;
  customer_name: string;
  job_address: string;
  original_job_number: string;
  original_install_date: string;
  roof_type: RoofType;
  warranty_type: WarrantyType;
  warranty_coverage_description: string;
  warranty_expiration_date: string;
  manufacturer: string | null;
  date_submitted: string;
  issue_description: string;
  source_of_request: SourceOfRequest;
  assigned_production_member: string | null;
  secondary_support: string | null;
  date_assigned: string | null;
  priority_level: PriorityLevel;
  status: WarrantyStatus;
  last_status_change_at: string;
  resolution_summary: string | null;
  date_completed: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  is_manufacturer_claim_filed: boolean;
  closeout_photos_uploaded: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarrantyNote {
  id: string;
  warranty_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
  profile?: { full_name: string | null };
}

export interface WarrantyDocument {
  id: string;
  warranty_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  document_type: "intake_photo" | "closeout_photo" | "document";
  uploaded_by: string | null;
  created_at: string;
}

export const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "shingle", label: "Shingle" },
  { value: "tile", label: "Tile" },
  { value: "foam", label: "Foam" },
  { value: "coating", label: "Coating" },
  { value: "other", label: "Other" },
];

export const WARRANTY_TYPES: { value: WarrantyType; label: string }[] = [
  { value: "workmanship", label: "Workmanship" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "combination", label: "Combination" },
];

export const SOURCE_OPTIONS: { value: SourceOfRequest; label: string }[] = [
  { value: "homeowner", label: "Homeowner" },
  { value: "office", label: "Office" },
  { value: "sales", label: "Sales" },
  { value: "manufacturer", label: "Manufacturer" },
];

export const PRIORITY_LEVELS: { value: PriorityLevel; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "emergency", label: "Emergency", color: "bg-red-100 text-red-800" },
];

export const WARRANTY_STATUSES: { value: WarrantyStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "assigned", label: "Assigned", color: "bg-purple-100 text-purple-800" },
  { value: "in_review", label: "In Review", color: "bg-indigo-100 text-indigo-800" },
  { value: "scheduled", label: "Scheduled", color: "bg-cyan-100 text-cyan-800" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-800" },
  { value: "waiting_on_materials", label: "Waiting on Materials", color: "bg-orange-100 text-orange-800" },
  { value: "waiting_on_manufacturer", label: "Waiting on Manufacturer", color: "bg-pink-100 text-pink-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "denied", label: "Denied / Not Covered", color: "bg-red-100 text-red-800" },
];

export function useWarranties() {
  return useQuery({
    queryKey: ["warranties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranty_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WarrantyRequest[];
    },
  });
}

export function useWarranty(id: string | undefined) {
  return useQuery({
    queryKey: ["warranties", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("warranty_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as WarrantyRequest;
    },
    enabled: !!id,
  });
}

export function useCreateWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warranty: Omit<WarrantyRequest, "id" | "created_at" | "updated_at" | "last_status_change_at">) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("warranty_requests")
        .insert({
          ...warranty,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification for new warranty
      try {
        await supabase.functions.invoke("send-warranty-notification", {
          body: {
            notification_type: "submitted",
            warranty_id: data.id,
            customer_name: data.customer_name,
            job_address: data.job_address,
            issue_description: data.issue_description,
            priority_level: data.priority_level,
            status: data.status,
          },
        });
      } catch (notifyError) {
        console.error("Failed to send warranty notification:", notifyError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast.success("Warranty request created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create warranty request: " + error.message);
    },
  });
}

export function useUpdateWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, previousStatus, ...updates }: Partial<WarrantyRequest> & { id: string; previousStatus?: string }) => {
      const { data, error } = await supabase
        .from("warranty_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Send notification for status changes
      if (updates.status && previousStatus && updates.status !== previousStatus) {
        try {
          let notificationType: "status_change" | "assigned" | "completed" = "status_change";
          if (updates.status === "assigned") notificationType = "assigned";
          if (updates.status === "completed") notificationType = "completed";

          await supabase.functions.invoke("send-warranty-notification", {
            body: {
              notification_type: notificationType,
              warranty_id: data.id,
              customer_name: data.customer_name,
              job_address: data.job_address,
              issue_description: data.issue_description,
              priority_level: data.priority_level,
              status: data.status,
              previous_status: previousStatus,
              assigned_to: data.assigned_production_member,
            },
          });
        } catch (notifyError) {
          console.error("Failed to send warranty status notification:", notifyError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast.success("Warranty request updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update warranty request: " + error.message);
    },
  });
}

export function useDeleteWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warranty_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      toast.success("Warranty request deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete warranty request: " + error.message);
    },
  });
}

// Notes
export function useWarrantyNotes(warrantyId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-notes", warrantyId],
    queryFn: async () => {
      if (!warrantyId) return [];
      const { data, error } = await supabase
        .from("warranty_notes")
        .select("*")
        .eq("warranty_id", warrantyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Omit<WarrantyNote, 'profile'>[];
    },
    enabled: !!warrantyId,
  });
}

export function useCreateWarrantyNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warranty_id, note }: { warranty_id: string; note: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("warranty_notes")
        .insert({
          warranty_id,
          note,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["warranty-notes", variables.warranty_id] });
      toast.success("Note added");
    },
    onError: (error) => {
      toast.error("Failed to add note: " + error.message);
    },
  });
}

// Documents
export function useWarrantyDocuments(warrantyId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-documents", warrantyId],
    queryFn: async () => {
      if (!warrantyId) return [];
      const { data, error } = await supabase
        .from("warranty_documents")
        .select("*")
        .eq("warranty_id", warrantyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WarrantyDocument[];
    },
    enabled: !!warrantyId,
  });
}

export function useUploadWarrantyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      warranty_id,
      file,
      document_type,
    }: {
      warranty_id: string;
      file: File;
      document_type: "intake_photo" | "closeout_photo" | "document";
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const filePath = `${warranty_id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("warranty-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("warranty_documents")
        .insert({
          warranty_id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          document_type,
          uploaded_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["warranty-documents", variables.warranty_id] });
      toast.success("Document uploaded");
    },
    onError: (error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });
}
