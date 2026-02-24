import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayName } from "@/lib/displayName";
import { toast } from "sonner";

export interface CommissionSubmission {
  id: string;
  submitted_by: string;
  submission_type: "employee" | "subcontractor";
  // Governed states: approved, rejected, denied (plus pending_review for in-flight) — renamed from revision_required
  status: "pending_review" | "rejected" | "approved" | "denied" | "paid";
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

  // Pay run assignment (set at submission based on Tue 3PM MST cutoff)
  scheduled_pay_date: string | null;
  pay_run_id: string | null;
  
  // Override tracking
  override_amount: number | null;
  override_manager_id: string | null;
  override_commission_number: number | null;
  
  created_at: string;
  updated_at: string;

  // Rejected flow: tag persists to payout; snapshot used for change highlighting on resubmit
  was_rejected: boolean;
  previous_submission_snapshot: Record<string, unknown> | null;

  // Draw request: advance against future commission; flows through same approval chain
  is_draw?: boolean;
  // Draw-to-final: when rep closes out a paid draw and submits final commission
  draw_amount_paid?: number | null;
  draw_closed_out?: boolean | null;
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
  const { user, role, isAdmin, isManager, userDepartment } = useAuth();

  return useQuery({
    queryKey: ["commission-submissions", user?.id, role, userDepartment],
    queryFn: async () => {
      let query = supabase
        .from("commission_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      // User-level data isolation: only admin, manager, or Accounting department see all submissions
      const canSeeAll = isAdmin || isManager || userDepartment === "Accounting";
      if (!canSeeAll) {
        query = query.eq("submitted_by", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CommissionSubmission[];
    },
    enabled: !!user,
  });
}

export function useCommissionSubmission(id: string) {
  const { user, role, isAdmin, isManager, userDepartment } = useAuth();

  return useQuery({
    queryKey: ["commission-submission", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      // User-level data isolation: admin, manager, or Accounting dept can see all; others only their own
      const canSeeAll = isAdmin || isManager || userDepartment === "Accounting";
      if (data && !canSeeAll && data.submitted_by !== user!.id) {
        return null;
      }
      return data as CommissionSubmission | null;
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
        .maybeSingle();

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
        status: "pending_review" as const,
        approval_stage: data.is_manager_submission ? "pending_admin" : "pending_manager",
      };
      
      const { data: result, error } = await supabase
        .from("commission_submissions")
        .insert(insertData as Database["public"]["Tables"]["commission_submissions"]["Insert"])
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

      // Send email + in-app notification on submission
      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "submitted",
            document_type: "commission_submission",
            commission_id: result.id,
            job_name: data.job_name || "",
            job_address: data.job_address || "",
            sales_rep_name: data.sales_rep_name || null,
            subcontractor_name: data.subcontractor_name || null,
            submission_type: data.submission_type || "employee",
            contract_amount: data.contract_amount || 0,
            net_commission_owed: data.net_commission_owed || data.commission_requested || 0,
            submitter_email: user.email,
            submitter_name: formatDisplayName(profile?.full_name, profile?.email || user.email),
          },
        });
      } catch (notifyError) {
        console.error("Failed to send submission notification:", notifyError);
      }
      
      return result as CommissionSubmission;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["cc-commission-summary"] });
      toast.success(
        (result as CommissionSubmission)?.is_draw
          ? "Draw request submitted. Your manager will review it."
          : "Commission submitted successfully"
      );
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
      
      // Get current submission for status log and pay run
      const { data: current } = await supabase
        .from("commission_submissions")
        .select("status, approval_stage, submitted_by, job_name, job_address, sales_rep_name, subcontractor_name, submission_type, contract_amount, net_commission_owed, pay_run_id, scheduled_pay_date")
        .eq("id", id)
        .single();
      
      const updateData: Database["public"]["Tables"]["commission_submissions"]["Update"] = { status };
      
      // Set approval_stage if provided
      if (approval_stage) {
        updateData.approval_stage = approval_stage;
      }
      
      // Handle Compliance Review approval (Phase 2) -> move to accounting stage; managers no longer in chain
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

        // Calculate override if rep is in override phase
        if (current?.submitted_by) {
          try {
            const repId = current.submitted_by;
            // Get rep's manager
            const { data: teamAssignment } = await supabase
              .from("team_assignments")
              .select("manager_id")
              .eq("employee_id", repId)
              .maybeSingle();

            const managerId = teamAssignment?.manager_id;

            if (managerId) {
              // Get or create override tracking
              const { data: tracking } = await supabase
                .from("sales_rep_override_tracking")
                .select("approved_commission_count, override_phase_complete")
                .eq("sales_rep_id", repId)
                .maybeSingle();

              const currentCount = tracking?.approved_commission_count || 0;
              const isComplete = tracking?.override_phase_complete || currentCount >= 10;

              if (!isComplete && currentCount < 10) {
                const newCount = currentCount + 1;
                const netComm = current?.net_commission_owed || 0;
                const overrideAmt = netComm * 0.10;

                updateData.override_amount = overrideAmt;
                updateData.override_manager_id = managerId;
                updateData.override_commission_number = newCount;

                // Update tracking count
                if (tracking) {
                  await supabase
                    .from("sales_rep_override_tracking")
                    .update({
                      approved_commission_count: newCount,
                      override_phase_complete: newCount >= 10,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("sales_rep_id", repId);
                } else {
                  await supabase
                    .from("sales_rep_override_tracking")
                    .insert({
                      sales_rep_id: repId,
                      approved_commission_count: newCount,
                      override_phase_complete: newCount >= 10,
                    });
                }
              }
            }
          } catch (e) {
            console.error("Override calculation error:", e);
            // Don't fail the approval if override calc fails
          }
        }
      }
      
      // Guard: only approved commissions can be marked paid
      if (status === "paid" && current?.status !== "approved") {
        throw new Error("Only approved commissions can be marked as paid");
      }

      // Handle paid status — also bridge to commission_entries for leaderboard
      if (status === "paid") {
        updateData.paid_at = new Date().toISOString();
        updateData.paid_by = user.id;

        // Auto-create commission_entries record so leaderboard updates
        try {
          const submittedBy = current?.submitted_by;
          if (submittedBy) {
            // Find linked commission_rep via user_id
            const { data: linkedRep } = await supabase
              .from("commission_reps")
              .select("id")
              .eq("user_id", submittedBy)
              .maybeSingle();

            // Find the "Commission" pay type
            const { data: commPayType } = await supabase
              .from("commission_pay_types")
              .select("id")
              .ilike("name", "%commission%")
              .limit(1)
              .maybeSingle();

            if (linkedRep && commPayType) {
              // Prevent duplicate entries if paid is triggered more than once
              const { data: existing } = await supabase
                .from("commission_entries")
                .select("id")
                .ilike("notes", `%commission submission ${id}%`)
                .limit(1)
                .maybeSingle();
              if (!existing) {
              await supabase.from("commission_entries").insert({
                rep_id: linkedRep.id,
                job: current.job_name || null,
                customer: current.job_address || null,
                approved_date: current.status === "approved" ? new Date().toISOString().split("T")[0] : null,
                job_value: current.contract_amount || 0,
                amount_paid: current.net_commission_owed || 0,
                paid_date: new Date().toISOString().split("T")[0],
                check_type: "Direct Deposit",
                notes: `Auto-created from commission submission ${id}`,
                pay_type_id: commPayType.id,
                earned_comm: current.net_commission_owed || 0,
                has_paid: true,
                pay_run_id: current.pay_run_id || null,
              });
              }
            }
          }
        } catch (bridgeError) {
          console.error("Commission entry bridge failed:", bridgeError);
          // Don't fail payment if bridge fails
        }
      }
      
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
        updateData.was_rejected = true; // Persist Rejected tag through to payout; never cleared
        // Reset approval stage when rejecting (sending back to rep)
        // Manager submissions restart at pending_admin, regular at pending_manager
        const { data: submissionCheck } = await supabase
          .from("commission_submissions")
          .select("revision_count, is_manager_submission")
          .eq("id", id)
          .single();
        updateData.approval_stage = submissionCheck?.is_manager_submission ? "pending_admin" : "pending_manager";
        updateData.revision_count = (submissionCheck?.revision_count || 0) + 1;
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
        ? "Compliance approved - sent to accounting"
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
          (approval_stage === "completed" && status === "approved") ? "accounting_approved" :
          status === "paid" ? "paid" :
          status === "rejected" ? "rejected" : 
          status === "denied" ? "denied" :
          "status_change";

        // Get submitter info
        const { data: submitterProfile } = current?.submitted_by
          ? await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", current.submitted_by)
              .maybeSingle()
          : { data: null };

        let scheduled_pay_date: string | undefined;
        if (notificationType === "accounting_approved" && current?.scheduled_pay_date) {
          scheduled_pay_date = current.scheduled_pay_date;
        }
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: notificationType,
            document_type: "commission_submission",
            commission_id: id,
            job_name: current?.job_name,
            job_address: current?.job_address,
            sales_rep_name: current?.sales_rep_name,
            subcontractor_name: current?.subcontractor_name,
            submission_type: current?.submission_type,
            contract_amount: current?.contract_amount,
            net_commission_owed: current?.net_commission_owed,
            submitter_email: submitterProfile?.email,
            submitter_name: formatDisplayName(submitterProfile?.full_name, submitterProfile?.email),
            status,
            previous_status: current?.status,
            notes: notes || rejection_reason,
            scheduled_pay_date,
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
      queryClient.invalidateQueries({ queryKey: ["cc-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["commission-status-log", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-commission-oversight"] });
      // Refresh leaderboard data when commission is paid
      if (variables.status === "paid") {
        queryClient.invalidateQueries({ queryKey: ["commission-entries"] });
        queryClient.invalidateQueries({ queryKey: ["pay-run-leaderboard"] });
      }

      const message =
        variables.approval_stage === "pending_accounting" ? "Compliance approved - sent to accounting" :
        (variables.approval_stage === "completed" && variables.status === "approved") ? "🎉 Commission Approved!" :
        variables.status === "paid" ? "Marked as paid" :
        variables.status === "rejected" ? "Rejected — submitter notified" :
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
      if (current.status !== "rejected" && current.status !== "denied") throw new Error("You can only edit submissions that have been rejected or denied");
      
      // Snapshot of previous submission for compliance change highlighting (only for rejected resubmits)
      const snapshotFields = [
        "job_name", "job_address", "acculynx_job_id", "job_type", "roof_type", "contract_date", "install_completion_date",
        "sales_rep_name", "rep_role", "commission_tier", "custom_commission_percentage", "subcontractor_name",
        "is_flat_fee", "flat_fee_amount", "contract_amount", "supplements_approved", "commission_percentage",
        "advances_paid", "net_commission_owed", "commission_requested", "total_job_revenue", "gross_commission",
      ];
      const previousSnapshot: Record<string, unknown> = {};
      snapshotFields.forEach((key) => {
        if (current[key] !== undefined && current[key] !== null) previousSnapshot[key] = current[key];
      });
      if (Object.keys(previousSnapshot).length === 0) snapshotFields.forEach((key) => { previousSnapshot[key] = current[key]; });

      // Update the submission and set status back to pending_review
      // Manager submissions go back to pending_admin (Sheldon/Manny), regular ones to pending_manager
      const updateData = {
        ...data,
        status: "pending_review",
        approval_stage: current.is_manager_submission ? "pending_admin" : "pending_manager",
        rejection_reason: null, // Clear rejection reason on resubmit (rejected = sent back to rep)
        previous_submission_snapshot: previousSnapshot,
      };
      
      const { data: result, error } = await supabase
        .from("commission_submissions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log the resubmission
      const previousStatus = current.status;
      await supabase.from("commission_status_log").insert({
        commission_id: id,
        previous_status: previousStatus,
        new_status: "pending_review",
        changed_by: user.id,
        notes: `Commission resubmitted — previously ${previousStatus === 'denied' ? 'denied' : 'rejected'}`,
      });
      
      // Notify compliance: "Rejected Commission Revised by [Rep Name]" — NOT "New Commission Submitted"
      const { data: submitterProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      const repDisplayName = formatDisplayName(submitterProfile?.full_name, submitterProfile?.email || user?.email) || result.sales_rep_name || "Rep";
      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "rejected_commission_revised",
            document_type: "commission_submission",
            commission_id: id,
            job_name: result.job_name,
            job_address: result.job_address,
            sales_rep_name: result.sales_rep_name,
            subcontractor_name: result.subcontractor_name,
            submission_type: result.submission_type,
            contract_amount: result.contract_amount,
            net_commission_owed: result.net_commission_owed,
            submitter_name: repDisplayName,
          },
        });
      } catch (notifyError) {
        console.error("Failed to send resubmission notification:", notifyError);
      }
      
      return result as CommissionSubmission;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["cc-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["commission-status-log", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-commission-oversight"] });
      toast.success("Commission revised and resubmitted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update commission: " + error.message);
    },
  });
}

// Admin-only: delete commission record. Non-admin users cannot delete.
export function useDeleteCommission() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !isAdmin) throw new Error("Only admins can delete commissions");

      // Remove from tracker: delete commission_entries created from this submission (notes contain "commission submission {id}")
      const { data: entries } = await supabase
        .from("commission_entries")
        .select("id")
        .ilike("notes", `%commission submission ${id}%`);
      if (entries && entries.length > 0) {
        await supabase
          .from("commission_entries")
          .delete()
          .in("id", entries.map((e) => e.id));
      }

      const { error } = await supabase
        .from("commission_submissions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Clean up related status log entries
      await supabase
        .from("commission_status_log")
        .delete()
        .eq("commission_id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["cc-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-entries"] });
      queryClient.invalidateQueries({ queryKey: ["pay-run-leaderboard"] });
      toast.success("Commission deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete commission: " + error.message);
    },
  });
}

// Rep closes out a paid draw: convert to final commission submission (full approval chain)
export function useCloseOutDraw() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        contract_amount: number;
        supplements_approved: number;
        commission_percentage: number;
        advances_paid: number;
        install_completion_date?: string | null;
        [key: string]: unknown;
      };
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: current, error: fetchError } = await supabase
        .from("commission_submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !current) throw new Error("Commission not found");
      if (current.submitted_by !== user.id) throw new Error("You can only close out your own draws");
      if (!current.is_draw) throw new Error("This is not a draw request");
      if (current.status !== "paid") throw new Error("Draw must be paid before closing out");
      if (current.draw_closed_out) throw new Error("This draw has already been closed out");

      // Clean up commission_entries from when the draw was paid
      try {
        await supabase
          .from("commission_entries")
          .delete()
          .ilike("notes", `%commission submission ${id}%`);
      } catch (e) {
        console.warn("Failed to clean up draw entries:", e);
      }

      const drawAmountPaid = current.commission_requested ?? current.net_commission_owed ?? 0;
      const totalJobRevenue = data.contract_amount + data.supplements_approved;
      const grossCommission = totalJobRevenue * (data.commission_percentage / 100);
      const netCommissionOwed = grossCommission - data.advances_paid;

      const updatePayload = {
        contract_amount: data.contract_amount,
        supplements_approved: data.supplements_approved,
        commission_percentage: data.commission_percentage,
        advances_paid: data.advances_paid,
        total_job_revenue: totalJobRevenue,
        gross_commission: grossCommission,
        net_commission_owed: netCommissionOwed,
        commission_requested: netCommissionOwed,
        install_completion_date: data.install_completion_date ?? current.install_completion_date,
        draw_amount_paid: drawAmountPaid,
        draw_closed_out: true,
        status: "pending_review",
        approval_stage: current.is_manager_submission ? "pending_admin" : "pending_manager",
      };

      const { data: result, error } = await supabase
        .from("commission_submissions")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("commission_status_log").insert({
        commission_id: id,
        previous_status: current.status,
        new_status: "pending_review",
        changed_by: user.id,
        notes: "Draw closed out — final commission submitted for approval",
      });

      try {
        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "submitted",
            document_type: "commission_submission",
            commission_id: id,
            job_name: current.job_name,
            job_address: current.job_address,
            sales_rep_name: current.sales_rep_name,
            subcontractor_name: current.subcontractor_name,
            submission_type: current.submission_type,
            contract_amount: data.contract_amount,
            net_commission_owed: netCommissionOwed,
            submitter_email: user.email,
            submitter_name: "",
          },
        });
      } catch (notifyError) {
        console.error("Failed to send close-out notification:", notifyError);
      }

      return result as CommissionSubmission;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["cc-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["commission-status-log", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-commission-oversight"] });
      toast.success("Final commission submitted. It will go through the full approval chain.");
    },
    onError: (error: Error) => {
      toast.error("Failed to close out draw: " + error.message);
    },
  });
}

// Admin-only: revert a commission to a previous approval phase. Non-admin users cannot revert; Mark Paid is one-time for them.
export function useRevertCommission() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !isAdmin) throw new Error("Only admins can revert a commission to a previous phase");

      const { data: current, error: fetchError } = await supabase
        .from("commission_submissions")
        .select("status, approval_stage")
        .eq("id", id)
        .single();

      if (fetchError || !current) throw new Error("Commission not found");

      let updateData: Record<string, unknown> = {};

      if (current.status === "paid") {
        updateData = {
          status: "approved",
          approval_stage: "completed",
          paid_at: null,
          paid_by: null,
        };

        // Clean up auto-created commission_entries for this submission
        try {
          await supabase
            .from("commission_entries")
            .delete()
            .ilike("notes", `%commission submission ${id}%`);
        } catch (cleanupErr) {
          console.warn("Failed to clean up tracker entries on revert:", cleanupErr);
        }
      } else if (current.status === "approved" && current.approval_stage === "completed") {
        updateData = {
          status: "pending_review",
          approval_stage: "pending_accounting",
          approved_at: null,
          approved_by: null,
          commission_approved_at: null,
          commission_approved_by: null,
        };
      } else if (current.status === "pending_review" && current.approval_stage === "pending_accounting") {
        updateData = {
          approval_stage: "pending_manager",
          manager_approved_at: null,
          manager_approved_by: null,
        };
      } else {
        throw new Error("This commission cannot be reverted further");
      }

      const { error: updateError } = await supabase
        .from("commission_submissions")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("commission_status_log").insert({
        commission_id: id,
        previous_status: current.status,
        new_status: (updateData.status as string) ?? current.status,
        changed_by: user.id,
        notes: `Admin reverted to previous phase. Was: ${current.status} / ${current.approval_stage}.`,
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["commission-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["cc-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-submission", id] });
      queryClient.invalidateQueries({ queryKey: ["commission-status-log", id] });
      queryClient.invalidateQueries({ queryKey: ["pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-commissions"] });
      toast.success("Commission reverted to previous phase");
    },
    onError: (error: Error) => {
      toast.error("Failed to revert commission: " + error.message);
    },
  });
}
