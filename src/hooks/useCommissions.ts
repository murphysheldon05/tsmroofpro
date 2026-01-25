import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommissionSubmission {
  id: string;
  submitted_by: string;
  submission_type: "employee" | "subcontractor";
  // Governed states: approved, revision_required, denied (plus pending_review for in-flight)
  status: "pending_review" | "revision_required" | "approved" | "denied" | "paid";
  approval_stage: "pending_manager" | "pending_accounting" | "pending_admin" | "completed" | null;
  
  // Job Information
  job_name: string;
  job_address: string;
  acculynx_job_id: string | null; // 4-digit required
  job_type: "insurance" | "retail" | "hoa";
  roof_type: "shingle" | "tile" | "flat" | "foam" | "other";
  contract_date: string;
  install_completion_date: string | null;
  
  // Sales Rep Info
  sales_rep_id: string | null;
  sales_rep_name: string | null;
  rep_role: "setter" | "closer" | "hybrid" | null;
  commission_tier: "15_40_60" | "15_45_55" | "15_50_50" | "custom" | null;
  custom_commission_percentage: number | null;
  
  // Subcontractor Info
  subcontractor_name: string | null;
  is_flat_fee: boolean;
  flat_fee_amount: number | null;
  
  // Worksheet Data
  contract_amount: number;
  supplements_approved: number;
  total_job_revenue: number;
  commission_percentage: number;
  gross_commission: number;
  advances_paid: number;
  net_commission_owed: number;
  
  // Governed Workflow Fields
  commission_requested: number;  // Editable by rep
  commission_approved: number;   // Editable by manager/accounting, read-only to rep
  commission_approved_at: string | null;
  commission_approved_by: string | null;
  revision_count: number;
  is_manager_submission: boolean; // Routes to admin for final approval
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  denied_at: string | null;
  denied_by: string | null;
  
  // Workflow
  reviewer_notes: string | null;
  rejection_reason: string | null;
  manager_approved_at: string | null;
  manager_approved_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  payout_batch_id: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface CommissionAttachment {
  id: string;
  commission_id: string;
  document_type: "contract" | "supplement" | "invoice" | "other";
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface CommissionStatusLog {
  id: string;
  commission_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

export interface SalesRep {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  is_active: boolean;
}

export interface CommissionReviewer {
  id: string;
  user_email: string;
  user_name: string;
  can_approve: boolean;
  can_payout: boolean;
  is_active: boolean;
}

// Commission tier percentages
export const COMMISSION_TIERS: Record<string, number> = {
  "15_40_60": 15,
  "15_45_55": 15,
  "15_50_50": 15,
};

export function useCommissionSubmissions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["commission-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CommissionSubmission[];
    },
    enabled: !!user,
  });
}

export function useCommissionSubmission(id: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["commission-submission", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as CommissionSubmission;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<CommissionSubmission>) => {
      if (!user) throw new Error("Not authenticated");
      
      // GOVERNANCE RULE: Check if user has a manager assigned (required for routing)
      const { data: profile } = await supabase
        .from("profiles")
        .select("manager_id, full_name")
        .eq("id", user.id)
        .single();

      // Check for team assignment as well
      const { data: teamAssignment } = await supabase
        .from("team_assignments")
        .select("manager_id")
        .eq("employee_id", user.id)
        .maybeSingle();

      const hasManager = profile?.manager_id || teamAssignment?.manager_id;

      if (!hasManager) {
        throw new Error("MANAGER_REQUIRED: You must have a manager assigned before submitting commissions. Please contact your administrator.");
      }
      
      const insertData = {
        ...data,
        submitted_by: user.id,
      };
      
      const { data: result, error } = await supabase
        .from("commission_submissions")
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log the initial status
      await supabase.from("commission_status_log").insert({
        commission_id: result.id,
        previous_status: null,
        new_status: "pending_review",
        changed_by: user.id,
        notes: "Commission submitted",
      });
      
      return result as CommissionSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      toast.success("Commission submitted successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("MANAGER_REQUIRED")) {
        toast.error("Manager Required", {
          description: "You must have a manager assigned before submitting commissions. Please contact your administrator.",
        });
      } else {
        toast.error("Failed to submit commission: " + error.message);
      }
    },
  });
}

export function useUpdateCommissionStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      approval_stage,
      notes,
      rejection_reason 
    }: { 
      id: string; 
      status: CommissionSubmission["status"]; 
      approval_stage?: CommissionSubmission["approval_stage"];
      notes?: string;
      rejection_reason?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      
      // Get current submission for status log
      const { data: current } = await supabase
        .from("commission_submissions")
        .select("status, approval_stage, submitted_by, job_name, job_address, sales_rep_name, subcontractor_name, submission_type, contract_amount, net_commission_owed")
        .eq("id", id)
        .single();
      
      const updateData: Record<string, any> = { status };
      
      // Set approval_stage if provided
      if (approval_stage) {
        updateData.approval_stage = approval_stage;
      }
      
      // Handle manager approval -> move to accounting stage
      if (approval_stage === "pending_accounting") {
        updateData.manager_approved_at = new Date().toISOString();
        updateData.manager_approved_by = user.id;
      }
      
      // Handle final (accounting) approval for regular submissions
      if (status === "approved" && approval_stage === "completed") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
        updateData.commission_approved_at = new Date().toISOString();
        updateData.commission_approved_by = user.id;
      }
      
      // Handle paid status
      if (status === "paid") {
        updateData.paid_at = new Date().toISOString();
        updateData.paid_by = user.id;
      }
      
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
        // Reset approval stage when requesting revision
        updateData.approval_stage = "pending_manager";
        // Increment revision count
        const { data: currentCount } = await supabase
          .from("commission_submissions")
          .select("revision_count")
          .eq("id", id)
          .single();
        updateData.revision_count = (currentCount?.revision_count || 0) + 1;
      }
      
      if (notes) {
        updateData.reviewer_notes = notes;
      }
      
      const { error } = await supabase
        .from("commission_submissions")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      
      // Log the status change
      const logNotes = approval_stage === "pending_accounting" 
        ? "Manager approved - sent to accounting"
        : approval_stage === "completed" && status === "approved"
        ? "🎉 Approved - ready for payment"
        : notes || rejection_reason || `Status changed to ${status}`;
      
      await supabase.from("commission_status_log").insert({
        commission_id: id,
        previous_status: current?.status,
        new_status: status,
        changed_by: user.id,
        notes: logNotes,
      });

      // Send notification
      try {
        const notificationType = 
          approval_stage === "pending_accounting" ? "manager_approved" :
          (approval_stage === "completed" && status === "approved") ? "approved" :
          status === "paid" ? "paid" :
          status === "revision_required" ? "revision_required" : 
          status === "denied" ? "denied" :
          "status_change";

        // Get submitter info
        const { data: submitterProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", current?.submitted_by)
          .single();

        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: notificationType,
            commission_id: id,
            job_name: current?.job_name,
            job_address: current?.job_address,
            sales_rep_name: current?.sales_rep_name,
            subcontractor_name: current?.subcontractor_name,
            submission_type: current?.submission_type,
            contract_amount: current?.contract_amount,
            net_commission_owed: current?.net_commission_owed,
            submitter_email: submitterProfile?.email,
            submitter_name: submitterProfile?.full_name,
            status,
            previous_status: current?.status,
            notes: notes || rejection_reason,
          },
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
        // Don't fail the mutation if notification fails
      }
      
      return { current, updateData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["commission-status-log", variables.id] });
      
      const message = 
        variables.approval_stage === "pending_accounting" ? "Approved by manager - sent to accounting" :
        (variables.approval_stage === "completed" && variables.status === "approved") ? "🎉 Commission Approved!" :
        variables.status === "paid" ? "Marked as paid" :
        variables.status === "revision_required" ? "Revision requested" :
        variables.status === "denied" ? "Commission denied" :
        "Commission status updated";
      
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
}

export function useCommissionAttachments(commissionId: string) {
  return useQuery({
    queryKey: ["commission-attachments", commissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_attachments")
        .select("*")
        .eq("commission_id", commissionId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CommissionAttachment[];
    },
    enabled: !!commissionId,
  });
}

export function useCommissionStatusLog(commissionId: string) {
  return useQuery({
    queryKey: ["commission-status-log", commissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_status_log")
        .select("*")
        .eq("commission_id", commissionId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CommissionStatusLog[];
    },
    enabled: !!commissionId,
  });
}

export function useSalesReps() {
  return useQuery({
    queryKey: ["sales-reps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_reps")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data as SalesRep[];
    },
  });
}

export function useCommissionReviewers() {
  return useQuery({
    queryKey: ["commission-reviewers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_reviewers")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data as CommissionReviewer[];
    },
  });
}

export function useIsCommissionReviewer() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["is-commission-reviewer", user?.id],
    queryFn: async () => {
      if (!user?.email) return false;
      
      const { data, error } = await supabase
        .from("commission_reviewers")
        .select("id")
        .eq("user_email", user.email)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
}

export function useCanProcessPayouts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["can-process-payouts", user?.id],
    queryFn: async () => {
      if (!user?.email) return false;
      
      const { data, error } = await supabase
        .from("commission_reviewers")
        .select("can_payout")
        .eq("user_email", user.email)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data?.can_payout ?? false;
    },
    enabled: !!user,
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<CommissionSubmission>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      
      // Get current submission to verify ownership and status
      const { data: current, error: fetchError } = await supabase
        .from("commission_submissions")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      if (current.submitted_by !== user.id) throw new Error("You can only edit your own submissions");
      if (current.status !== "revision_required") throw new Error("You can only edit submissions that require revision");
      
      // Update the submission and set status back to pending_review
      const updateData = {
        ...data,
        status: "pending_review",
        approval_stage: "pending_manager",
        rejection_reason: null, // Clear rejection reason on resubmit
      };
      
      const { data: result, error } = await supabase
        .from("commission_submissions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log the resubmission
      await supabase.from("commission_status_log").insert({
        commission_id: id,
        previous_status: "revision_required",
        new_status: "pending_review",
        changed_by: user.id,
        notes: "Commission revised and resubmitted",
      });
      
      // Send notification
      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "submitted",
            commission_id: id,
            job_name: result.job_name,
            job_address: result.job_address,
            sales_rep_name: result.sales_rep_name,
            subcontractor_name: result.subcontractor_name,
            submission_type: result.submission_type,
            contract_amount: result.contract_amount,
            net_commission_owed: result.net_commission_owed,
          },
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }
      
      return result as CommissionSubmission;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["commission-status-log", variables.id] });
      toast.success("Commission revised and resubmitted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update commission: " + error.message);
    },
  });
}
