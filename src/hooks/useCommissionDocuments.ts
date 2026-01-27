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
  neg_exp_4: number; // Supplement fees (new field)
  supplement_fees_expense: number; // Legacy field for backward compat
  pos_exp_1: number;
  pos_exp_2: number;
  pos_exp_3: number;
  pos_exp_4: number;
  profit_split_label: string | null;
  rep_profit_percent: number;
  company_profit_percent: number;
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
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_comment: string | null;
}

export type CommissionDocumentInsert = Omit<CommissionDocument, 'id' | 'created_at' | 'updated_at' | 'contract_total_net' | 'net_profit' | 'rep_commission' | 'company_profit' | 'dollars_increased' | 'supplement_fee'>;

export function useCommissionDocuments(statusFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commission-documents', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('commission_documents')
        .select('*')
        .order('created_at', { ascending: false });

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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commission-document', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('commission_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
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

      const { data: result, error } = await supabase
        .from('commission_documents')
        .insert({
          ...data,
          created_by: user.id,
          neg_exp_4: negExp4,
          supplement_fees_expense: negExp4, // Keep both in sync
          rep_profit_percent: repProfitPercent,
          commission_rate: repProfitPercent, // Keep legacy field in sync
          contract_total_net: calculated.contract_total_net,
          net_profit: calculated.net_profit,
          rep_commission: calculated.rep_commission,
          company_profit: calculated.company_profit,
        })
        .select()
        .single();

      if (error) throw error;
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

      const { data: result, error } = await supabase
        .from('commission_documents')
        .update({
          ...data,
          neg_exp_4: negExp4,
          supplement_fees_expense: negExp4, // Keep both in sync
          rep_profit_percent: repProfitPercent,
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status, approval_comment }: { id: string; status: 'draft' | 'submitted' | 'approved' | 'rejected'; approval_comment?: string }) => {
      const updateData: Partial<CommissionDocument> = { status };
      
      if (status === 'approved' || status === 'rejected') {
        updateData.approved_by = user?.id || null;
        updateData.approved_at = new Date().toISOString();
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
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-documents'] });
      queryClient.invalidateQueries({ queryKey: ['commission-document', variables.id] });
      toast.success(`Commission document ${variables.status}`);
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    },
  });
}
