import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  calculateAllFields,
  validateCommissionDocument,
  PROFIT_SPLIT_OPTIONS,
  OP_PERCENT_OPTIONS,
  getProfitSplitFromLabel,
  generateProfitSplitOptions,
  filterOpPercentOptions,
  type CommissionDocumentData,
} from "@/lib/commissionDocumentCalculations";
import { 
  useCreateCommissionDocument, 
  useUpdateCommissionDocument,
  type CommissionDocument 
} from "@/hooks/useCommissionDocuments";
import { useUserCommissionTier } from "@/hooks/useCommissionTiers";
import { toast } from "sonner";

// Form sub-components
import {
  useCurrencyInput,
  JobInfoSection,
  ContractSection,
  ExpensesSection,
  NEGATIVE_EXPENSES,
  POSITIVE_EXPENSES,
  ProfitSplitSection,
  CommissionSummarySection,
  NotesSection,
  FormActions,
} from "./form";

interface CommissionDocumentFormProps {
  document?: CommissionDocument;
  readOnly?: boolean;
}

export function CommissionDocumentForm({ document, readOnly = false }: CommissionDocumentFormProps) {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const createMutation = useCreateCommissionDocument();
  const updateMutation = useUpdateCommissionDocument();
  
  // Fetch user profile for auto-populating sales rep name
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Fetch the current user's commission tier
  const { data: userTier, isLoading: tierLoading } = useUserCommissionTier(user?.id);
  
  const isPrivileged = isAdmin || isManager;

  // Get allowed options based on user's tier (admins/managers see all options)
  const { availableOpOptions, availableProfitSplitOptions, defaultProfitSplit } = useMemo(() => {
    if (isPrivileged) {
      return {
        availableOpOptions: OP_PERCENT_OPTIONS,
        availableProfitSplitOptions: PROFIT_SPLIT_OPTIONS,
        defaultProfitSplit: PROFIT_SPLIT_OPTIONS[1],
      };
    }
    
    if (userTier?.tier) {
      const tier = userTier.tier;
      const opOptions = filterOpPercentOptions(tier.allowed_op_percentages);
      const profitSplitOptions = generateProfitSplitOptions(
        tier.allowed_op_percentages,
        tier.allowed_profit_splits
      );
      
      return {
        availableOpOptions: opOptions,
        availableProfitSplitOptions: profitSplitOptions,
        defaultProfitSplit: profitSplitOptions[0] || PROFIT_SPLIT_OPTIONS[1],
      };
    }
    
    return {
      availableOpOptions: OP_PERCENT_OPTIONS,
      availableProfitSplitOptions: PROFIT_SPLIT_OPTIONS,
      defaultProfitSplit: PROFIT_SPLIT_OPTIONS[1],
    };
  }, [userTier, isPrivileged]);

  // Form state
  const [formData, setFormData] = useState(() => ({
    job_name_id: document?.job_name_id ?? "",
    job_date: document?.job_date ?? "",
    sales_rep: document?.sales_rep ?? "",
    sales_rep_id: document?.sales_rep_id ?? user?.id ?? null,
    gross_contract_total: document?.gross_contract_total ?? 0,
    op_percent: document?.op_percent ?? 0.15,
    material_cost: document?.material_cost ?? 0,
    labor_cost: document?.labor_cost ?? 0,
    neg_exp_1: document?.neg_exp_1 ?? 0,
    neg_exp_2: document?.neg_exp_2 ?? 0,
    neg_exp_3: document?.neg_exp_3 ?? 0,
    neg_exp_4: document?.neg_exp_4 ?? document?.supplement_fees_expense ?? 0,
    pos_exp_1: document?.pos_exp_1 ?? 0,
    pos_exp_2: document?.pos_exp_2 ?? 0,
    pos_exp_3: document?.pos_exp_3 ?? 0,
    pos_exp_4: document?.pos_exp_4 ?? 0,
    profit_split_label: document?.profit_split_label ?? "15/40/60",
    rep_profit_percent: document?.rep_profit_percent ?? 0.40,
    company_profit_percent: document?.company_profit_percent ?? 0.60,
    advance_total: document?.advance_total ?? 0,
    notes: document?.notes ?? "",
  }));

  // Currency input handling
  const { handleFocus, handleChange, commitValue, getDisplayValue } = useCurrencyInput();

  const handleMoneyCommit = useCallback((field: string) => {
    commitValue(field, (f, value) => {
      setFormData(prev => ({ ...prev, [f]: value }));
    });
  }, [commitValue]);

  // Auto-populate sales rep name when profile loads (only for new documents)
  useEffect(() => {
    if (!document && userProfile?.full_name && !formData.sales_rep) {
      setFormData(prev => ({
        ...prev,
        sales_rep: userProfile.full_name,
        sales_rep_id: user?.id ?? null,
      }));
    }
  }, [userProfile, document, user, formData.sales_rep]);

  // Set default profit split based on tier (only for new documents)
  useEffect(() => {
    if (!document && !tierLoading && defaultProfitSplit) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: defaultProfitSplit.label,
        op_percent: defaultProfitSplit.op,
        rep_profit_percent: defaultProfitSplit.rep,
        company_profit_percent: defaultProfitSplit.company,
      }));
    }
  }, [defaultProfitSplit, tierLoading, document]);

  // Handle profit split change
  const handleProfitSplitChange = useCallback((label: string) => {
    const dynamicSplit = availableProfitSplitOptions.find(opt => opt.label === label);
    if (dynamicSplit) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: label,
        op_percent: dynamicSplit.op,
        rep_profit_percent: dynamicSplit.rep,
        company_profit_percent: dynamicSplit.company,
      }));
      return;
    }
    
    const staticSplit = getProfitSplitFromLabel(label);
    if (staticSplit) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: label,
        op_percent: staticSplit.op,
        rep_profit_percent: staticSplit.rep,
        company_profit_percent: staticSplit.company,
      }));
    }
  }, [availableProfitSplitOptions]);

  // Handle O&P change
  const handleOpPercentChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, op_percent: parseFloat(value) }));
  }, []);

  // Live calculations
  const calculated = useMemo(() => {
    const inputData: CommissionDocumentData = {
      gross_contract_total: formData.gross_contract_total,
      op_percent: formData.op_percent,
      material_cost: formData.material_cost,
      labor_cost: formData.labor_cost,
      neg_exp_1: formData.neg_exp_1,
      neg_exp_2: formData.neg_exp_2,
      neg_exp_3: formData.neg_exp_3,
      neg_exp_4: formData.neg_exp_4,
      pos_exp_1: formData.pos_exp_1,
      pos_exp_2: formData.pos_exp_2,
      pos_exp_3: formData.pos_exp_3,
      pos_exp_4: formData.pos_exp_4,
      rep_profit_percent: formData.rep_profit_percent,
      advance_total: formData.advance_total,
    };
    return calculateAllFields(inputData);
  }, [formData]);

  // Save handler
  const handleSave = useCallback(async (submit: boolean = false) => {
    const validation = validateCommissionDocument({
      ...formData,
      job_name_id: formData.job_name_id,
      job_date: formData.job_date,
      sales_rep: formData.sales_rep,
      profit_split_label: formData.profit_split_label,
    });

    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    const payload = {
      job_name_id: formData.job_name_id,
      job_date: formData.job_date,
      sales_rep: formData.sales_rep,
      sales_rep_id: null,
      gross_contract_total: formData.gross_contract_total,
      op_percent: formData.op_percent,
      material_cost: formData.material_cost,
      labor_cost: formData.labor_cost,
      neg_exp_1: formData.neg_exp_1,
      neg_exp_2: formData.neg_exp_2,
      neg_exp_3: formData.neg_exp_3,
      neg_exp_4: formData.neg_exp_4,
      supplement_fees_expense: formData.neg_exp_4,
      pos_exp_1: formData.pos_exp_1,
      pos_exp_2: formData.pos_exp_2,
      pos_exp_3: formData.pos_exp_3,
      pos_exp_4: formData.pos_exp_4,
      profit_split_label: formData.profit_split_label,
      rep_profit_percent: formData.rep_profit_percent,
      company_profit_percent: formData.company_profit_percent,
      commission_rate: formData.rep_profit_percent,
      advance_total: formData.advance_total,
      notes: formData.notes,
      status: submit ? 'submitted' as const : 'draft' as const,
      approved_by: null,
      approved_at: null,
      approval_comment: null,
      starting_claim_amount: null,
      final_claim_amount: null,
    };

    if (document?.id) {
      await updateMutation.mutateAsync({ id: document.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate('/commission-documents');
  }, [formData, document, createMutation, updateMutation, navigate]);

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canEdit = !readOnly && (!document || document.status === 'draft');

  // Expense values for section components
  const expenseValues = {
    neg_exp_1: formData.neg_exp_1,
    neg_exp_2: formData.neg_exp_2,
    neg_exp_3: formData.neg_exp_3,
    neg_exp_4: formData.neg_exp_4,
    pos_exp_1: formData.pos_exp_1,
    pos_exp_2: formData.pos_exp_2,
    pos_exp_3: formData.pos_exp_3,
    pos_exp_4: formData.pos_exp_4,
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/commission-documents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        {document?.id && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/commission-documents/${document.id}/print`)}>
            <Printer className="h-4 w-4 mr-2" />
            Print View
          </Button>
        )}
      </div>

      {/* Missing tier warning */}
      {!isPrivileged && !tierLoading && !userTier?.tier && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Commission Tier Assigned</AlertTitle>
          <AlertDescription>
            You do not have a commission tier assigned. Please contact your manager or admin to have your tier set up before submitting commissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Tier info banner */}
      {userTier?.tier && (
        <Alert>
          <AlertTitle>Commission Tier: {userTier.tier.name}</AlertTitle>
          <AlertDescription>
            {userTier.tier.description || 'Your available O&P and profit split options are based on your assigned tier.'}
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 py-4">
          <CardTitle className="text-lg sm:text-xl text-center font-semibold">
            TSM Roofing LLC Official Commission Document
          </CardTitle>
          {document?.status && (
            <div className="text-center">
              <Badge variant={document.status === 'approved' ? 'default' : document.status === 'rejected' ? 'destructive' : 'secondary'}>
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-1">
            <JobInfoSection
              jobNameId={formData.job_name_id}
              jobDate={formData.job_date}
              salesRep={formData.sales_rep}
              canEdit={canEdit}
              isPrivileged={isPrivileged}
              onJobNameIdChange={(v) => setFormData(prev => ({ ...prev, job_name_id: v }))}
              onJobDateChange={(v) => setFormData(prev => ({ ...prev, job_date: v }))}
              onSalesRepChange={(v) => setFormData(prev => ({ ...prev, sales_rep: v }))}
            />

            <ContractSection
              grossContractTotal={formData.gross_contract_total}
              opPercent={formData.op_percent}
              opAmount={calculated.op_amount}
              contractTotalNet={calculated.contract_total_net}
              materialCost={formData.material_cost}
              laborCost={formData.labor_cost}
              canEdit={canEdit}
              tierLoading={tierLoading}
              tierName={userTier?.tier?.name}
              availableOpOptions={[...availableOpOptions]}
              getDisplayValue={getDisplayValue}
              onMoneyFocus={handleFocus}
              onMoneyChange={handleChange}
              onMoneyCommit={handleMoneyCommit}
              onOpPercentChange={handleOpPercentChange}
            />

            <ExpensesSection
              title="Additional Expenses (-)"
              variant="negative"
              expenses={NEGATIVE_EXPENSES}
              values={expenseValues}
              canEdit={canEdit}
              getDisplayValue={getDisplayValue}
              onMoneyFocus={handleFocus}
              onMoneyChange={handleChange}
              onMoneyCommit={handleMoneyCommit}
            />

            <ExpensesSection
              title="Additional Expenses (+)"
              variant="positive"
              expenses={POSITIVE_EXPENSES}
              values={expenseValues}
              canEdit={canEdit}
              getDisplayValue={getDisplayValue}
              onMoneyFocus={handleFocus}
              onMoneyChange={handleChange}
              onMoneyCommit={handleMoneyCommit}
            />

            <ProfitSplitSection
              profitSplitLabel={formData.profit_split_label}
              repProfitPercent={formData.rep_profit_percent}
              canEdit={canEdit}
              tierLoading={tierLoading}
              tierName={userTier?.tier?.name}
              availableProfitSplitOptions={[...availableProfitSplitOptions]}
              onProfitSplitChange={handleProfitSplitChange}
            />

            <CommissionSummarySection
              netProfit={calculated.net_profit}
              repCommission={calculated.rep_commission}
              advanceTotal={formData.advance_total}
              companyProfit={calculated.company_profit}
              canEdit={canEdit}
              isPrivileged={isPrivileged}
              getDisplayValue={getDisplayValue}
              onMoneyFocus={handleFocus}
              onMoneyChange={handleChange}
              onMoneyCommit={handleMoneyCommit}
            />

            <NotesSection
              notes={formData.notes}
              canEdit={canEdit}
              onNotesChange={(v) => setFormData(prev => ({ ...prev, notes: v }))}
            />
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <FormActions
              isLoading={isLoading}
              onSaveDraft={() => handleSave(false)}
              onSubmit={() => handleSave(true)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
