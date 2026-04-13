import { formatCurrency } from "@/lib/utils";
import { formatTierPercent } from "@/lib/commissionDocumentCalculations";
import type { CommissionDocument } from "@/hooks/useCommissionDocuments";
import { useCommissionAuditLog, type AuditLogEntry } from "@/hooks/useCommissionAuditLog";
import { useCommissionComments, type CommissionComment } from "@/hooks/useCommissionComments";
import { format } from "date-fns";
import { formatTimestampMST } from "@/lib/commissionPayDateCalculations";

interface CommissionDocumentPrintViewProps {
  document: CommissionDocument;
  isAdmin?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Compliance Review",
  manager_approved: "Manager Approved",
  accounting_approved: "Accounting Approved",
  revision_required: "Revision Required",
  rejected: "Denied",
  paid: "Paid",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "background-color: #e2e8f0; color: #334155;",
  submitted: "background-color: #fef3c7; color: #92400e;",
  manager_approved: "background-color: #dbeafe; color: #1e40af;",
  accounting_approved: "background-color: #d1fae5; color: #065f46;",
  revision_required: "background-color: #fef3c7; color: #92400e;",
  rejected: "background-color: #fee2e2; color: #991b1b;",
  paid: "background-color: #d1fae5; color: #065f46;",
};

function PrintTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (!entries || entries.length === 0) return null;

  const sorted = [...entries].sort(
    (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime()
  );

  const actionLabels: Record<string, string> = {
    submitted: "Submitted",
    approved: "Approved",
    rejected: "Rejected",
    revision_requested: "Revision Requested",
    revision_submitted: "Revision Resubmitted",
    paid: "Marked as Paid",
    rolled_to_next_pay_run: "Rolled to Next Pay Run",
    admin_override_pulled_in: "Admin Override — Pulled In",
    notes_added: "Notes Added",
    edited: "Edited",
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        Form Lifecycle Timeline
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #d1d5db" }}>
            <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "600" }}>Date / Time</th>
            <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "600" }}>Action</th>
            <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "600" }}>By</th>
            <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "600" }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            let label = actionLabels[entry.action] || entry.action;
            if (entry.action === "approved" && entry.details?.stage) {
              label = `${entry.details.stage === "compliance" ? "Compliance" : "Accounting"} Approved`;
            }
            const detail =
              entry.details?.reason || entry.details?.message || entry.details?.comment || entry.details?.changes || "";
            return (
              <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{formatTimestampMST(entry.performed_at)}</td>
                <td style={{ padding: "4px 8px" }}>{label}</td>
                <td style={{ padding: "4px 8px" }}>{entry.performer_name || "System"}</td>
                <td style={{ padding: "4px 8px", maxWidth: "300px", wordBreak: "break-word" }}>{detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PrintComments({ comments }: { comments: CommissionComment[] }) {
  if (!comments || comments.length === 0) return null;

  const typeLabels: Record<string, string> = {
    rejection_note: "Rejection Note",
    revision_note: "Revision Note",
    reply: "Reply",
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        Notes & Communication
      </h3>
      {comments.map((comment) => (
        <div
          key={comment.id}
          style={{
            marginBottom: "8px",
            padding: "8px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            backgroundColor: comment.comment_type === "rejection_note" ? "#fef2f2" : "#f9fafb",
          }}
        >
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
            <strong>{comment.user_name || "Unknown"}</strong>
            {comment.comment_type !== "reply" && (
              <span
                style={{
                  marginLeft: "8px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  backgroundColor: comment.comment_type === "rejection_note" ? "#fee2e2" : "#fef3c7",
                  color: comment.comment_type === "rejection_note" ? "#991b1b" : "#92400e",
                }}
              >
                {typeLabels[comment.comment_type] || comment.comment_type}
              </span>
            )}
            <span style={{ marginLeft: "8px" }}>{formatTimestampMST(comment.created_at)}</span>
          </div>
          <div style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>{comment.comment_text}</div>
        </div>
      ))}
    </div>
  );
}

function RepairFieldsPrintSection({ document }: { document: CommissionDocument }) {
  const doc = document as any;
  if (doc.form_type !== "repair") return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        Repair Details
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {doc.customer_name && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600, width: "40%" }}>Customer Name</td>
              <td style={{ padding: "6px 0" }}>{doc.customer_name}</td>
            </tr>
          )}
          {doc.customer_address && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Customer Address</td>
              <td style={{ padding: "6px 0" }}>{doc.customer_address}</td>
            </tr>
          )}
          {(doc.customer_phone || doc.customer_email) && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Contact</td>
              <td style={{ padding: "6px 0" }}>
                {doc.customer_phone}{doc.customer_phone && doc.customer_email ? " / " : ""}{doc.customer_email}
              </td>
            </tr>
          )}
          {doc.repair_description && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Repair Description</td>
              <td style={{ padding: "6px 0", whiteSpace: "pre-wrap" }}>{doc.repair_description}</td>
            </tr>
          )}
          {doc.repair_date && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Repair Date</td>
              <td style={{ padding: "6px 0" }}>{format(new Date(doc.repair_date), "MM/dd/yyyy")}</td>
            </tr>
          )}
          {doc.total_repair_amount != null && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Total Repair Amount</td>
              <td style={{ padding: "6px 0", fontFamily: "monospace" }}>{formatCurrency(doc.total_repair_amount)}</td>
            </tr>
          )}
          {doc.repair_commission_amount != null && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Commission Amount</td>
              <td style={{ padding: "6px 0", fontFamily: "monospace" }}>{formatCurrency(doc.repair_commission_amount)}</td>
            </tr>
          )}
          {doc.repair_commission_rate != null && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "6px 0", fontWeight: 600 }}>Commission Rate</td>
              <td style={{ padding: "6px 0" }}>{(doc.repair_commission_rate * 100).toFixed(2)}%</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CommissionDocumentPrintView({ document, isAdmin = false }: CommissionDocumentPrintViewProps) {
  const { data: auditEntries } = useCommissionAuditLog(document.id);
  const { data: comments } = useCommissionComments(document.id);
  const isRepair = (document as any).form_type === "repair";

  return (
    <div className="print:block p-8 bg-white text-black min-h-screen" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>
        {`
          @media print {
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* TSM Roofing Header */}
      <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "3px solid #1a1a1a", paddingBottom: "16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 4px 0" }}>TSM Roofing LLC</h1>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0" }}>
          Phoenix, AZ &bull; info@tsmroofs.com &bull; tsmroofs.com
        </p>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginTop: "12px" }}>
          {isRepair ? "Repair Commission Document" : "Official Commission Document"}
        </h2>
        <div style={{ marginTop: "8px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "600",
              ...Object.fromEntries(
                (STATUS_COLORS[document.status] || "")
                  .split(";")
                  .filter(Boolean)
                  .map((s) => {
                    const [k, v] = s.split(":").map((x) => x.trim());
                    return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
                  })
              ),
            }}
          >
            {STATUS_LABELS[document.status] || document.status}
          </span>
          {isRepair && (
            <span
              style={{
                display: "inline-block",
                marginLeft: "8px",
                padding: "4px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: "#ede9fe",
                color: "#5b21b6",
              }}
            >
              Repair
            </span>
          )}
        </div>
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
            {document.job_date ? format(new Date(document.job_date), "MM/dd/yyyy") : "-"}
          </div>
        </div>
        <div>
          <span className="font-semibold">Sales Rep:</span>
          <div className="border-b border-gray-400 mt-1 pb-1">{document.sales_rep}</div>
        </div>
      </div>

      {/* Key Dates */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "16px", fontSize: "12px", flexWrap: "wrap" }}>
        {document.submitted_at && (
          <div><strong>Submitted:</strong> {formatTimestampMST(document.submitted_at)}</div>
        )}
        {document.install_date && (
          <div><strong>Install Date:</strong> {format(new Date(document.install_date + "T00:00:00"), "MM/dd/yyyy")}</div>
        )}
        {document.manager_approved_at && (
          <div><strong>Compliance Approved:</strong> {formatTimestampMST(document.manager_approved_at)}</div>
        )}
        {document.accounting_approved_at && (
          <div><strong>Accounting Approved:</strong> {formatTimestampMST(document.accounting_approved_at)}</div>
        )}
        {document.paid_at && (
          <div><strong>Paid:</strong> {formatTimestampMST(document.paid_at)}</div>
        )}
      </div>

      {/* Repair-specific fields */}
      <RepairFieldsPrintSection document={document} />

      {/* Financial Section (standard commissions) */}
      {!isRepair && (
        <>
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
                  {(() => {
                    const extras = Array.isArray(document.additional_neg_expenses) ? document.additional_neg_expenses : [];
                    const extrasTotal = extras.reduce((s, e) => s + (e.amount ?? 0), 0);
                    const baseNeg4 =
                      extras.length > 0
                        ? (document.neg_exp_4 ?? document.supplement_fees_expense ?? 0) - extrasTotal
                        : document.neg_exp_4 ?? document.supplement_fees_expense ?? 0;
                    return (
                      <>
                        <tr className="border-b">
                          <td className="py-1">#4 (Supplement/Appraisal Fees)</td>
                          <td className="py-1 text-right font-mono">-{formatCurrency(Math.max(baseNeg4, 0))}</td>
                        </tr>
                        {extras.map((exp, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-1">{exp.label || `#${i + 5}`}</td>
                            <td className="py-1 text-right font-mono">-{formatCurrency(exp.amount ?? 0)}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-green-600">Additional Expenses (Positive)</h3>
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1">Return #1</td>
                    <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_1)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1">Return #2</td>
                    <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_2)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1">Return #3</td>
                    <td className="py-1 text-right font-mono">+{formatCurrency(document.pos_exp_3)}</td>
                  </tr>
                  {(() => {
                    const posExtras = Array.isArray(document.additional_pos_expenses) ? document.additional_pos_expenses : [];
                    const posExtrasTotal = posExtras.reduce((s, e) => s + (e.amount ?? 0), 0);
                    const basePos4 = posExtras.length > 0 ? (document.pos_exp_4 ?? 0) - posExtrasTotal : document.pos_exp_4 ?? 0;
                    return (
                      <>
                        <tr className="border-b">
                          <td className="py-1">Return #4</td>
                          <td className="py-1 text-right font-mono">+{formatCurrency(Math.max(basePos4, 0))}</td>
                        </tr>
                        {posExtras.map((exp, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-1">{exp.label || `Return #${i + 5}`}</td>
                            <td className="py-1 text-right font-mono">+{formatCurrency(exp.amount ?? 0)}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
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
                  <td className="py-2 text-right font-mono">
                    {document.profit_split_label || formatTierPercent(document.rep_profit_percent)}
                  </td>
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
        </>
      )}

      {/* Notes */}
      {document.notes && (
        <div className="mb-6">
          <h3 className="font-bold mb-2">Notes</h3>
          <div className="border p-2 min-h-[40px]" style={{ whiteSpace: "pre-wrap" }}>{document.notes}</div>
        </div>
      )}

      {/* Revision / Rejection History */}
      {(document.revision_reason || document.approval_comment) && (
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
            Revision / Rejection Notes
          </h3>
          {document.revision_reason && (
            <div style={{ padding: "8px 12px", marginBottom: "6px", border: "1px solid #fca5a5", borderRadius: "6px", backgroundColor: "#fef2f2", fontSize: "12px" }}>
              <strong>Revision Reason:</strong> {document.revision_reason}
            </div>
          )}
          {document.approval_comment && document.approval_comment !== document.revision_reason && (
            <div style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb", fontSize: "12px" }}>
              <strong>Approval/Denial Comment:</strong> {document.approval_comment}
            </div>
          )}
        </div>
      )}

      {/* Full Lifecycle Timeline */}
      <PrintTimeline entries={auditEntries || []} />

      {/* Communication Thread */}
      <PrintComments comments={comments || []} />

      {/* Signature Lines */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <div className="border-b border-black mb-1 h-10"></div>
          <span className="text-sm">Sales Rep Signature</span>
        </div>
        <div>
          <div className="border-b border-black mb-1 h-10"></div>
          <span className="text-sm">Management Approval</span>
        </div>
      </div>

      {/* Print Footer */}
      <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #d1d5db", fontSize: "10px", color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
        <span>TSM Roofing LLC &mdash; Confidential</span>
        <span>Printed on: {format(new Date(), "MM/dd/yyyy 'at' h:mm a")}</span>
      </div>
    </div>
  );
}
