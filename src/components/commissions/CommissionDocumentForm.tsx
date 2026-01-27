import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Save, Send, ArrowLeft, AlertTriangle, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  calculateAllFields, 
  formatCurrency, 
  validateCommissionDocument,
  PROFIT_SPLIT_OPTIONS,
  OP_PERCENT_OPTIONS,
  getProfitSplitFromLabel,
  type CommissionDocumentData 
} from "@/lib/commissionDocumentCalculations";
import { 
  useCreateCommissionDocument, 
  useUpdateCommissionDocument,
  type CommissionDocument 
} from "@/hooks/useCommissionDocuments";
import { toast } from "sonner";

interface CommissionDocumentFormProps {
  document?: CommissionDocument;
  readOnly?: boolean;
}

// Shared input classes
const inputBaseClasses = "transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";
const numberInputClasses = `font-mono tracking-wide tabular-nums ${inputBaseClasses}`;
const calculatedInputClasses = "font-mono tracking-wide tabular-nums bg-muted text-base";

export function CommissionDocumentForm({ document, readOnly = false }: CommissionDocumentFormProps) {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const createMutation = useCreateCommissionDocument();
  const updateMutation = useUpdateCommissionDocument();
  
  const isPrivileged = isAdmin || isManager;

  const [formData, setFormData] = useState(() => ({
    job_name_id: document?.job_name_id ?? "",
    job_date: document?.job_date ?? "",
    sales_rep: document?.sales_rep ?? "",
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

  // When profit split changes, update the related percentages
  const handleProfitSplitChange = (label: string) => {
    const split = getProfitSplitFromLabel(label);
    if (split) {
      setFormData(prev => ({
        ...prev,
        profit_split_label: label,
        op_percent: split.op,
        rep_profit_percent: split.rep,
        company_profit_percent: split.company,
      }));
    }
  };

  // When O&P changes independently, keep the profit split percentages
  const handleOpPercentChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      op_percent: parseFloat(value),
    }));
  };

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

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async (submit: boolean = false) => {
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
      supplement_fees_expense: formData.neg_exp_4, // Keep in sync
      pos_exp_1: formData.pos_exp_1,
      pos_exp_2: formData.pos_exp_2,
      pos_exp_3: formData.pos_exp_3,
      pos_exp_4: formData.pos_exp_4,
      profit_split_label: formData.profit_split_label,
      rep_profit_percent: formData.rep_profit_percent,
      company_profit_percent: formData.company_profit_percent,
      commission_rate: formData.rep_profit_percent, // Keep legacy field in sync
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
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canEdit = !readOnly && (!document || document.status === 'draft');

  // Form row component
  const FormRow = ({ 
    label, 
    children, 
    hint, 
    variant = 'default',
    highlight = false 
  }: { 
    label: React.ReactNode; 
    children: React.ReactNode; 
    hint?: string;
    variant?: 'default' | 'negative' | 'positive' | 'calculated';
    highlight?: boolean;
  }) => {
    const variantClasses = {
      default: 'hover:bg-muted/20',
      negative: 'hover:bg-destructive/5',
      positive: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      calculated: 'bg-muted/30 rounded-md',
    };
    
    return (
      <div className={`py-3 sm:py-2 border-b transition-colors ${variantClasses[variant]} ${highlight ? 'bg-emerald-50 dark:bg-emerald-900/20 rounded-lg' : ''}`}>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_180px_1fr] sm:gap-3 sm:items-center">
          <Label className={`font-medium text-sm sm:text-base ${variant === 'negative' ? 'text-destructive' : ''} ${variant === 'positive' ? 'text-emerald-600' : ''}`}>
            {label}
          </Label>
          <div className="w-full sm:w-auto">{children}</div>
          {hint && <span className="text-xs sm:text-sm text-muted-foreground hidden lg:block">{hint}</span>}
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-1 lg:hidden">{hint}</p>}
      </div>
    );
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
            {/* Job Information Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
                Job Information
              </h3>
              
              <FormRow label="Job Name & ID">
                <Input
                  value={formData.job_name_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_name_id: e.target.value }))}
                  disabled={!canEdit}
                  className={inputBaseClasses}
                  placeholder="Enter job name or ID"
                  required
                />
              </FormRow>
              
              <FormRow label="Job Date">
                <Input
                  type="date"
                  value={formData.job_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_date: e.target.value }))}
                  disabled={!canEdit}
                  className={inputBaseClasses}
                  required
                />
              </FormRow>
              
              <FormRow label="Sales Rep">
                <Input
                  value={formData.sales_rep}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_rep: e.target.value }))}
                  disabled={!canEdit}
                  className={inputBaseClasses}
                  placeholder="Enter sales rep name"
                  required
                />
              </FormRow>
            </div>

            {/* Contract Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
                Contract & Expense Inputs
              </h3>
              
              <FormRow label="Contract Total (Gross)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gross_contract_total || ''}
                  onChange={(e) => handleNumberChange('gross_contract_total', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                  required
                />
              </FormRow>

              <FormRow label="O&P %" hint="Select O&P %, options: 10%, 12.5%, 15%">
                <Select
                  value={formData.op_percent.toString()}
                  onValueChange={handleOpPercentChange}
                  disabled={!canEdit}
                >
                  <SelectTrigger className={`${inputBaseClasses} font-mono`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OP_PERCENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>

              <FormRow label={<span className="flex items-center gap-1">O&P $ Amount <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated">
                <Input
                  value={formatCurrency(calculated.op_amount)}
                  disabled
                  className={calculatedInputClasses}
                />
              </FormRow>

              <FormRow label={<span className="flex items-center gap-1">Contract Total (Net) <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated" hint="Commissions and expenses calculated off of Net contract total.">
                <Input
                  value={formatCurrency(calculated.contract_total_net)}
                  disabled
                  className={calculatedInputClasses}
                />
              </FormRow>
            </div>

            {/* Direct Costs */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
                Direct Costs
              </h3>
              
              <FormRow label="Material" hint="Initial Material order">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.material_cost || ''}
                  onChange={(e) => handleNumberChange('material_cost', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                  required
                />
              </FormRow>

              <FormRow label="Labor" hint="Initial Labor Order">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.labor_cost || ''}
                  onChange={(e) => handleNumberChange('labor_cost', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                  required
                />
              </FormRow>
            </div>

            {/* Additional Expenses (Negative) */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3 border-b pb-2">
                Additional Expenses (-)
              </h3>
              
              <FormRow label="Additional expenses (-) #1" variant="negative" hint="Will calls, lumber, Home Depot, Misc. expenses">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_1 || ''}
                  onChange={(e) => handleNumberChange('neg_exp_1', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Additional expenses (-) #2" variant="negative" hint="Will calls, lumber, Home Depot, Misc. expenses">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_2 || ''}
                  onChange={(e) => handleNumberChange('neg_exp_2', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Additional expenses (-) #3" variant="negative" hint="Will calls, lumber, Home Depot, Misc. expenses">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_3 || ''}
                  onChange={(e) => handleNumberChange('neg_exp_3', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Additional expenses (-) #4" variant="negative" hint="Supplement fees">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_4 || ''}
                  onChange={(e) => handleNumberChange('neg_exp_4', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>
            </div>

            {/* Additional Expenses (Positive) */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3 border-b pb-2">
                Additional Expenses (+)
              </h3>
              
              <FormRow label="Additional expenses (+) #1" variant="positive" hint="Returns added back if rep returns materials">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_1 || ''}
                  onChange={(e) => handleNumberChange('pos_exp_1', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Additional expenses (+) #2" variant="positive">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_2 || ''}
                  onChange={(e) => handleNumberChange('pos_exp_2', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Additional expenses (+) #3" variant="positive">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_3 || ''}
                  onChange={(e) => handleNumberChange('pos_exp_3', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Additional expenses (+) #4" variant="positive">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_4 || ''}
                  onChange={(e) => handleNumberChange('pos_exp_4', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>
            </div>

            {/* Profit Split */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
                Profit Split
              </h3>
              
              <FormRow label="Profit Split" hint="Selecting a split sets O&P%, Rep%, and Company%">
                <Select
                  value={formData.profit_split_label}
                  onValueChange={handleProfitSplitChange}
                  disabled={!canEdit}
                >
                  <SelectTrigger className={`${inputBaseClasses} font-mono`}>
                    <SelectValue placeholder="Select profit split" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFIT_SPLIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.label} value={opt.label}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>

              <FormRow label={<span className="flex items-center gap-1">Rep Profit % <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated">
                <Input
                  value={`${(formData.rep_profit_percent * 100).toFixed(0)}%`}
                  disabled
                  className={calculatedInputClasses}
                />
              </FormRow>
            </div>

            {/* Commission Summary */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 border-b pb-2">
                Commission Summary
              </h3>
              
              <FormRow label={<span className="flex items-center gap-1">Net Profit <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated" hint="This is the Commissionable profit on the job, calculated off the net contract after O&P is removed.">
                <Input
                  value={formatCurrency(calculated.net_profit)}
                  disabled
                  className={calculatedInputClasses}
                />
              </FormRow>

              <FormRow label={<span className="flex items-center gap-1 font-semibold">Rep Commission <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated" highlight hint="This is the total dollars paid to rep">
                <Input
                  value={formatCurrency(calculated.rep_commission)}
                  disabled
                  className={`${calculatedInputClasses} font-bold text-lg`}
                />
              </FormRow>

              <FormRow label="Advance Total">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.advance_total || ''}
                  onChange={(e) => handleNumberChange('advance_total', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              {isPrivileged && (
                <FormRow label={<span className="flex items-center gap-1">Company Profit <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated" hint="Total Company profit, not rep facing">
                  <Input
                    value={formatCurrency(calculated.company_profit)}
                    disabled
                    className={calculatedInputClasses}
                  />
                </FormRow>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">
                Notes
              </h3>
              
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={!canEdit}
                className={inputBaseClasses}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isLoading}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isLoading}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
