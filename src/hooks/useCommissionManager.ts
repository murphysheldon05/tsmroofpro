import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logCommissionAction } from "@/hooks/useCommissionAuditLog";
import { ensurePayRunExists } from "@/hooks/usePayRuns";
import {
  formatPayRunRange,
  getCurrentPayRunPeriod,
  getFridayDateStringForPeriodStart,
  getNextPayRunPeriod,
  isBeforeRevisionDeadline,
} from "@/lib/commissionPayDateCalculations";

export interface ManagerCommission {
  id: string;
  job_name_id: string;
  job_date: string;
  sales_rep: string;
  sales_rep_id: string | null;
  created_by: string;
  rep_commission: number;
  gross_contract_total: number;
  status: string;
  created_at: string;
  submitted_at: string | null;
  paid_at: string | null;
  manager_approved_at: string | null;
  accounting_approved_at: string | null;
  revision_reason: string | null;
  submitter_email: string | null;
  rep_name?: string;
}

export function useManagerCommissions(statusFilter?: string) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["manager-commissions", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("commission_documents")
        .select("*")
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((d) => d.created_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || p.email || "Unknown";
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map((d) => ({
        ...d,
        rep_name: d.sales_rep || profileMap[d.created_by] || "Unknown",
      })) as ManagerCommission[];
    },
    enabled: isAdmin,
  });
}

export function useManagerSummary() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["manager-commission-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_documents")
        .select("status, rep_commission, paid_at")
        .neq("status", "draft");

      if (error) throw error;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const pendingCompliance = (data || [])
        .filter((d) => d.status === "submitted")
        .reduce((sum, d) => sum + (d.rep_commission || 0), 0);

      const pendingAccounting = (data || [])
        .filter((d) => d.status === "manager_approved")
        .reduce((sum, d) => sum + (d.rep_commission || 0), 0);

      const pendingPayment = (data || [])
        .filter((d) => d.status === "accounting_approved")
        .reduce((sum, d) => sum + (d.rep_commission || 0), 0);

      const paidThisMonth = (data || [])
        .filter((d) => d.status === "paid" && d.paid_at && new Date(d.paid_at) >= startOfMonth)
        .reduce((sum, d) => sum + (d.rep_commission || 0), 0);

      return { pendingCompliance, pendingAccounting, pendingPayment, paidThisMonth };
    },
    enabled: isAdmin,
  });
}

export function useApproveCommissionDoc() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "manager_approved" | "accounting_approved" | "paid" }) => {
      const updateData: Record<string, any> = { status: newStatus };
      const now = new Date().toISOString();

      if (newStatus === "manager_approved") {
        updateData.manager_approved_by = user?.id;
        updateData.manager_approved_at = now;
      } else if (newStatus === "accounting_approved") {
        updateData.accounting_approved_by = user?.id;
        updateData.accounting_approved_at = now;
        updateData.approved_by = user?.id;
        updateData.approved_at = now;
      } else if (newStatus === "paid") {
        updateData.paid_by = user?.id;
        updateData.paid_at = now;
      }

      const { data, error } = await supabase
        .from("commission_documents")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Send notification
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", data.created_by)
        .single();

      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .single();

      const notificationTypeMap: Record<string, string> = {
        manager_approved: "manager_approved",
        accounting_approved: "accounting_approved",
        paid: "paid",
      };

      await supabase.functions.invoke("send-commission-notification", {
        body: {
          notification_type: notificationTypeMap[newStatus],
          document_type: "commission_document",
          commission_id: data.id,
          job_name: data.job_name_id,
          job_address: data.job_name_id,
          sales_rep_name: data.sales_rep,
          submission_type: "employee",
          contract_amount: data.gross_contract_total,
          net_commission_owed: data.rep_commission,
          submitter_email: creatorProfile?.email || data.submitter_email,
          submitter_name: creatorProfile?.full_name || data.sales_rep,
          status: newStatus,
          changed_by_name: currentUserProfile?.full_name || "Admin",
          scheduled_pay_date: data.scheduled_pay_date,
        },
      }).catch(console.error);

      // Audit log
      const auditActionMap: Record<string, string> = {
        manager_approved: "approved",
        accounting_approved: "approved",
        paid: "paid",
      };
      try {
        await logCommissionAction({
          commissionId: id,
          action: auditActionMap[newStatus] as any,
          performedBy: user!.id,
          payRunId: data.pay_run_id || null,
          details: { stage: newStatus === "manager_approved" ? "compliance" : newStatus === "accounting_approved" ? "accounting" : "payment" },
        });
      } catch { /* non-blocking */ }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["manager-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-documents"] });
      queryClient.invalidateQueries({ queryKey: ["pay-run-commissions"] });
      toast.success("Commission updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update commission: " + error.message);
    },
  });
}

export function useRejectCommissionDoc() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason, rejection_source }: { id: string; reason: string; rejection_source?: "compliance" | "accounting" }) => {
      const { data: current } = await supabase
        .from("commission_documents")
        .select("revision_count, pay_run_id")
        .eq("id", id)
        .single();

      const updatePayload: Record<string, unknown> = {
        status: "revision_required",
        revision_reason: reason,
        revision_count: (current?.revision_count || 0) + 1,
      };

      let rolledOnReject = false;
      if (current?.pay_run_id && !isBeforeRevisionDeadline()) {
        const nextPeriod = getNextPayRunPeriod();
        const nextPayRunId = await ensurePayRunExists(nextPeriod.periodStart);
        updatePayload.pay_run_id = nextPayRunId;
        updatePayload.rolled_from_pay_run_id = current.pay_run_id;
        updatePayload.is_late_revision = true;
        updatePayload.scheduled_pay_date = getFridayDateStringForPeriodStart(nextPeriod.periodStart);
        rolledOnReject = true;
      }

      const { data, error } = await supabase
        .from("commission_documents")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const period = getCurrentPayRunPeriod();
      const nextPeriod = getNextPayRunPeriod();
      const payRunPeriodLabel = formatPayRunRange(period.periodStart, period.periodEnd);
      const revisionResubmitCopy =
        "Please resubmit by Wednesday 12:00 PM MST to stay in the current pay run when the revision deadline has not passed.";
      const payRunContext = rolledOnReject
        ? `This commission has been moved to the next pay run (${formatPayRunRange(nextPeriod.periodStart, nextPeriod.periodEnd)}) because the revision deadline has passed.`
        : `Current pay run: ${payRunPeriodLabel}.`;

      // Notification is best-effort; failures must not mask a successful status change
      try {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", data.created_by)
          .single();

        const { data: currentUserProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user!.id)
          .single();

        await supabase.functions.invoke("send-commission-notification", {
          body: {
            notification_type: "rejected",
            document_type: "commission_document",
            commission_id: data.id,
            job_name: data.job_name_id,
            job_address: data.job_name_id,
            sales_rep_name: data.sales_rep,
            submission_type: "employee",
            contract_amount: data.gross_contract_total,
            net_commission_owed: data.rep_commission,
            submitter_email: creatorProfile?.email || data.submitter_email,
            submitter_name: creatorProfile?.full_name || data.sales_rep,
            status: "revision_required",
            notes: reason,
            rejection_source: rejection_source || "compliance",
            changed_by_name: currentUserProfile?.full_name || "Admin",
            pay_run_period_label: payRunPeriodLabel,
            revision_deadline_text: period.revisionDeadlineDisplay,
            commission_pay_run_context: payRunContext,
            revision_resubmit_reminder: revisionResubmitCopy,
            rolled_to_next_pay_run_on_reject: rolledOnReject,
          },
        });
      } catch (notifyError) {
        console.error("Notification failed (commission was still rejected):", notifyError);
      }

      try {
        await logCommissionAction({
          commissionId: id,
          action: "rejected",
          performedBy: user!.id,
          payRunId: data.pay_run_id || null,
          details: { reason, message: reason },
        });
        await logCommissionAction({
          commissionId: id,
          action: "revision_requested",
          performedBy: user!.id,
          payRunId: data.pay_run_id || null,
        });
        if (rolledOnReject && updatePayload.rolled_from_pay_run_id && updatePayload.pay_run_id) {
          await logCommissionAction({
            commissionId: id,
            action: "rolled_to_next_pay_run",
            performedBy: user!.id,
            payRunId: data.pay_run_id as string,
            details: {
              from_pay_run: updatePayload.rolled_from_pay_run_id,
              to_pay_run: updatePayload.pay_run_id,
              reason: "revision_deadline_passed",
            },
          });
        }
      } catch { /* non-blocking */ }

      return { ...data, revisionDeadlinePassed: !isBeforeRevisionDeadline(), rolledOnReject };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["manager-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["manager-commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["commission-documents"] });
      queryClient.invalidateQueries({ queryKey: ["commission-audit-log", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pay-run-commissions"] });
      if (result.rolledOnReject) {
        toast.warning(
          "Commission sent back for revision. It was moved to next week's pay run because the Wednesday noon revision deadline had already passed."
        );
      } else if (result.revisionDeadlinePassed) {
        toast.warning(
          "Commission sent back for revision. Note: The revision deadline has passed — if the rep resubmits, it will move to next week's pay run."
        );
      } else {
        toast.success("Commission sent back for revision");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to reject commission: " + error.message);
    },
  });
}

export function useImportCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      sales_rep_id: string;
      sales_rep_name: string;
      job_name: string;
      job_date: string;
      amount: number;
      mark_as_paid: boolean;
    }) => {
      const now = new Date().toISOString();
      const insertData: Record<string, any> = {
        job_name_id: data.job_name,
        job_date: data.job_date,
        sales_rep: data.sales_rep_name,
        sales_rep_id: data.sales_rep_id,
        created_by: data.sales_rep_id,
        rep_commission: data.amount,
        gross_contract_total: data.amount,
        contract_total_net: data.amount,
        net_profit: data.amount,
        company_profit: 0,
        advance_total: 0,
        material_cost: 0,
        labor_cost: 0,
        neg_exp_1: 0,
        neg_exp_2: 0,
        neg_exp_3: 0,
        pos_exp_1: 0,
        pos_exp_2: 0,
        pos_exp_3: 0,
        pos_exp_4: 0,
        supplement_fees_expense: 0,
        op_percent: 0,
        commission_rate: 1,
        status: data.mark_as_paid ? "paid" : "accounting_approved",
        submitted_at: now,
        manager_approved_by: user?.id,
        manager_approved_at: now,
        accounting_approved_by: user?.id,
        accounting_approved_at: now,
      };

      if (data.mark_as_paid) {
        insertData.paid_by = user?.id;
        insertData.paid_at = now;
      }

      const { error } = await supabase.from("commission_documents").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["manager-commission-summary"] });
      toast.success("Commission imported successfully");
    },
    onError: (error: Error) => {
      toast.error("Import failed: " + error.message);
    },
  });
}

export function useAdminOverridePullIn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commissionId }: { commissionId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: doc } = await supabase
        .from("commission_documents")
        .select("pay_run_id, is_late_submission, is_late_revision")
        .eq("id", commissionId)
        .single();

      if (!doc) throw new Error("Commission not found");

      const currentPeriod = getCurrentPayRunPeriod();
      const currentPayRunId = await ensurePayRunExists(currentPeriod.periodStart);

      if (doc.pay_run_id === currentPayRunId) {
        throw new Error("Commission is already in the current pay run");
      }

      const { data, error } = await supabase
        .from("commission_documents")
        .update({
          pay_run_id: currentPayRunId,
          rolled_from_pay_run_id: doc.pay_run_id,
          is_late_submission: false,
          is_late_revision: false,
        })
        .eq("id", commissionId)
        .select()
        .single();

      if (error) throw error;

      try {
        await logCommissionAction({
          commissionId,
          action: "admin_override_pulled_in",
          performedBy: user.id,
          payRunId: currentPayRunId,
          details: {
            from_pay_run: doc.pay_run_id,
            to_pay_run: currentPayRunId,
            override_by: user.id,
          },
        });
      } catch { /* non-blocking */ }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-documents"] });
      queryClient.invalidateQueries({ queryKey: ["pay-run-commissions"] });
      toast.success("Commission moved to current pay run");
    },
    onError: (error: Error) => {
      toast.error("Failed to override: " + error.message);
    },
  });
}

export function useAllReps() {
  return useQuery({
    queryKey: ["all-sales-reps"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["sales_rep"]);

      const repIds = (roles || []).map((r) => r.user_id);
      if (repIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", repIds)
        .eq("employee_status", "active");

      return (profiles || []).map((p) => ({
        id: p.id,
        name: p.full_name || p.email || "Unknown",
        email: p.email,
      }));
    },
  });
}
