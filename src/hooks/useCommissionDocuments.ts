import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { calculateAllFields, type CommissionDocumentData } from "@/lib/commissionDocumentCalculations";
import { logCommissionAction } from "@/hooks/useCommissionAuditLog";
import { ensurePayRunExists } from "@/hooks/usePayRuns";
import {
  determinePayRunForSubmission,
  determinePayRunForRevision,
  formatPayRunRange,
  getCurrentPayRunPeriod,
  getFridayDateStringForPeriodStart,
  getNextPayRunPeriod,
  isBeforeRevisionDeadline,
} from "@/lib/commissionPayDateCalculations";

export interface CommissionDocument {
  id: string;
  job_name_id: string;
  job_date: string;
  sales_rep: string;
  sales_rep_id: string | null;
  gross_contract_total: number;
  op_percent: number;
  contract_total_net: number;
  material_cost: number;
  labor_cost: number;
  neg_exp_1: number;
  neg_exp_2: number;
  neg_exp_3: number;
  neg_exp_4?: number; // Supplement fees (new field) - optional for DB compat
  supplement_fees_expense: number; // Legacy field for backward compat
  pos_exp_1: number;
  pos_exp_2: number;
  pos_exp_3: number;
  pos_exp_4: number;
  profit_split_label?: string | null; // Optional for DB compat
  rep_profit_percent?: number; // Optional for DB compat
  company_profit_percent?: number; // Optional for DB compat
  commission_rate: number; // Legacy field
  net_profit: number;
  rep_commission: number;
  advance_total: number;
  company_profit: number;
  starting_claim_amount: number | null;
  final_claim_amount: number | null;
  dollars_increased: number | null;
  supplement_fee: number | null;
  notes: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'manager_approved' | 'accounting_approved' | 'paid' | 'revision_required';
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_comment: string | null;
  scheduled_pay_date: string | null;
  // New workflow fields
  manager_id: string | null;
  manager_approved_at: string | null;
  manager_approved_by: string | null;
  accounting_approved_at: string | null;
  accounting_approved_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  revision_reason: string | null;
  revision_count: number;
  submitted_at: string | null;
  submitter_email: string | null;
  additional_neg_expenses: { amount: number; label?: string }[] | null;
  additional_pos_expenses: { amount: number; label?: string }[] | null;
  // Pay run & audit fields
  pay_run_id: string | null;
  install_date: string | null;
  is_friday_close: boolean;
  is_late_submission: boolean;
  is_late_revision: boolean;
  rolled_from_pay_run_id: string | null;
  // Repair commission fields
  form_type: 'standard' | 'repair';
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  repair_description: string | null;
  repair_date: string | null;
  total_repair_amount: number | null;
  repair_commission_amount: number | null;
  repair_commission_rate: number | null;
  repair_photos: string[] | null;
}

export type CommissionDocumentInsert = Omit<CommissionDocument, 
  'id' | 'created_at' | 'updated_at' | 'contract_total_net' | 'net_profit' | 
  'rep_commission' | 'company_profit' | 'dollars_increased' | 'supplement_fee' | 
  'scheduled_pay_date' | 'manager_id' | 'manager_approved_at' | 'manager_approved_by' |
  'accounting_approved_at' | 'accounting_approved_by' | 'paid_at' | 'paid_by' |
  'revision_reason' | 'revision_count' | 'submitted_at' | 'submitter_email' |
  'additional_neg_expenses' | 'additional_pos_expenses' |
  'pay_run_id' | 'is_late_submission' | 'is_late_revision' | 'rolled_from_pay_run_id' |
  'form_type' | 'customer_name' | 'customer_address' | 'customer_phone' | 'customer_email' |
  'repair_description' | 'repair_date' | 'total_repair_amount' | 'repair_commission_amount' |
  'repair_commission_rate' | 'repair_photos'
> & {
  additional_neg_expenses?: { amount: number; label?: string }[] | null;
  additional_pos_expenses?: { amount: number; label?: string }[] | null;
  install_date?: string | null;
  form_type?: 'standard' | 'repair';
  customer_name?: string | null;
  customer_address?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  repair_description?: string | null;
  repair_date?: string | null;
  total_repair_amount?: number | null;
  repair_commission_amount?: number | null;
  repair_commission_rate?: number | null;
  repair_photos?: string[] | null;
};

export function useCommissionDocuments(statusFilter?: string, formTypeFilter?: string) {
  const { user, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ['commission-documents', statusFilter, formTypeFilter, user?.id, isAdmin, isManager],
    queryFn: async () => {
      let query = supabase
        .from('commission_documents')
        .select('*')
        .order('created_at', { ascending: false });

      // User-level data isolation: return only documents created by the logged-in user
      if (!isAdmin && !isManager && user) {
        query = query.eq('created_by', user.id);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (formTypeFilter && formTypeFilter !== 'all') {
        query = query.eq('form_type', formTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown) as CommissionDocument[];
    },
    enabled: !!user,
  });
}

export function useCommissionDocument(id: string | undefined) {
  const { user, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ['commission-document', id, user?.id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('commission_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      // User-level data isolation: do not return another user's document
      if (data && !isAdmin && !isManager && data.created_by !== user!.id) {
        return null;
      }
      return (data as unknown) as CommissionDocument;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateCommissionDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<CommissionDocumentInsert, 'created_by'>) => {
      if (!user) throw new Error('Not authenticated');

      // Use neg_exp_4 if available, otherwise fall back to supplement_fees_expense
      const negExp4 = data.neg_exp_4 ?? data.supplement_fees_expense ?? 0;
      const repProfitPercent = data.rep_profit_percent ?? data.commission_rate ?? 0;

      // Server-side calculation
      const inputData: CommissionDocumentData = {
        gross_contract_total: data.gross_contract_total,
        op_percent: data.op_percent,
        material_cost: data.material_cost,
        labor_cost: data.labor_cost,
        neg_exp_1: data.neg_exp_1,
        neg_exp_2: data.neg_exp_2,
        neg_exp_3: data.neg_exp_3,
        neg_exp_4: negExp4,
        pos_exp_1: data.pos_exp_1,
        pos_exp_2: data.pos_exp_2,
        pos_exp_3: data.pos_exp_3,
        pos_exp_4: data.pos_exp_4,
        rep_profit_percent: repProfitPercent,
        advance_total: data.advance_total,
      };

      const calculated = calculateAllFields(inputData);

      // Extract company_profit_percent from data, default to complement of rep percent
      const companyProfitPercent = data.company_profit_percent ?? (1 - repProfitPercent - (data.op_percent ?? 0.15));

      const { data: result, error } = await supabase
        .from('commission_documents')
        .insert({
          ...data,
          created_by: user.id,
          neg_exp_4: negExp4,
          supplement_fees_expense: negExp4, // Keep both in sync
          rep_profit_percent: repProfitPercent,
          company_profit_percent: companyProfitPercent,
          commission_rate: repProfitPercent, // Keep legacy field in sync
          contract_total_net: calculated.contract_total_net,
          net_profit: calculated.net_profit,
          rep_commission: calculated.rep_commission,
          company_profit: calculated.company_profit,
        })
        .select()
        .single();

      if (error) throw error;

      // Notification is sent when status changes to 'submitted' via useUpdateCommissionDocumentStatus,
      // not on draft creation.

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
    },
    onError: (error) => {
      console.error('Error creating commission document:', error);
      toast.error('Failed to create commission document');
    },
  });
}

export function useUpdateCommissionDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CommissionDocument> & { id: string }) => {
      const { data: before, error: fetchErr } = await supabase
        .from('commission_documents')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      // Use neg_exp_4 if available, otherwise fall back to supplement_fees_expense
      const negExp4 = data.neg_exp_4 ?? data.supplement_fees_expense ?? 0;
      const repProfitPercent = data.rep_profit_percent ?? data.commission_rate ?? 0;

      // Server-side calculation
      const inputData: CommissionDocumentData = {
        gross_contract_total: data.gross_contract_total ?? 0,
        op_percent: data.op_percent ?? 0,
        material_cost: data.material_cost ?? 0,
        labor_cost: data.labor_cost ?? 0,
        neg_exp_1: data.neg_exp_1 ?? 0,
        neg_exp_2: data.neg_exp_2 ?? 0,
        neg_exp_3: data.neg_exp_3 ?? 0,
        neg_exp_4: negExp4,
        pos_exp_1: data.pos_exp_1 ?? 0,
        pos_exp_2: data.pos_exp_2 ?? 0,
        pos_exp_3: data.pos_exp_3 ?? 0,
        pos_exp_4: data.pos_exp_4 ?? 0,
        rep_profit_percent: repProfitPercent,
        advance_total: data.advance_total ?? 0,
      };

      const calculated = calculateAllFields(inputData);

      // Extract company_profit_percent from data
      const companyProfitPercent = data.company_profit_percent ?? (1 - repProfitPercent - (data.op_percent ?? 0.15));

      const { data: result, error } = await supabase
        .from('commission_documents')
        .update({
          ...data,
          neg_exp_4: negExp4,
          supplement_fees_expense: negExp4, // Keep both in sync
          rep_profit_percent: repProfitPercent,
          company_profit_percent: companyProfitPercent,
          commission_rate: repProfitPercent, // Keep legacy field in sync
          contract_total_net: calculated.contract_total_net,
          net_profit: calculated.net_profit,
          rep_commission: calculated.rep_commission,
          company_profit: calculated.company_profit,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (user && before) {
        const watchKeys = [
          'job_name_id', 'job_date', 'sales_rep', 'gross_contract_total', 'notes',
          'material_cost', 'labor_cost', 'neg_exp_1', 'neg_exp_2', 'neg_exp_3', 'neg_exp_4',
          'pos_exp_1', 'pos_exp_2', 'pos_exp_3', 'pos_exp_4', 'advance_total', 'install_date',
          'op_percent', 'rep_profit_percent', 'company_profit_percent',
        ] as const;
        const changed: string[] = [];
        for (const k of watchKeys) {
          if (k in data && (data as Record<string, unknown>)[k] !== undefined) {
            const prev = (before as Record<string, unknown>)[k];
            const next = (result as Record<string, unknown>)[k];
            if (JSON.stringify(prev) !== JSON.stringify(next)) changed.push(k);
          }
        }
        if (changed.length > 0) {
          const onlyNotes = changed.length === 1 && changed[0] === 'notes';
          try {
            await logCommissionAction({
              commissionId: id,
              action: onlyNotes ? 'notes_added' : 'edited',
              performedBy: user.id,
              payRunId: result.pay_run_id || null,
              details: { fields: changed },
            });
          } catch {
            /* non-blocking */
          }
        }
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      queryClient.invalidateQueries({ queryKey: ['commission-document', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['commission-audit-log', variables.id] });
    },
    onError: (error) => {
      console.error('Error updating commission document:', error);
      toast.error('Failed to update commission document');
    },
  });
}

export function useUpdateCommissionDocumentStatus() {
  const queryClient = useQueryClient();
  const { user, isManager, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      approval_comment,
      revision_reason 
    }: { 
      id: string; 
      status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'manager_approved' | 'accounting_approved' | 'paid' | 'revision_required'; 
      approval_comment?: string;
      revision_reason?: string;
      notes?: string;
    }) => {
      // Validate status transition
      const { data: currentDoc } = await supabase
        .from('commission_documents')
        .select('status, revision_count, scheduled_pay_date, pay_run_id')
        .eq('id', id)
        .single();

      // Block submissions to finalized pay runs
      if (status === 'submitted' && currentDoc?.pay_run_id) {
        const { data: payRun } = await supabase
          .from('commission_pay_runs')
          .select('status, period_start, period_end')
          .eq('id', currentDoc.pay_run_id)
          .single();
        if (payRun?.status === 'finalized') {
          throw new Error('This pay run has been finalized. Please submit for the current pay run.');
        }
      }

      const validTransitions: Record<string, string[]> = {
        draft: ['submitted'],
        submitted: ['manager_approved', 'revision_required', 'rejected'],
        revision_required: ['submitted'],
        rejected: [],
        manager_approved: ['accounting_approved', 'revision_required', 'rejected'],
        accounting_approved: ['paid', 'revision_required', 'rejected'],
        paid: [],
      };
      const allowed = validTransitions[currentDoc?.status || ''] || [];
      if (currentDoc && !allowed.includes(status)) {
        throw new Error(`Cannot transition from "${currentDoc.status}" to "${status}"`);
      }

      const updateData: Record<string, any> = { status };
      
      // Handle submission — assign pay run, pay date, late flags
      if (status === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
        updateData.revision_reason = null;

        const isResubmission = (currentDoc?.revision_count || 0) > 0;

        if (isResubmission && currentDoc?.pay_run_id) {
          // Resubmission after rejection — apply Tuesday 11:59 PM grace period
          const { data: origPayRun } = await supabase
            .from('commission_pay_runs')
            .select('period_start')
            .eq('id', currentDoc.pay_run_id)
            .single();

          const revResult = determinePayRunForRevision(origPayRun?.period_start || null);
          const payRunId = await ensurePayRunExists(revResult.periodStart);
          updateData.pay_run_id = payRunId;
          updateData.is_late_revision = revResult.isLateRevision;

          if (revResult.rolled) {
            updateData.rolled_from_pay_run_id = currentDoc.pay_run_id;
          }

          // Keep scheduled_pay_date in sync (Friday of assigned pay run)
          const { calculateResubmissionPayDate } = await import('@/lib/commissionPayDateCalculations');
          updateData.scheduled_pay_date = calculateResubmissionPayDate(currentDoc.scheduled_pay_date);
          await ensurePayRunExists(getNextPayRunPeriod(new Date()).periodStart);
        } else {
          // First submission — Friday 11:59 PM cutoff
          const subResult = determinePayRunForSubmission(new Date());
          const payRunId = await ensurePayRunExists(subResult.periodStart);
          updateData.pay_run_id = payRunId;
          updateData.is_late_submission = subResult.isLate;

          const { getScheduledPayDateString } = await import('@/lib/commissionPayDateCalculations');
          updateData.scheduled_pay_date = getScheduledPayDateString(new Date());
          await ensurePayRunExists(getNextPayRunPeriod(new Date()).periodStart);
        }

        // Get user's profile to find their manager
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('manager_id, email')
            .eq('id', user.id)
            .single();
          
          if (profile?.manager_id) {
            updateData.manager_id = profile.manager_id;
          }
          updateData.submitter_email = profile?.email || null;
        }
      }

      // Handle revision required — after Wednesday noon, roll to next pay run immediately
      if (status === 'revision_required') {
        if (!revision_reason) {
          throw new Error('Revision reason is required');
        }
        updateData.revision_reason = revision_reason;
        updateData.revision_count = ((currentDoc?.revision_count || 0) + 1);

        if (currentDoc?.pay_run_id && !isBeforeRevisionDeadline()) {
          const nextPeriod = getNextPayRunPeriod();
          const nextPayRunId = await ensurePayRunExists(nextPeriod.periodStart);
          updateData.pay_run_id = nextPayRunId;
          updateData.rolled_from_pay_run_id = currentDoc.pay_run_id;
          updateData.is_late_revision = true;
          updateData.scheduled_pay_date = getFridayDateStringForPeriodStart(nextPeriod.periodStart);
        }
      }
      
      // Handle manager approval
      if (status === 'manager_approved') {
        updateData.manager_approved_by = user?.id || null;
        updateData.manager_approved_at = new Date().toISOString();
        if (approval_comment) {
          updateData.approval_comment = approval_comment;
        }
      }

      // Handle accounting approval (pay date was already set at submission time)
      if (status === 'accounting_approved') {
        updateData.accounting_approved_by = user?.id || null;
        updateData.accounting_approved_at = new Date().toISOString();
        updateData.approved_by = user?.id || null;
        updateData.approved_at = new Date().toISOString();
        if (approval_comment) {
          updateData.approval_comment = approval_comment;
        }
        if (!currentDoc?.scheduled_pay_date) {
          const { calculateScheduledPayDate } = await import('@/lib/commissionPayDateCalculations');
          const payDate = calculateScheduledPayDate(new Date());
          updateData.scheduled_pay_date = payDate.toISOString().split('T')[0];
        }
      }

      // Handle rejected/denied status
      if (status === 'rejected') {
        if (approval_comment) {
          updateData.approval_comment = approval_comment;
        }
        updateData.revision_reason = revision_reason || approval_comment || null;
      }

      // Handle paid status
      if (status === 'paid') {
        updateData.paid_by = user?.id || null;
        updateData.paid_at = new Date().toISOString();
        if (approval_comment) {
          updateData.approval_comment = approval_comment;
        }
      }

      const { data, error } = await supabase
        .from('commission_documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // ── Audit log entries ──
      const userId = user?.id || '';
      const payRunId = (data as any).pay_run_id || null;

      try {
        if (status === 'submitted') {
          const isResub = (currentDoc?.revision_count || 0) > 0;
          if (isResub) {
            await logCommissionAction({ commissionId: id, action: 'revision_submitted', performedBy: userId, payRunId });
            if (updateData.rolled_from_pay_run_id) {
              await logCommissionAction({
                commissionId: id,
                action: 'rolled_to_next_pay_run',
                performedBy: userId,
                payRunId,
                details: {
                  from_pay_run: updateData.rolled_from_pay_run_id,
                  to_pay_run: payRunId,
                  reason: 'late_revision',
                },
              });
            }
          } else {
            await logCommissionAction({ commissionId: id, action: 'submitted', performedBy: userId, payRunId });
          }
        } else if (status === 'revision_required') {
          await logCommissionAction({
            commissionId: id,
            action: 'rejected',
            performedBy: userId,
            payRunId,
            details: { reason: revision_reason },
          });
          await logCommissionAction({
            commissionId: id,
            action: 'revision_requested',
            performedBy: userId,
            payRunId,
          });
          if (updateData.rolled_from_pay_run_id && updateData.pay_run_id) {
            await logCommissionAction({
              commissionId: id,
              action: 'rolled_to_next_pay_run',
              performedBy: userId,
              payRunId,
              details: {
                from_pay_run: updateData.rolled_from_pay_run_id,
                to_pay_run: updateData.pay_run_id,
                reason: 'revision_deadline_passed',
              },
            });
          }
        } else if (status === 'manager_approved') {
          await logCommissionAction({
            commissionId: id,
            action: 'approved',
            performedBy: userId,
            payRunId,
            details: { stage: 'compliance', comment: approval_comment || null },
          });
        } else if (status === 'accounting_approved') {
          await logCommissionAction({
            commissionId: id,
            action: 'approved',
            performedBy: userId,
            payRunId,
            details: { stage: 'accounting', comment: approval_comment || null },
          });
        } else if (status === 'rejected') {
          await logCommissionAction({
            commissionId: id,
            action: 'rejected',
            performedBy: userId,
            payRunId,
            details: { reason: revision_reason || approval_comment, final: true },
          });
        } else if (status === 'paid') {
          await logCommissionAction({ commissionId: id, action: 'paid', performedBy: userId, payRunId });
        }
      } catch (auditErr) {
        console.error('Audit log insert failed (non-blocking):', auditErr);
      }

      // ── Auto-insert commission comment for rejection/denial ──
      try {
        if (status === 'revision_required' && revision_reason && userId) {
          await (supabase.from as any)('commission_comments').insert({
            commission_id: id,
            user_id: userId,
            comment_text: revision_reason,
            comment_type: 'rejection_note',
          });
        } else if (status === 'rejected' && (approval_comment || revision_reason) && userId) {
          await (supabase.from as any)('commission_comments').insert({
            commission_id: id,
            user_id: userId,
            comment_text: approval_comment || revision_reason,
            comment_type: 'rejection_note',
          });
        }
      } catch (commentErr) {
        console.error('Commission comment insert failed (non-blocking):', commentErr);
      }

      // Send notification after successful status update
      await sendCommissionDocumentNotification((data as unknown) as CommissionDocument, status, revision_reason || approval_comment);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      queryClient.invalidateQueries({ queryKey: ['commission-document', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['commission-audit-log', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['pay-run-commissions'] });
      if (variables.status === 'submitted') {
        toast.success('Commission Submitted');
      } else {
        const statusLabel = variables.status === 'revision_required' || variables.status === 'rejected' 
          ? 'rejected' 
          : variables.status.replace(/_/g, ' ');
        toast.success(`Commission document ${statusLabel}`);
      }
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    },
  });
}

// Admin-only: delete commission document. Non-admin users cannot delete.
export function useDeleteCommissionDocument() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !isAdmin) throw new Error('Only admins can delete commission documents');

      const { error } = await supabase
        .from('commission_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      toast.success('Commission document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete commission document: ' + error.message);
    },
  });
}

// Helper function to send notifications based on status
async function sendCommissionDocumentNotification(
  doc: CommissionDocument,
  status: string,
  revisionReason?: string
) {
  try {
    // Get the creator's profile for the submitter info
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', doc.created_by)
      .single();

    // Map statuses to notification types
    const notificationTypeMap: Record<string, string> = {
      'submitted': 'submitted',
      'manager_approved': 'manager_approved',
      'accounting_approved': 'accounting_approved',
      'paid': 'paid',
      'revision_required': 'rejected',
      'rejected': 'denied',
    };

    const notificationType = notificationTypeMap[status];
    if (!notificationType) return; // No notification for this status

    // Get current user's name for "changed_by"
    const { data: { user } } = await supabase.auth.getUser();
    let changedByName = 'System';
    if (user) {
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      changedByName = currentUserProfile?.full_name || 'Unknown';
    }

    const period = getCurrentPayRunPeriod();
    const nextPeriod = getNextPayRunPeriod();
    const payRunPeriodLabel = formatPayRunRange(period.periodStart, period.periodEnd);
    const rolledOnReject = status === 'revision_required' && !!doc.rolled_from_pay_run_id;

    const payload: Record<string, unknown> = {
      notification_type: notificationType,
      document_type: 'commission_document',
      commission_id: doc.id,
      job_name: doc.job_name_id,
      job_address: doc.job_name_id,
      sales_rep_name: doc.sales_rep,
      subcontractor_name: null,
      submission_type: 'employee',
      contract_amount: doc.gross_contract_total,
      net_commission_owed: doc.rep_commission,
      submitter_email: creatorProfile?.email || doc.submitter_email,
      submitter_name: creatorProfile?.full_name || doc.sales_rep,
      status: status,
      notes: revisionReason || null,
      changed_by_name: changedByName,
      scheduled_pay_date: doc.scheduled_pay_date,
    };

    if (status === 'revision_required') {
      payload.pay_run_period_label = payRunPeriodLabel;
      payload.revision_deadline_text = period.revisionDeadlineDisplay;
      payload.revision_resubmit_reminder =
        'Please resubmit by Wednesday 12:00 PM MST to stay in the current pay run when the revision deadline has not passed.';
      payload.commission_pay_run_context = rolledOnReject
        ? `This commission has been moved to the next pay run (${formatPayRunRange(nextPeriod.periodStart, nextPeriod.periodEnd)}) because the revision deadline has passed.`
        : `Current pay run: ${payRunPeriodLabel}.`;
      payload.rolled_to_next_pay_run_on_reject = rolledOnReject;
    }

    await supabase.functions.invoke('send-commission-notification', {
      body: payload,
    });
  } catch (error) {
    console.error('Failed to send commission notification:', error);
    // Don't throw - notification failure shouldn't block the main operation
  }
}
