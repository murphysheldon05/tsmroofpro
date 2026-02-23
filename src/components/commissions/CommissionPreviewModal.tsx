import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, ArrowLeft, FileText, DollarSign, Calculator, Percent } from "lucide-react";
import { formatCurrency, formatTierPercent } from "@/lib/commissionDocumentCalculations";

interface CommissionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  formData: {
    job_name_id: string;
    job_date: string;
    sales_rep: string;
    gross_contract_total: number;
    op_percent: number;
    material_cost: number;
    labor_cost: number;
    neg_exp_1: number;
    neg_exp_2: number;
    neg_exp_3: number;
    neg_exp_4: number;
    pos_exp_1: number;
    pos_exp_2: number;
    pos_exp_3: number;
    pos_exp_4: number;
    profit_split_label: string;
    rep_profit_percent: number;
    advance_total: number;
    notes: string;
  };
  additionalNegExpenses: number[];
  calculated: {
    op_amount: number;
    contract_total_net: number;
    net_profit: number;
    rep_commission: number;
    company_profit: number;
  };
  tierName?: string;
}

export function CommissionPreviewModal({
  open,
  onClose,
  onConfirmSubmit,
  isSubmitting,
  formData,
  additionalNegExpenses,
  calculated,
  tierName,
}: CommissionPreviewModalProps) {
  const totalNegExpenses = formData.neg_exp_1 + formData.neg_exp_2 + formData.neg_exp_3 + formData.neg_exp_4 +
    additionalNegExpenses.reduce((sum, exp) => sum + (exp || 0), 0);
  const totalPosExpenses = formData.pos_exp_1 + formData.pos_exp_2 + formData.pos_exp_3 + formData.pos_exp_4;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-background to-primary/5 border-b border-border/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Review Before Submitting
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Please review all details carefully before submitting.
          </p>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Job Information */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Job Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Job Name & ID</p>
                  <p className="font-medium">{formData.job_name_id || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Date</p>
                  <p className="font-medium">
                    {formData.job_date ? new Date(formData.job_date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Sales Rep</p>
                  <p className="font-medium">{formData.sales_rep || "—"}</p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Contract Details */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Contract & Costs
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Total (Gross)</span>
                  <span className="font-mono font-medium">{formatCurrency(formData.gross_contract_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">O&P ({formatTierPercent(formData.op_percent)})</span>
                  <span className="font-mono text-destructive">−{formatCurrency(calculated.op_amount)}</span>
                </div>
                <div className="flex justify-between font-medium bg-muted/50 p-2 rounded">
                  <span>Contract Total (Net)</span>
                  <span className="font-mono">{formatCurrency(calculated.contract_total_net)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Cost</span>
                  <span className="font-mono text-destructive">−{formatCurrency(formData.material_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labor Cost</span>
                  <span className="font-mono text-destructive">−{formatCurrency(formData.labor_cost)}</span>
                </div>
              </div>
            </section>

            <Separator />

            {/* Expenses Summary */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Expenses
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Negative Expenses</span>
                  <span className="font-mono text-destructive">−{formatCurrency(totalNegExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Positive Expenses</span>
                  <span className="font-mono text-primary">+{formatCurrency(totalPosExpenses)}</span>
                </div>
              </div>
            </section>

            <Separator />

            {/* Profit Split */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Profit Split
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {formData.profit_split_label}
                </Badge>
                {tierName && (
                  <Badge variant="outline" className="text-xs">
                    {tierName}
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rep Profit %</span>
                  <span className="font-mono font-medium">{formatTierPercent(formData.rep_profit_percent)}</span>
                </div>
              </div>
            </section>

            <Separator />

            {/* Commission Summary */}
            <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-lg border border-primary/20">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Commission Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Profit</span>
                  <span className="font-mono">{formatCurrency(calculated.net_profit)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Your Commission</span>
                  <span className="font-mono text-primary">{formatCurrency(calculated.rep_commission)}</span>
                </div>
                {formData.advance_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Less Draw</span>
                    <span className="font-mono text-destructive">−{formatCurrency(formData.advance_total)}</span>
                  </div>
                )}
                {formData.advance_total > 0 && (
                  <div className="flex justify-between font-medium pt-2 border-t border-primary/20">
                    <span>Amount Due</span>
                    <span className="font-mono">{formatCurrency(calculated.rep_commission - formData.advance_total)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Notes */}
            {formData.notes && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {formData.notes}
                  </p>
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-muted/30 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={onConfirmSubmit} disabled={isSubmitting} className="flex-1">
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
