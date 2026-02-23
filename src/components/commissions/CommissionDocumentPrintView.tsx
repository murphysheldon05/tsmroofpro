import { formatCurrency, formatTierPercent } from "@/lib/commissionDocumentCalculations";
import type { CommissionDocument } from "@/hooks/useCommissionDocuments";
import { format } from "date-fns";

interface CommissionDocumentPrintViewProps {
  document: CommissionDocument;
  isAdmin?: boolean;
}

export function CommissionDocumentPrintView({ document, isAdmin = false }: CommissionDocumentPrintViewProps) {
  return (
    <div className="print:block p-8 bg-white text-black min-h-screen">
      <style>
        {`
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold">TSM Roofing LLC</h1>
        <h2 className="text-xl font-semibold mt-2">Official Commission Document</h2>
      </div>

      {/* Job Info */}
      <div className="grid grid-cols-3 gap-4 mb-6 border-b pb-4">
        <div>
          <span className="font-semibold">Job Name & ID:</span>
          <div className="border-b border-gray-400 mt-1 pb-1">{document.job_name_id}</div>
        </div>
        <div>
          <span className="font-semibold">Job Date:</span>
          <div className="border-b border-gray-400 mt-1 pb-1">
            {document.job_date ? format(new Date(document.job_date), 'MM/dd/yyyy') : '-'}
          </div>
        </div>
        <div>
          <span className="font-semibold">Sales Rep:</span>
          <div className="border-b border-gray-400 mt-1 pb-1">{document.sales_rep}</div>
        </div>
      </div>

      {/* Financial Section */}
      <table className="w-full mb-6 border-collapse">
        <tbody>
          <tr className="border-b">
            <td className="py-2 font-semibold w-1/2">Contract Total (Gross)</td>
            <td className="py-2 text-right font-mono">{formatCurrency(document.gross_contract_total)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 font-semibold">O&P</td>
            <td className="py-2 text-right font-mono">{(document.op_percent * 100).toFixed(2)}%</td>
          </tr>
          <tr className="border-b bg-gray-100">
            <td className="py-2 font-semibold">Contract Total (Net)</td>
            <td className="py-2 text-right font-mono font-bold">{formatCurrency(document.contract_total_net)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 font-semibold">Material</td>
            <td className="py-2 text-right font-mono">{formatCurrency(document.material_cost)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 font-semibold">Labor</td>
            <td className="py-2 text-right font-mono">{formatCurrency(document.labor_cost)}</td>
          </tr>
        </tbody>
      </table>

      {/* Expenses */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-bold mb-2 text-red-600">Additional Expenses (Negative)</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-1">#1</td>
                <td className="py-1 text-right font-mono">-{formatCurrency(document.neg_exp_1)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">#2</td>
                <td className="py-1 text-right font-mono">-{formatCurrency(document.neg_exp_2)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">#3</td>
                <td className="py-1 text-right font-mono">-{formatCurrency(document.neg_exp_3)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">#4 (Supplement Fees)</td>
                <td className="py-1 text-right font-mono">-{formatCurrency(document.neg_exp_4 ?? document.supplement_fees_expense)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-bold mb-2 text-green-600">Additional Expenses (Positive)</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-1">#1</td>
                <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_1)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">#2</td>
                <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_2)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">#3</td>
                <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_3)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1">#4</td>
                <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Summary */}
      <div className="border-2 border-black p-4 mb-6">
        <h3 className="font-bold text-lg mb-4 text-center">Commission Summary</h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-semibold">Net Profit</td>
              <td className="py-2 text-right font-mono text-lg">{formatCurrency(document.net_profit)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-semibold">Profit Split</td>
              <td className="py-2 text-right font-mono">{document.profit_split_label || formatTierPercent(document.rep_profit_percent)}</td>
            </tr>
            <tr className="border-b bg-green-100">
              <td className="py-2 font-bold text-lg">Rep Commission</td>
              <td className="py-2 text-right font-mono text-lg font-bold">{formatCurrency(document.rep_commission)}</td>
            </tr>
            <tr className={isAdmin ? "border-b" : ""}>
              <td className="py-2 font-semibold">Advance Total</td>
              <td className="py-2 text-right font-mono">{formatCurrency(document.advance_total)}</td>
            </tr>
            {isAdmin && (
              <tr className="bg-amber-50">
                <td className="py-2 font-semibold text-amber-700">Company Profit (Admin)</td>
                <td className="py-2 text-right font-mono text-amber-700">{formatCurrency(document.company_profit)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {document.notes && (
        <div className="mb-6">
          <h3 className="font-bold mb-2">Notes</h3>
          <div className="border p-2 min-h-[60px]">{document.notes}</div>
        </div>
      )}

      {/* Approval Section */}
      <div className="border-t-2 border-black pt-4 mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <span className="font-semibold">Status:</span>
            <span className="ml-2 uppercase">{document.status}</span>
          </div>
          {document.approved_at && (
            <>
              <div>
                <span className="font-semibold">Approved Date:</span>
                <span className="ml-2">{format(new Date(document.approved_at), 'MM/dd/yyyy HH:mm')}</span>
              </div>
            </>
          )}
        </div>
        {document.approval_comment && (
          <div className="mt-4">
            <span className="font-semibold">Approval Comment:</span>
            <div className="border p-2 mt-1">{document.approval_comment}</div>
          </div>
        )}
      </div>

      {/* Signature Lines */}
      <div className="grid grid-cols-2 gap-8 mt-12">
        <div>
          <div className="border-b border-black mb-1 h-10"></div>
          <span className="text-sm">Sales Rep Signature</span>
        </div>
        <div>
          <div className="border-b border-black mb-1 h-10"></div>
          <span className="text-sm">Management Approval</span>
        </div>
      </div>
    </div>
  );
}
