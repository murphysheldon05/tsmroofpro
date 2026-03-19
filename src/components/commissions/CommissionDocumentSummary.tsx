import { type CommissionDocument } from "@/hooks/useCommissionDocuments";
import { formatTierPercent } from "@/lib/commissionDocumentCalculations";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface CommissionDocumentSummaryProps {
  document: CommissionDocument;
}

export function CommissionDocumentSummary({ document: doc }: CommissionDocumentSummaryProps) {
  const { isAdmin, isManager } = useAuth();
  const isPrivileged = isAdmin || isManager;

  const negExp4 = doc.neg_exp_4 ?? doc.supplement_fees_expense ?? 0;

  const negExpenses = [
    { label: "Expense #1", value: doc.neg_exp_1 },
    { label: "Expense #2", value: doc.neg_exp_2 },
    { label: "Expense #3", value: doc.neg_exp_3 },
    { label: "Expense #4 (Supplement Fees)", value: negExp4 },
  ].filter((e) => e.value > 0);

  const posExpenses = [
    { label: "Expense #1", value: doc.pos_exp_1 },
    { label: "Expense #2", value: doc.pos_exp_2 },
    { label: "Expense #3", value: doc.pos_exp_3 },
    { label: "Expense #4", value: doc.pos_exp_4 },
  ].filter((e) => e.value > 0);

  const totalNeg = negExpenses.reduce((s, e) => s + e.value, 0);
  const totalPos = posExpenses.reduce((s, e) => s + e.value, 0);

  const opAmount = doc.gross_contract_total * doc.op_percent;
  const repPercent = doc.rep_profit_percent ?? doc.commission_rate ?? 0;

  return (
    <div className="space-y-6 text-sm">
      {/* ── Job Information ── */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Job Information
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
          <div>
            <p className="text-muted-foreground text-xs">Job</p>
            <p className="font-medium">{doc.job_name_id || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Date</p>
            <p className="font-medium">
              {doc.job_date ? new Date(doc.job_date).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Sales Rep</p>
            <p className="font-medium">{doc.sales_rep || "—"}</p>
          </div>
        </div>
      </section>

      <hr className="border-border/40" />

      {/* ── Contract & Costs ── */}
      <section>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Contract & Costs
        </h3>
        <div className="space-y-1.5">
          <Row label="Contract Total (Gross)" value={formatCurrency(doc.gross_contract_total)} />
          <Row
            label={`O&P (${formatTierPercent(doc.op_percent)})`}
            value={`−${formatCurrency(opAmount)}`}
            variant="negative"
          />
          <Row label="Contract Total (Net)" value={formatCurrency(doc.contract_total_net)} bold />
          <Row label="Material Cost" value={`−${formatCurrency(doc.material_cost)}`} variant="negative" />
          <Row label="Labor Cost" value={`−${formatCurrency(doc.labor_cost)}`} variant="negative" />
        </div>
      </section>

      {/* ── Expenses (only non-zero) ── */}
      {(negExpenses.length > 0 || posExpenses.length > 0) && (
        <>
          <hr className="border-border/40" />
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Expenses
            </h3>
            <div className="space-y-1.5">
              {negExpenses.map((e) => (
                <Row key={e.label} label={e.label} value={`−${formatCurrency(e.value)}`} variant="negative" />
              ))}
              {posExpenses.map((e) => (
                <Row key={e.label} label={e.label} value={`+${formatCurrency(e.value)}`} variant="positive" />
              ))}
              {(negExpenses.length > 0 || posExpenses.length > 0) && (
                <div className="flex justify-between pt-1 border-t border-border/30 font-medium">
                  <span>Net Expenses</span>
                  <span className="font-mono">
                    {totalPos - totalNeg >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(totalPos - totalNeg))}
                  </span>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <hr className="border-border/40" />

      {/* ── Commission Breakdown ── */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/20">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
          Commission Breakdown
        </h3>
        <div className="space-y-2">
          <Row label="Net Profit (Commissionable)" value={formatCurrency(doc.net_profit)} />
          <Row
            label={`Profit Split`}
            value={doc.profit_split_label || `${formatTierPercent(repPercent)} rep`}
          />
          <Row
            label={`Rep Profit (${formatTierPercent(repPercent)})`}
            value={formatCurrency(doc.rep_commission)}
          />
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-primary/20">
            <span>Rep Commission</span>
            <span className="font-mono text-primary">{formatCurrency(doc.rep_commission)}</span>
          </div>
          {doc.advance_total > 0 && (
            <>
              <Row label="Less Draw" value={`−${formatCurrency(doc.advance_total)}`} variant="negative" />
              <div className="flex justify-between font-medium pt-1 border-t border-primary/20">
                <span>Amount Due</span>
                <span className="font-mono">{formatCurrency(doc.rep_commission - doc.advance_total)}</span>
              </div>
            </>
          )}
          {isPrivileged && (
            <Row label="Company Profit" value={formatCurrency(doc.company_profit)} />
          )}
        </div>
      </section>

      {/* ── Notes ── */}
      {doc.notes && (
        <>
          <hr className="border-border/40" />
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Notes
            </h3>
            <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">{doc.notes}</p>
          </section>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  variant,
  bold,
}: {
  label: string;
  value: string;
  variant?: "negative" | "positive";
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-medium bg-muted/50 p-2 rounded" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono ${
          variant === "negative"
            ? "text-destructive"
            : variant === "positive"
              ? "text-emerald-600"
              : bold
                ? "font-medium"
                : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
