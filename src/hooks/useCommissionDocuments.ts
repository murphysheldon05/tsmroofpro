import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { calculateAllFields, type CommissionDocumentData } from "@/lib/commissionDocumentCalculations";

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
}

export type CommissionDocumentInsert = Omit<CommissionDocument, 
  'id' | 'created_at' | 'updated_at' | 'contract_total_net' | 'net_profit' | 
  'rep_commission' | 'company_profit' | 'dollars_increased' | 'supplement_fee' | 
  'scheduled_pay_date' | 'manager_id' | 'manager_approved_at' | 'manager_approved_by' |
  'accounting_approved_at' | 'accounting_approved_by' | 'paid_at' | 'paid_by' |
  'revision_reason' | 'revision_count' | 'submitted_at' | 'submitter_email'
>;

export function useCommissionDocuments(statusFilter?: string) {
  const { user, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ['commission-documents', statusFilter, user?.id, isAdmin, isManager],
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

      const { data, error } = await query;

      if (error) throw error;
      return data as CommissionDocument[];
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
      return data as CommissionDocument;
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

      // Send notification on creation
      try {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .single();

        await supabase.functions.invoke('send-commission-notification', {
          body: {
            notification_type: 'submitted',
            document_type: 'commission_document',
            commission_id: result.id,
            job_name: data.job_name_id || '',
            job_address: data.job_name_id || '',
            sales_rep_name: data.sales_rep || '',
            subcontractor_name: null,
            submission_type: 'employee',
            contract_amount: data.gross_contract_total || 0,
            net_commission_owed: result.rep_commission || 0,
            submitter_email: creatorProfile?.email || '',
            submitter_name: creatorProfile?.full_name || data.sales_rep || '',
          },
        });
      } catch (notifyError) {
        console.error('Failed to send commission document notification:', notifyError);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      toast.success('Commission document created successfully');
    },
    onError: (error) => {
      console.error('Error creating commission document:', error);
      toast.error('Failed to create commission document');
    },
  });
}

export function useUpdateCommissionDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CommissionDocument> & { id: string }) => {
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
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      queryClient.invalidateQueries({ queryKey: ['commission-document', variables.id] });
      toast.success('Commission document updated successfully');
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
      const updateData: Record<string, any> = { status };
      
      // Handle submission - fetch manager from profile
      if (status === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
        
        // Clear revision/rejection data on resubmission
        updateData.revision_reason = null;
        
        // Get user's profile to find their manager
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('manager_id, email')
            .eq('id', user.id)
            .single();
          
          // Check if submitter is a sales_manager or admin — self-commission prevention
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          const isSubmitterSalesManager = roleData?.role === 'sales_manager';
          const isSubmitterAdmin = roleData?.role === 'admin';
          
          if (isSubmitterAdmin) {
            // Admin submission — skip manager approval, go straight to accounting
            updateData.manager_id = null;
            updateData.manager_approved_by = user.id;
            updateData.manager_approved_at = new Date().toISOString();
          } else if (isSubmitterSalesManager) {
            // Sales Manager self-submission — route to Admin for review (can't approve own)
            updateData.manager_id = null; // No specific manager — Admin will pick it up
          } else if (profile?.manager_id) {
            updateData.manager_id = profile.manager_id;
          }
          updateData.submitter_email = profile?.email || null;
        }
      }

      // Handle revision required
      if (status === 'revision_required') {
        if (!revision_reason) {
          throw new Error('Revision reason is required');
        }
        updateData.revision_reason = revision_reason;
        // Get current revision count and increment
        const { data: currentDoc } = await supabase
          .from('commission_documents')
          .select('revision_count')
          .eq('id', id)
          .single();
        updateData.revision_count = ((currentDoc?.revision_count || 0) + 1);
      }
      
      // Handle manager approval
      if (status === 'manager_approved') {
        updateData.manager_approved_by = user?.id || null;
        updateData.manager_approved_at = new Date().toISOString();
        if (approval_comment) {
          updateData.approval_comment = approval_comment;
        }
      }

      // Calculate scheduled pay date when accounting approves
      if (status === 'accounting_approved') {
        updateData.accounting_approved_by = user?.id || null;
        updateData.accounting_approved_at = new Date().toISOString();
        updateData.approved_by = user?.id || null;
        updateData.approved_at = new Date().toISOString();
        if (approval_comment) {
          updateData.approval_comment = approval_comment;
        }
        // Calculate the Friday pay date based on Tue 3 PM MST rule
        const { calculateScheduledPayDate } = await import('@/lib/commissionPayDateCalculations');
        const payDate = calculateScheduledPayDate(new Date());
        updateData.scheduled_pay_date = payDate.toISOString().split('T')[0]; // YYYY-MM-DD format
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
      
      // Send notification after successful status update
      await sendCommissionDocumentNotification(data as CommissionDocument, status, revision_reason || approval_comment);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      queryClient.invalidateQueries({ queryKey: ['commission-document', variables.id] });
      const statusLabel = variables.status === 'revision_required' || variables.status === 'rejected' 
        ? 'rejected' 
        : variables.status.replace(/_/g, ' ');
      toast.success(`Commission document ${statusLabel}`);
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
      'revision_required': 'revision_required',
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

    const payload = {
      notification_type: notificationType,
      document_type: 'commission_document',
      commission_id: doc.id,
      job_name: doc.job_name_id,
      job_address: doc.job_name_id, // Using job_name_id as we don't have separate address
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

    await supabase.functions.invoke('send-commission-notification', {
      body: payload,
    });
  } catch (error) {
    console.error('Failed to send commission notification:', error);
    // Don't throw - notification failure shouldn't block the main operation
  }
}
