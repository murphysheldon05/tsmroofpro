import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Save, Send, ArrowLeft } from "lucide-react";
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
    op_percent: document?.op_percent ?? 0.15,
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
    commission_rate: document?.commission_rate ?? 0.40,
    advance_total: document?.advance_total ?? 0,
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
    };
    return calculateAllFields(inputData);
  }, [formData]);

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const handlePercentChange = (field: keyof typeof formData, value: string) => {
    // Allow entering as percentage (e.g., "15" becomes 0.15)
    const numValue = parseFloat(value) || 0;
    const decimalValue = numValue > 1 ? numValue / 100 : numValue;
    setFormData(prev => ({ ...prev, [field]: Math.min(1, Math.max(0, decimalValue)) }));
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

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canEdit = !readOnly && (!document || document.status === 'draft');

  // Helper to format percent for display in input (show as whole number like 15 for 0.15)
  const formatPercentForInput = (value: number) => (value * 100).toFixed(2);

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
          {/* Spreadsheet-like layout */}
          <div className="space-y-1">
            {/* Header Fields */}
            <div className="grid grid-cols-[200px_1fr_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Job Name & ID</Label>
              <Input
                value={formData.job_name_id}
                onChange={(e) => setFormData(prev => ({ ...prev, job_name_id: e.target.value }))}
                disabled={!canEdit}
                className="col-span-2"
              />
            </div>
            
            <div className="grid grid-cols-[200px_1fr_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Job Date</Label>
              <Input
                type="date"
                value={formData.job_date}
                onChange={(e) => setFormData(prev => ({ ...prev, job_date: e.target.value }))}
                disabled={!canEdit}
                className="col-span-2"
              />
            </div>
            
            <div className="grid grid-cols-[200px_1fr_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Sales Rep</Label>
              <Input
                value={formData.sales_rep}
                onChange={(e) => setFormData(prev => ({ ...prev, sales_rep: e.target.value }))}
                disabled={!canEdit}
                className="col-span-2"
              />
            </div>

            {/* Spacer row */}
            <div className="py-2" />

            {/* Contract Total (Gross) */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Contract Total (Gross)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.gross_contract_total}
                onChange={(e) => handleNumberChange('gross_contract_total', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
              />
              <span className="text-sm text-muted-foreground"></span>
            </div>

            {/* O&P */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">O&P</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formatPercentForInput(formData.op_percent)}
                  onChange={(e) => handlePercentChange('op_percent', e.target.value)}
                  disabled={!canEdit}
                  className="font-mono pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <span className="text-sm text-muted-foreground">Please enter % as decimal, 10%, 12.%, 15%</span>
            </div>

            {/* Contract Total (Net) - Calculated */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b bg-muted/30">
              <Label className="font-semibold flex items-center gap-1">
                Contract Total (Net)
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                value={formatCurrency(calculated.contract_total_net)}
                disabled
                className="font-mono bg-muted"
              />
              <span className="text-sm text-muted-foreground">Commissions and expenses calculated off of Net contract total.</span>
            </div>

            {/* Material */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Material</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.material_cost}
                onChange={(e) => handleNumberChange('material_cost', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
              />
              <span className="text-sm text-muted-foreground">Initial Material order</span>
            </div>

            {/* Labor */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Labor</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.labor_cost}
                onChange={(e) => handleNumberChange('labor_cost', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
              />
              <span className="text-sm text-muted-foreground">Initial Labor Order</span>
            </div>

            {/* Additional expenses (-) #1 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-destructive">Additional expenses (-)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.neg_exp_1 || ''}
                onChange={(e) => handleNumberChange('neg_exp_1', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder="$-"
              />
              <span className="text-sm text-muted-foreground">Will calls, lumber, Home Debot, Misc. expenses</span>
            </div>

            {/* Additional expenses (-) #2 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-destructive">Additional expenses (-)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.neg_exp_2 || ''}
                onChange={(e) => handleNumberChange('neg_exp_2', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder="$-"
              />
              <span className="text-sm text-muted-foreground">Will calls, lumber, Home Debot, Misc. expenses</span>
            </div>

            {/* Additional expenses (-) #3 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-destructive">Additional expenses (-)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.neg_exp_3 || ''}
                onChange={(e) => handleNumberChange('neg_exp_3', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder=""
              />
              <span className="text-sm text-muted-foreground">Will calls, lumber, Home Debot, Misc. expenses</span>
            </div>

            {/* Additional expenses (-) #4 - Supplement fees */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-destructive">Additional expenses (-)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.supplement_fees_expense || ''}
                onChange={(e) => handleNumberChange('supplement_fees_expense', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder=""
              />
              <span className="text-sm text-muted-foreground">Supplement fees</span>
            </div>

            {/* Additional expenses (+) #1 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-green-600">Additional expenses (+)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pos_exp_1 || ''}
                onChange={(e) => handleNumberChange('pos_exp_1', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder=""
              />
              <span className="text-sm text-muted-foreground">Returns added back if rep returns materials</span>
            </div>

            {/* Additional expenses (+) #2 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-green-600">Additional expenses (+)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pos_exp_2 || ''}
                onChange={(e) => handleNumberChange('pos_exp_2', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder=""
              />
              <span className="text-sm text-muted-foreground"></span>
            </div>

            {/* Additional expenses (+) #3 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-green-600">Additional expenses (+)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pos_exp_3 || ''}
                onChange={(e) => handleNumberChange('pos_exp_3', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder=""
              />
              <span className="text-sm text-muted-foreground"></span>
            </div>

            {/* Additional expenses (+) #4 */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="text-green-600">Additional expenses (+)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.pos_exp_4 || ''}
                onChange={(e) => handleNumberChange('pos_exp_4', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder=""
              />
              <span className="text-sm text-muted-foreground"></span>
            </div>

            {/* Net profit - Calculated */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b bg-muted/30">
              <Label className="font-semibold flex items-center gap-1">
                Net profit
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                value={formatCurrency(calculated.net_profit)}
                disabled
                className="font-mono bg-muted"
              />
              <span className="text-sm text-muted-foreground">This is the Commissionable profit on the job, calculated off the net contract after O&P is removed.</span>
            </div>

            {/* Commission Rate */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Comission Rate</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formatPercentForInput(formData.commission_rate)}
                  onChange={(e) => handlePercentChange('commission_rate', e.target.value)}
                  disabled={!canEdit}
                  className="font-mono pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <span className="text-sm text-muted-foreground">This is the percentage of profit split allocated to the rep</span>
            </div>

            {/* Rep Commission - Calculated */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b bg-green-50 dark:bg-green-900/20">
              <Label className="font-semibold flex items-center gap-1">
                Rep Commission
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                value={formatCurrency(calculated.rep_commission)}
                disabled
                className="font-mono bg-green-100 dark:bg-green-900/30 font-bold"
              />
              <span className="text-sm text-muted-foreground">This is the total dollars paid to rep</span>
            </div>

            {/* Advance Total */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b">
              <Label className="font-semibold">Advance Total</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.advance_total || ''}
                onChange={(e) => handleNumberChange('advance_total', e.target.value)}
                disabled={!canEdit}
                className="font-mono"
                placeholder="$-"
              />
              <span className="text-sm text-muted-foreground"></span>
            </div>

            {/* Net Profit After Commission - Calculated */}
            <div className="grid grid-cols-[200px_150px_1fr] gap-2 items-center py-2 border-b bg-muted/30">
              <Label className="font-semibold flex items-center gap-1">
                Net Profit After Commission
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                value={formatCurrency(calculated.net_profit - calculated.rep_commission)}
                disabled
                className="font-mono bg-muted"
              />
              <span className="text-sm text-muted-foreground">Remaining profit after rep commission</span>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-[200px_1fr] gap-2 items-start py-2 border-b">
              <Label className="font-semibold pt-2">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={!canEdit}
                placeholder=""
                rows={3}
              />
            </div>

            {/* Spacer row */}
            <div className="py-2" />

            {/* Management Approval */}
            <div className="grid grid-cols-[200px_1fr] gap-2 items-center py-2 bg-muted/50 rounded">
              <Label className="font-semibold">Management Approval</Label>
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
        </CardContent>
      </Card>
    </div>
  );
}
