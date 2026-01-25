import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Governed Commission Status - ONLY these 3 states allowed
export type CommissionStatus = "approved" | "revision_required" | "denied";

// Approval stages for workflow routing
export type ApprovalStage = 
  | "pending_manager"       // Rep submission awaiting manager
  | "pending_accounting"    // Manager approved, awaiting accounting
  | "pending_admin"         // Manager submission awaiting admin (Sheldon)
  | "completed";            // Final approval reached

export interface RevisionLogEntry {
  id: string;
  commission_id: string;
  revision_number: number;
  requested_by: string;
  requested_by_name: string | null;
  requested_by_role: string | null;
  reason: string;
  previous_amount: number | null;
  new_amount: number | null;
  created_at: string;
}

export interface DeniedJobNumber {
  id: string;
  job_number: string;
  commission_id: string | null;
  denied_by: string;
  denied_at: string;
  denial_reason: string;
}

// Check if a job number has been denied (permanently locked)
export function useDeniedJobNumbers() {
  return useQuery({
    queryKey: ["denied-job-numbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denied_job_numbers")
        .select("*")
        .order("denied_at", { ascending: false });
      
      if (error) throw error;
      return data as DeniedJobNumber[];
    },
  });
}

// Check if specific job number is denied
export function useIsJobNumberDenied(jobNumber: string | null) {
  return useQuery({
    queryKey: ["job-number-denied", jobNumber],
    queryFn: async () => {
      if (!jobNumber || jobNumber.length !== 4) return false;
      
      const { data, error } = await supabase
        .from("denied_job_numbers")
        .select("id")
        .eq("job_number", jobNumber)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!jobNumber && jobNumber.length === 4,
  });
}

// Get revision history for a commission
export function useCommissionRevisionLog(commissionId: string) {
  return useQuery({
    queryKey: ["commission-revision-log", commissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_revision_log")
        .select("*")
        .eq("commission_id", commissionId)
        .order("revision_number", { ascending: false });
      
      if (error) throw error;
      return data as RevisionLogEntry[];
    },
    enabled: !!commissionId,
  });
}

// Determine if current user is a manager (for detecting manager submissions)
export function useIsUserManager() {
  const { user, role } = useAuth();
  
  return useQuery({
    queryKey: ["is-user-manager", user?.id],
    queryFn: async () => {
      if (!user) return false;
      return role === "manager" || role === "admin";
    },
    enabled: !!user,
  });
}

// Check if user is the admin (Sheldon) for final manager commission approval
export function useIsAdminApprover() {
  const { role } = useAuth();
  return role === "admin";
}

// Deny a commission and lock the job number
export function useDenyCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      commissionId,
      jobNumber,
      reason,
    }: {
      commissionId: string;
      jobNumber: string;
      reason: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (!reason.trim()) throw new Error("Denial reason is required");
      
      // Update commission status to denied
      const { error: updateError } = await supabase
        .from("commission_submissions")
        .update({
          status: "denied",
          approval_stage: "completed",
          rejection_reason: reason,
          denied_at: new Date().toISOString(),
          denied_by: user.id,
        })
        .eq("id", commissionId);
      
      if (updateError) throw updateError;
      
      // Lock the job number permanently
      if (jobNumber && jobNumber.length === 4) {
        const { error: lockError } = await supabase
          .from("denied_job_numbers")
          .insert({
            job_number: jobNumber,
            commission_id: commissionId,
            denied_by: user.id,
            denial_reason: reason,
          });
        
        if (lockError && !lockError.message.includes("duplicate")) {
          throw lockError;
        }
      }
      
      // Log the status change
      await supabase.from("commission_status_log").insert({
        commission_id: commissionId,
        previous_status: "pending_review",
        new_status: "denied",
        changed_by: user.id,
        notes: `Commission DENIED: ${reason}`,
      });
      
      // Send notification
      try {
        const { data: commission } = await supabase
          .from("commission_submissions")
          .select("*, profiles:submitted_by(email, full_name)")
          .eq("id", commissionId)
          .single();
        
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "denied",
            commission_id: commissionId,
            job_name: commission?.job_name,
            job_address: commission?.job_address,
            sales_rep_name: commission?.sales_rep_name,
            submission_type: commission?.submission_type,
            contract_amount: commission?.contract_amount,
            notes: reason,
            status: "denied",
          },
        });
      } catch (notifyError) {
        console.error("Failed to send denial notification:", notifyError);
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.commissionId] });
      queryClient.invalidateQueries({ queryKey: ["denied-job-numbers"] });
      toast.error("Commission Denied", {
        description: "The job number has been permanently locked.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to deny commission: " + error.message);
    },
  });
}

// Request revision (with required notes)
export function useRequestRevision() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      commissionId,
      reason,
      previousAmount,
    }: {
      commissionId: string;
      reason: string;
      previousAmount?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (!reason.trim()) throw new Error("Revision reason is required");
      
      // Get current revision count
      const { data: current } = await supabase
        .from("commission_submissions")
        .select("revision_count, commission_requested")
        .eq("id", commissionId)
        .single();
      
      const newRevisionCount = (current?.revision_count || 0) + 1;
      
      // Update commission
      const { error: updateError } = await supabase
        .from("commission_submissions")
        .update({
          status: "revision_required",
          approval_stage: "pending_manager",
          rejection_reason: reason,
          revision_count: newRevisionCount,
        })
        .eq("id", commissionId);
      
      if (updateError) throw updateError;
      
      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      // Log revision
      await supabase.from("commission_revision_log").insert({
        commission_id: commissionId,
        revision_number: newRevisionCount,
        requested_by: user.id,
        requested_by_name: profile?.full_name || null,
        requested_by_role: role || null,
        reason: reason,
        previous_amount: previousAmount || current?.commission_requested || null,
      });
      
      // Log status change
      await supabase.from("commission_status_log").insert({
        commission_id: commissionId,
        previous_status: "pending_review",
        new_status: "revision_required",
        changed_by: user.id,
        notes: `Revision #${newRevisionCount} requested: ${reason}`,
      });
      
      // Send notification
      try {
        const { data: commission } = await supabase
          .from("commission_submissions")
          .select("*")
          .eq("id", commissionId)
          .single();
        
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "revision_required",
            commission_id: commissionId,
            job_name: commission?.job_name,
            job_address: commission?.job_address,
            sales_rep_name: commission?.sales_rep_name,
            submission_type: commission?.submission_type,
            notes: reason,
            status: "revision_required",
          },
        });
      } catch (notifyError) {
        console.error("Failed to send revision notification:", notifyError);
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.commissionId] });
      queryClient.invalidateQueries({ queryKey: ["commission-revision-log", variables.commissionId] });
      toast.warning("Revision Requested", {
        description: "The submitter has been notified to revise their commission.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to request revision: " + error.message);
    },
  });
}

// Approve commission (with amount editing for accounting)
export function useApproveCommission() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      commissionId,
      approvedAmount,
      notes,
      isManagerSubmission,
      currentStage,
    }: {
      commissionId: string;
      approvedAmount?: number;
      notes?: string;
      isManagerSubmission: boolean;
      currentStage: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      
      // Get current commission data
      const { data: current } = await supabase
        .from("commission_submissions")
        .select("commission_requested, commission_approved")
        .eq("id", commissionId)
        .single();
      
      const requestedAmount = current?.commission_requested || 0;
      const finalApprovedAmount = approvedAmount !== undefined ? approvedAmount : requestedAmount;
      
      // If amount was edited, notes are required
      if (approvedAmount !== undefined && approvedAmount !== requestedAmount && !notes?.trim()) {
        throw new Error("Notes are required when modifying the approved amount");
      }
      
      let updateData: Record<string, any> = {
        reviewer_notes: notes || null,
        commission_approved: finalApprovedAmount,
      };
      
      // Determine next stage based on current stage and submission type
      if (currentStage === "pending_manager") {
        // Manager approval - move to accounting
        updateData.approval_stage = "pending_accounting";
        updateData.manager_approved_at = new Date().toISOString();
        updateData.manager_approved_by = user.id;
      } else if (currentStage === "pending_accounting") {
        if (isManagerSubmission) {
          // Manager submission needs admin (Sheldon) approval
          updateData.approval_stage = "pending_admin";
          updateData.commission_approved_at = new Date().toISOString();
          updateData.commission_approved_by = user.id;
        } else {
          // Regular rep submission - accounting is final
          updateData.status = "approved";
          updateData.approval_stage = "completed";
          updateData.approved_at = new Date().toISOString();
          updateData.approved_by = user.id;
          updateData.commission_approved_at = new Date().toISOString();
          updateData.commission_approved_by = user.id;
        }
      } else if (currentStage === "pending_admin") {
        // Admin (Sheldon) final approval for manager submissions
        updateData.status = "approved";
        updateData.approval_stage = "completed";
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
        updateData.admin_approved_at = new Date().toISOString();
        updateData.admin_approved_by = user.id;
      }
      
      const { error: updateError } = await supabase
        .from("commission_submissions")
        .update(updateData)
        .eq("id", commissionId);
      
      if (updateError) throw updateError;
      
      // Log status change
      const logMessage = 
        currentStage === "pending_manager" ? "Manager approved - forwarded to accounting" :
        currentStage === "pending_accounting" && isManagerSubmission ? "Accounting approved - awaiting admin final approval" :
        currentStage === "pending_accounting" ? "🎉 APPROVED! Commission ready for payout" :
        currentStage === "pending_admin" ? "🎉 APPROVED by Admin! Manager commission ready for payout" :
        "Commission approved";
      
      await supabase.from("commission_status_log").insert({
        commission_id: commissionId,
        previous_status: "pending_review",
        new_status: updateData.status || "pending_review",
        changed_by: user.id,
        notes: notes ? `${logMessage}\n\nNotes: ${notes}` : logMessage,
      });
      
      // Send celebratory notification for final approvals
      if (updateData.status === "approved") {
        try {
          const { data: commission } = await supabase
            .from("commission_submissions")
            .select("*")
            .eq("id", commissionId)
            .single();
          
          await supabase.functions.invoke("send-commission-notification", {
            body: {
              notification_type: "approved",
              commission_id: commissionId,
              job_name: commission?.job_name,
              job_address: commission?.job_address,
              sales_rep_name: commission?.sales_rep_name,
              submission_type: commission?.submission_type,
              contract_amount: commission?.contract_amount,
              net_commission_owed: finalApprovedAmount,
              notes: notes || "Congratulations! Your commission has been approved!",
              status: "approved",
            },
          });
        } catch (notifyError) {
          console.error("Failed to send approval notification:", notifyError);
        }
      }
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.commissionId] });
      
      const message = 
        variables.currentStage === "pending_manager" ? "Approved by manager - sent to accounting" :
        variables.currentStage === "pending_accounting" && variables.isManagerSubmission ? "Approved by accounting - sent to admin" :
        "🎉 Commission Approved!";
      
      toast.success(message, {
        description: variables.currentStage === "completed" || 
          (variables.currentStage === "pending_accounting" && !variables.isManagerSubmission) ||
          variables.currentStage === "pending_admin"
          ? "The submitter has been notified!" 
          : undefined,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to approve commission: " + error.message);
    },
  });
}

// Validate 4-digit AccuLynx job number
export function validateJobNumber(jobNumber: string): { valid: boolean; message?: string } {
  if (!jobNumber) {
    return { valid: false, message: "AccuLynx Job Number is required" };
  }
  
  const cleaned = jobNumber.replace(/\D/g, "");
  
  if (cleaned.length !== 4) {
    return { valid: false, message: "Job number must be exactly 4 digits" };
  }
  
  return { valid: true };
}
