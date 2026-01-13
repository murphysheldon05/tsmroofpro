import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Save, Send, ArrowLeft, Calculator } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
import { toast } from "sonner";

interface CommissionDocumentFormProps {
  document?: CommissionDocument;
  readOnly?: boolean;
}

export function CommissionDocumentForm({ document, readOnly = false }: CommissionDocumentFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createMutation = useCreateCommissionDocument();
  const updateMutation = useUpdateCommissionDocument();

  const [formData, setFormData] = useState({
    job_name_id: document?.job_name_id ?? "",
    job_date: document?.job_date ?? "",
    sales_rep: document?.sales_rep ?? "",
    gross_contract_total: document?.gross_contract_total ?? 0,
    op_percent: document?.op_percent ?? 0,
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
    commission_rate: document?.commission_rate ?? 0,
    advance_total: document?.advance_total ?? 0,
    starting_claim_amount: document?.starting_claim_amount ?? 0,
    final_claim_amount: document?.final_claim_amount ?? 0,
    notes: document?.notes ?? "",
  });

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
      starting_claim_amount: formData.starting_claim_amount,
      final_claim_amount: formData.final_claim_amount,
    };
    return calculateAllFields(inputData);
  }, [formData]);

  // Auto-fill supplement fee when claim calculator changes
  useEffect(() => {
    if (calculated.supplement_fee > 0 && !readOnly) {
      setFormData(prev => ({
        ...prev,
        supplement_fees_expense: calculated.supplement_fee,
      }));
    }
  }, [calculated.supplement_fee, readOnly]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/commission-documents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-xl text-center">TSM Roofing LLC Official Commission Document</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b">
            <div>
              <Label htmlFor="job_name_id" className="font-semibold">Job Name & ID *</Label>
              <Input
                id="job_name_id"
                value={formData.job_name_id}
                onChange={(e) => setFormData(prev => ({ ...prev, job_name_id: e.target.value }))}
                disabled={!canEdit}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="job_date" className="font-semibold">Job Date *</Label>
              <Input
                id="job_date"
                type="date"
                value={formData.job_date}
                onChange={(e) => setFormData(prev => ({ ...prev, job_date: e.target.value }))}
                disabled={!canEdit}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sales_rep" className="font-semibold">Sales Rep *</Label>
              <Input
                id="sales_rep"
                value={formData.sales_rep}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_rep: e.target.value }))}
                disabled={!canEdit}
                className="mt-1"
              />
            </div>
          </div>

          {/* Financial Inputs */}
          <div className="space-y-4 mb-6 pb-6 border-b">
            <h3 className="font-semibold text-lg">Financial Inputs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="gross_contract_total" className="font-semibold">Contract Total (Gross) *</Label>
                <Input
                  id="gross_contract_total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gross_contract_total}
                  onChange={(e) => handleNumberChange('gross_contract_total', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="op_percent" className="font-semibold">O&P *</Label>
                <Input
                  id="op_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.op_percent}
                  onChange={(e) => handleNumberChange('op_percent', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Please enter % as decimal, 10%, 12.%, 15%</p>
              </div>
              <div>
                <Label className="font-semibold flex items-center gap-1">
                  Contract Total (Net)
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  value={formatCurrency(calculated.contract_total_net)}
                  disabled
                  className="mt-1 bg-muted font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">Commissions and expenses calculated off of Net contract total.</p>
              </div>
              <div>
                <Label htmlFor="material_cost" className="font-semibold">Material *</Label>
                <Input
                  id="material_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.material_cost}
                  onChange={(e) => handleNumberChange('material_cost', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Initial Material order</p>
              </div>
              <div>
                <Label htmlFor="labor_cost" className="font-semibold">Labor *</Label>
                <Input
                  id="labor_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.labor_cost}
                  onChange={(e) => handleNumberChange('labor_cost', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Initial Labor Order</p>
              </div>
            </div>
          </div>

          {/* Claim Supplement Calculator (Optional) */}
          <div className="space-y-4 mb-6 pb-6 border-b bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Claim Supplement Calculator (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="starting_claim_amount">Starting Claim Amount</Label>
                <Input
                  id="starting_claim_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.starting_claim_amount}
                  onChange={(e) => handleNumberChange('starting_claim_amount', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="final_claim_amount">Final Claim Amount</Label>
                <Input
                  id="final_claim_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.final_claim_amount}
                  onChange={(e) => handleNumberChange('final_claim_amount', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  Dollars Increased
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  value={formatCurrency(calculated.dollars_increased)}
                  disabled
                  className="mt-1 bg-muted font-mono"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  Supplement Fee (5%)
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  value={formatCurrency(calculated.supplement_fee)}
                  disabled
                  className="mt-1 bg-muted font-mono"
                />
              </div>
            </div>
          </div>

          {/* Additional Expenses (Negative) */}
          <div className="space-y-4 mb-6 pb-6 border-b">
            <h3 className="font-semibold text-lg text-destructive">Additional Expenses (Negative)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="neg_exp_1">Additional expenses (-) #1</Label>
                <Input
                  id="neg_exp_1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_1}
                  onChange={(e) => handleNumberChange('neg_exp_1', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Will calls, lumber, Home Debot, Misc. expenses</p>
              </div>
              <div>
                <Label htmlFor="neg_exp_2">Additional expenses (-) #2</Label>
                <Input
                  id="neg_exp_2"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_2}
                  onChange={(e) => handleNumberChange('neg_exp_2', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Will calls, lumber, Home Debot, Misc. expenses</p>
              </div>
              <div>
                <Label htmlFor="neg_exp_3">Additional expenses (-) #3</Label>
                <Input
                  id="neg_exp_3"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.neg_exp_3}
                  onChange={(e) => handleNumberChange('neg_exp_3', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Will calls, lumber, Home Debot, Misc. expenses</p>
              </div>
              <div>
                <Label htmlFor="supplement_fees_expense">Additional expenses (-) #4 = Supplement fees</Label>
                <Input
                  id="supplement_fees_expense"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.supplement_fees_expense}
                  onChange={(e) => handleNumberChange('supplement_fees_expense', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Supplement fees (auto-filled from calculator or manual entry)</p>
              </div>
            </div>
          </div>

          {/* Additional Expenses (Positive) */}
          <div className="space-y-4 mb-6 pb-6 border-b">
            <h3 className="font-semibold text-lg text-green-600">Additional Expenses (Positive)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pos_exp_1">Additional expenses (+) #1</Label>
                <Input
                  id="pos_exp_1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_1}
                  onChange={(e) => handleNumberChange('pos_exp_1', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Returns added back if rep returns materials</p>
              </div>
              <div>
                <Label htmlFor="pos_exp_2">Additional expenses (+) #2</Label>
                <Input
                  id="pos_exp_2"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_2}
                  onChange={(e) => handleNumberChange('pos_exp_2', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pos_exp_3">Additional expenses (+) #3</Label>
                <Input
                  id="pos_exp_3"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_3}
                  onChange={(e) => handleNumberChange('pos_exp_3', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pos_exp_4">Additional expenses (+) #4</Label>
                <Input
                  id="pos_exp_4"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pos_exp_4}
                  onChange={(e) => handleNumberChange('pos_exp_4', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Commission Summary */}
          <div className="space-y-4 mb-6 pb-6 border-b bg-primary/5 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Commission Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="font-semibold flex items-center gap-1">
                  Net Profit
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  value={formatCurrency(calculated.net_profit)}
                  disabled
                  className="mt-1 bg-muted font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">This is the Commissionable profit on the job, calculated off the net contract after O&P is removed.</p>
              </div>
              <div>
                <Label htmlFor="commission_rate" className="font-semibold">Commission Rate *</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.commission_rate}
                  onChange={(e) => handleNumberChange('commission_rate', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">This is the percentage of profit split allocated to the rep</p>
              </div>
              <div>
                <Label className="font-semibold flex items-center gap-1">
                  Rep Commission
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  value={formatCurrency(calculated.rep_commission)}
                  disabled
                  className="mt-1 bg-green-100 dark:bg-green-900/30 font-mono text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground mt-1">This is the total dollars paid to rep</p>
              </div>
              <div>
                <Label htmlFor="advance_total" className="font-semibold">Advance Total</Label>
                <Input
                  id="advance_total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.advance_total}
                  onChange={(e) => handleNumberChange('advance_total', e.target.value)}
                  disabled={!canEdit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-semibold flex items-center gap-1">
                  Company Profit
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  value={formatCurrency(calculated.company_profit)}
                  disabled
                  className="mt-1 bg-muted font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">Total Company profit, not rep facing</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Notes</h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              disabled={!canEdit}
              placeholder="Additional notes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
