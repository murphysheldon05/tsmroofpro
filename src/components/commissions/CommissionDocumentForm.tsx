import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Save, Send, ArrowLeft, AlertTriangle, Award, Percent, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  calculateAllFields, 
  formatCurrency, 
  validateCommissionDocument,
  type CommissionDocumentData 
} from "@/lib/commissionDocumentCalculations";
import { 
  useCreateCommissionDocument, 
  useUpdateCommissionDocument,
  type CommissionDocument 
} from "@/hooks/useCommissionDocuments";
import { useUserCommissionTier } from "@/hooks/useCommissionTiers";
import { toast } from "sonner";

interface CommissionDocumentFormProps {
  document?: CommissionDocument;
  readOnly?: boolean;
}

// Shared input classes for interactive feel
const inputBaseClasses = "transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";
const numberInputClasses = `font-financial tracking-wide tabular-nums ${inputBaseClasses}`;
const calculatedInputClasses = "font-financial tracking-wide tabular-nums bg-muted transition-all duration-300 text-base";

export function CommissionDocumentForm({ document, readOnly = false }: CommissionDocumentFormProps) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const createMutation = useCreateCommissionDocument();
  const updateMutation = useUpdateCommissionDocument();
  
  // Collapsible sections for mobile
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [creditsOpen, setCreditsOpen] = useState(true);
  
  // Fetch user's commission tier
  const { data: userTier, isLoading: tierLoading } = useUserCommissionTier(user?.id);
  
  // Determine allowed options based on tier (admins/managers bypass tier restrictions)
  const isPrivileged = role === 'admin' || role === 'manager';
  const hasTier = !!userTier?.tier;
  
  const allowedOpPercentages = useMemo(() => {
    if (isPrivileged || !userTier?.tier) {
      return [0.10, 0.125, 0.15]; // Default options for privileged or unassigned
    }
    return userTier.tier.allowed_op_percentages;
  }, [userTier, isPrivileged]);
  
  const allowedProfitSplits = useMemo(() => {
    if (isPrivileged || !userTier?.tier) {
      return [0.35, 0.40, 0.45, 0.50, 0.55, 0.60]; // Default options
    }
    return userTier.tier.allowed_profit_splits;
  }, [userTier, isPrivileged]);

  const [formData, setFormData] = useState(() => ({
    job_name_id: document?.job_name_id ?? "",
    job_date: document?.job_date ?? "",
    sales_rep: document?.sales_rep ?? "",
    gross_contract_total: document?.gross_contract_total ?? 0,
    op_percent: document?.op_percent ?? (allowedOpPercentages[0] || 0.10),
    material_cost: document?.material_cost ?? 0,
    labor_cost: document?.labor_cost ?? 0,
    neg_exp_1: document?.neg_exp_1 ?? 0,
    neg_exp_2: document?.neg_exp_2 ?? 0,
    neg_exp_3: document?.neg_exp_3 ?? 0,
    supplement_fees_expense: document?.supplement_fees_expense ?? 0,
    pos_exp_1: document?.pos_exp_1 ?? 0,
    pos_exp_2: document?.pos_exp_2 ?? 0,
    pos_exp_3: document?.pos_exp_3 ?? 0,
    pos_exp_4: document?.pos_exp_4 ?? 0,
    commission_rate: document?.commission_rate ?? (allowedProfitSplits[0] || 0.40),
    advance_total: document?.advance_total ?? 0,
    notes: document?.notes ?? "",
  }));

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
      supplement_fees_expense: formData.supplement_fees_expense,
      pos_exp_1: formData.pos_exp_1,
      pos_exp_2: formData.pos_exp_2,
      pos_exp_3: formData.pos_exp_3,
      pos_exp_4: formData.pos_exp_4,
      commission_rate: formData.commission_rate,
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
      gross_contract_total: formData.gross_contract_total,
      op_percent: formData.op_percent,
      material_cost: formData.material_cost,
      labor_cost: formData.labor_cost,
      commission_rate: formData.commission_rate,
    });

    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    const payload = {
      ...formData,
      status: submit ? 'submitted' as const : 'draft' as const,
      sales_rep_id: null,
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

  const isLoading = createMutation.isPending || updateMutation.isPending || tierLoading;
  const canEdit = !readOnly && (!document || document.status === 'draft');
  
  // Block submission for non-privileged users without a tier assignment
  const canSubmit = isPrivileged || hasTier;

  // Mobile-friendly form row component
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
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_150px_1fr] sm:gap-3 sm:items-center">
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
      {/* Header - simplified for mobile */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/commission-documents')} className="transition-transform hover:scale-105 active:scale-95">
          <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Back to List</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      {/* Tier assignment warning */}
      {!canSubmit && !tierLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm sm:text-base">Commission Tier Required</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            You have not been assigned a commission tier yet. Please contact your manager.
          </AlertDescription>
        </Alert>
      )}

      {/* Display current tier info - mobile optimized */}
      {hasTier && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Your Tier</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                    {userTier?.tier?.name}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">O&P Options</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allowedOpPercentages.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs font-financial">
                          {(p * 100).toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Profit Split</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allowedProfitSplits.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs font-financial">
                          {(p * 100).toFixed(0)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Show privileged user info */}
      {isPrivileged && !hasTier && (
        <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {role === 'admin' ? 'Admin' : 'Manager'} Access
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  You have access to all commission options.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="font-friendly overflow-hidden">
        <CardHeader className="bg-muted/50 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-xl text-center font-friendly font-semibold">
            TSM Roofing Commission Document
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-1">
            {/* Job Information Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Job Information</h3>
              
              <FormRow label="Job Name & ID">
                <Input
                  value={formData.job_name_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_name_id: e.target.value }))}
                  disabled={!canEdit}
                  className={inputBaseClasses}
                  placeholder="Enter job name or ID"
                />
              </FormRow>
              
              <FormRow label="Job Date">
                <Input
                  type="date"
                  value={formData.job_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_date: e.target.value }))}
                  disabled={!canEdit}
                  className={inputBaseClasses}
                />
              </FormRow>
              
              <FormRow label="Sales Rep">
                <Input
                  value={formData.sales_rep}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_rep: e.target.value }))}
                  disabled={!canEdit}
                  className={inputBaseClasses}
                  placeholder="Enter sales rep name"
                />
              </FormRow>
            </div>

            {/* Contract Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contract Details</h3>
              
              <FormRow label="Contract Total (Gross)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={formData.gross_contract_total || ''}
                  onChange={(e) => handleNumberChange('gross_contract_total', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="O&P %" hint={hasTier ? `(${userTier?.tier?.name})` : ''}>
                <Select
                  value={formData.op_percent.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, op_percent: parseFloat(value) }))}
                  disabled={!canEdit || !canSubmit}
                >
                  <SelectTrigger className={`${inputBaseClasses} font-financial`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {allowedOpPercentages.map((percent) => (
                      <SelectItem key={percent} value={percent.toString()}>
                        {(percent * 100)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>

              <FormRow label={<span className="flex items-center gap-1">Contract Total (Net) <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated" hint="Commissions calculated off Net.">
                <Input
                  value={formatCurrency(calculated.contract_total_net)}
                  disabled
                  className={calculatedInputClasses}
                />
              </FormRow>
            </div>

            {/* Costs Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Direct Costs</h3>
              
              <FormRow label="Material" hint="Initial material order">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={formData.material_cost || ''}
                  onChange={(e) => handleNumberChange('material_cost', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label="Labor" hint="Initial labor order">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={formData.labor_cost || ''}
                  onChange={(e) => handleNumberChange('labor_cost', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>
            </div>

            {/* Additional Expenses Section - Collapsible */}
            <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen} className="mb-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold text-destructive uppercase tracking-wider hover:bg-muted/30 rounded px-2 -mx-2">
                <span>Additional Expenses (-)</span>
                {expensesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                <FormRow label="Expense #1" variant="negative" hint="Will calls, lumber, misc.">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.neg_exp_1 || ''}
                    onChange={(e) => handleNumberChange('neg_exp_1', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>

                <FormRow label="Expense #2" variant="negative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.neg_exp_2 || ''}
                    onChange={(e) => handleNumberChange('neg_exp_2', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>

                <FormRow label="Expense #3" variant="negative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.neg_exp_3 || ''}
                    onChange={(e) => handleNumberChange('neg_exp_3', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>

                <FormRow label="Supplement Fees" variant="negative" hint="Supplement processing fees">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.supplement_fees_expense || ''}
                    onChange={(e) => handleNumberChange('supplement_fees_expense', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>
              </CollapsibleContent>
            </Collapsible>

            {/* Credits Section - Collapsible */}
            <Collapsible open={creditsOpen} onOpenChange={setCreditsOpen} className="mb-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold text-emerald-600 uppercase tracking-wider hover:bg-muted/30 rounded px-2 -mx-2">
                <span>Credits & Returns (+)</span>
                {creditsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-2">
                <FormRow label="Credit #1" variant="positive" hint="Returns added back">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.pos_exp_1 || ''}
                    onChange={(e) => handleNumberChange('pos_exp_1', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>

                <FormRow label="Credit #2" variant="positive">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.pos_exp_2 || ''}
                    onChange={(e) => handleNumberChange('pos_exp_2', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>

                <FormRow label="Credit #3" variant="positive">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.pos_exp_3 || ''}
                    onChange={(e) => handleNumberChange('pos_exp_3', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>

                <FormRow label="Credit #4" variant="positive">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.pos_exp_4 || ''}
                    onChange={(e) => handleNumberChange('pos_exp_4', e.target.value)}
                    disabled={!canEdit}
                    className={numberInputClasses}
                    placeholder="$0.00"
                  />
                </FormRow>
              </CollapsibleContent>
            </Collapsible>

            {/* Commission Calculation Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Commission Calculation</h3>
              
              <FormRow label={<span className="flex items-center gap-1">Net Profit <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated" hint="Commissionable profit">
                <Input
                  value={formatCurrency(calculated.net_profit)}
                  disabled
                  className={calculatedInputClasses}
                />
              </FormRow>

              <FormRow label="Profit Split %" hint={hasTier ? `(${userTier?.tier?.name})` : ''}>
                <Select
                  value={formData.commission_rate.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commission_rate: parseFloat(value) }))}
                  disabled={!canEdit || !canSubmit}
                >
                  <SelectTrigger className={`${inputBaseClasses} font-financial`}>
                    <SelectValue placeholder="Select %" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {allowedProfitSplits.map((percent) => (
                      <SelectItem key={percent} value={percent.toString()}>
                        {(percent * 100)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>

              {/* Rep Commission - Highlighted */}
              <div className="py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 mt-2">
                <div className="flex flex-col gap-2 px-3 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="font-semibold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                    Rep Commission
                    <Lock className="h-3 w-3" />
                  </Label>
                  <Input
                    value={formatCurrency(calculated.rep_commission)}
                    disabled
                    className="font-financial text-lg tracking-wide tabular-nums bg-emerald-100 dark:bg-emerald-900/30 font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-200 sm:w-40"
                  />
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 px-3 mt-1">Total dollars paid to rep</p>
              </div>

              <FormRow label="Advance Total">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={formData.advance_total || ''}
                  onChange={(e) => handleNumberChange('advance_total', e.target.value)}
                  disabled={!canEdit}
                  className={numberInputClasses}
                  placeholder="$0.00"
                />
              </FormRow>

              <FormRow label={<span className="flex items-center gap-1">Net After Commission <Lock className="h-3 w-3 text-muted-foreground" /></span>} variant="calculated">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input
                    value={formatCurrency(calculated.net_profit - calculated.rep_commission)}
                    disabled
                    className={`${calculatedInputClasses} sm:w-32`}
                  />
                  <span className="font-financial text-xs text-muted-foreground whitespace-nowrap">
                    {formData.gross_contract_total > 0 
                      ? `${(((calculated.net_profit - calculated.rep_commission) / formData.gross_contract_total) * 100).toFixed(1)}% Net Margin`
                      : '0.0% Margin'}
                  </span>
                </div>
              </FormRow>

              {/* Company Profit - Admin Only */}
              {role === 'admin' && (
                <div className="py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                  <div className="flex flex-col gap-2 px-3 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="font-medium flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      Company Profit
                      <Lock className="h-3 w-3" />
                    </Label>
                    <Input
                      value={formatCurrency(calculated.company_profit)}
                      disabled
                      className="font-financial tracking-wide tabular-nums bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 sm:w-40"
                    />
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 px-3 mt-1">Admin only</p>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h3>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={!canEdit}
                placeholder="Add any notes..."
                rows={3}
                className={`${inputBaseClasses} resize-none w-full`}
              />
            </div>

            {/* Approval Status */}
            <div className="py-3 bg-muted/50 rounded transition-colors">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Label className="font-medium">Management Approval</Label>
                <div className="text-sm">
                  {document?.status === 'approved' && document.approved_at && (
                    <span className="text-green-600">
                      Approved on {new Date(document.approved_at).toLocaleDateString()}
                      {document.approval_comment && `: ${document.approval_comment}`}
                    </span>
                  )}
                  {document?.status === 'rejected' && (
                    <span className="text-destructive">
                      Rejected {document.approval_comment && `: ${document.approval_comment}`}
                    </span>
                  )}
                  {(!document || document.status === 'draft') && (
                    <span className="text-muted-foreground">Pending submission</span>
                  )}
                  {document?.status === 'submitted' && (
                    <span className="text-amber-600">Awaiting approval</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Sticky Action Bar */}
      {canEdit && canSubmit && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 flex gap-3 sm:hidden z-50">
          <Button 
            variant="outline" 
            onClick={() => handleSave(false)} 
            disabled={isLoading} 
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSave(true)} 
            disabled={isLoading} 
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      )}
      
      {/* Desktop Action Buttons */}
      {canEdit && canSubmit && (
        <div className="hidden sm:flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading} className="transition-all hover:scale-105 active:scale-95">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isLoading} className="transition-all hover:scale-105 active:scale-95">
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
