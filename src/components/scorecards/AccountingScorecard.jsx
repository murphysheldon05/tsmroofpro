// ─────────────────────────────────────────────────────────────────────────────
// AccountingScorecard.jsx  (Renice)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { useWeeklyScorecardSubmission } from "@/hooks/useWeeklyScorecardSubmission";

// Shared helpers (copy or import from a shared utils file in your project)
function PassFail({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onChange(true)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${value === true ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-emerald-50"}`}>PASS</button>
      <button onClick={() => onChange(false)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${value === false ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-red-50"}`}>FAIL</button>
    </div>
  );
}
function NumberInput({ value, onChange, prefix }) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-gray-400 text-sm">{prefix}</span>}
      <input type="number" min={0} value={value || ""} onChange={(e) => onChange(Number(e.target.value) || 0)} placeholder="0" className="w-24 px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400" />
    </div>
  );
}
function ScoreBar({ passed, total }) {
  const pct = total > 0 ? (passed / total) * 100 : 0;
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold font-mono text-gray-700">{passed}/{total}</span>
      <span className={`text-xs font-bold ${pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-yellow-600" : "text-red-600"}`}>{Math.round(pct)}%</span>
    </div>
  );
}
function getBonusTier(pct, tiers) {
  for (const t of tiers) if (pct >= t.min) return t;
  return tiers[tiers.length - 1];
}

// ── ACCOUNTING KPIs ──────────────────────────────────────────────────────────
const ACCOUNTING_KPIS = [
  { id: "invoice_speed", name: "Invoice Processing Speed", description: "All new invoices entered and coded within 24 hours of receipt — no backlog", type: "pass_fail" },
  { id: "ar_ap_accuracy", name: "AR/AP Accuracy", description: "No errors on incoming or outgoing payments this week. Reconciled and clean.", type: "pass_fail" },
  { id: "commission_accuracy", name: "Commission Pay Run Accuracy", description: "Commission pay runs correct on the first pass — zero errors requiring re-issue", type: "pass_fail" },
  { id: "weekly_report", name: "Weekly Financial Reporting", description: "P&L snapshot, cash position, and open AR delivered to Courtney every Friday by noon", type: "pass_fail" },
  { id: "coa_maintenance", name: "Chart of Accounts Maintenance", description: "COA current and properly categorized — no miscoded or orphan entries", type: "pass_fail" },
  { id: "vendor_payments", name: "Vendor & Sub Payment Compliance", description: "All subs and vendors paid on schedule per contract terms — nothing overdue", type: "pass_fail" },
  { id: "expense_compliance", name: "Expense & Receipt Compliance", description: "All team expense submissions reviewed, receipts collected, and coded correctly within the week", type: "pass_fail" },
];

const ACCOUNTING_BONUS_TIERS = [
  { min: 90, label: "Tier 1 — $500", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-300" },
  { min: 83, label: "Tier 2 — $300", color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  { min: 75, label: "Tier 3 — $150", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-300" },
  { min: 0, label: "No Bonus", color: "text-red-600", bg: "bg-red-50 border-red-300" },
];

export function AccountingScorecard({ assignedUserId = null }) {
  const [week, setWeek] = useState(() => {
    const d = new Date(); const day = d.getDay();
    const monday = new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)));
    return monday.toISOString().split("T")[0];
  });
  const reviewers = ["Courtney Murphy", "Sheldon Murphy"];
  const [reviewer, setReviewer] = useState("");
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { submitEntry, isSubmitting } = useWeeklyScorecardSubmission();
  const updateScore = (id, v) => setScores((p) => ({ ...p, [id]: v }));
  const passed = ACCOUNTING_KPIS.filter((k) => scores[k.id] === true).length;
  const failed = ACCOUNTING_KPIS.filter((k) => scores[k.id] === false).length;
  const total = ACCOUNTING_KPIS.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const bonus = getBonusTier(pct, ACCOUNTING_BONUS_TIERS);

  const handleSubmit = async () => {
    const didSave = await submitEntry({
      scorecardRole: "accounting",
      employeeName: "Renice",
      reviewerName: reviewer,
      weekStartDate: week,
      assignedUserId,
      scores: {
        ...scores,
        compliance_passed: passed,
        compliance_total: total,
        compliance_pct: pct,
        projected_bonus_tier: bonus.label,
      },
      notes,
    });

    if (didSave) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h1 className="text-xl font-bold text-emerald-400 text-center">Accounting KPI Scorecard</h1>
          <p className="text-gray-500 text-center text-xs mt-1">TSM Roofing • Roof Pro Hub</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee</label>
              <div className="mt-1 px-3 py-2 text-sm font-bold bg-gray-100 border border-gray-300 rounded-lg">Renice</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Week Starting</label>
              <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviewed By</label>
              <select value={reviewer} onChange={(e) => setReviewer(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                <option value="">Select reviewer...</option>
                {reviewers.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Compliance Score</div>
          <ScoreBar passed={passed} total={total} />
          {failed > 0 && <div className="mt-2 text-xs text-red-600 font-medium">{failed} item{failed > 1 ? "s" : ""} failed this week</div>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-900 text-white"><th className="px-4 py-2.5 text-left text-xs font-bold uppercase">KPI</th><th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-32">Target</th><th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-36">Score</th></tr></thead>
            <tbody>
              {ACCOUNTING_KPIS.map((kpi, i) => (
                <tr key={kpi.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${scores[kpi.id] === false ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-2.5"><div className="font-medium text-gray-900">{kpi.name}</div><div className="text-xs text-gray-400 mt-0.5">{kpi.description}</div></td>
                  <td className="px-4 py-2.5 text-center"><span className="text-xs text-gray-400">Pass/Fail</span></td>
                  <td className="px-4 py-2.5"><div className="flex justify-center"><PassFail value={scores[kpi.id]} onChange={(v) => updateScore(kpi.id, v)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`rounded-xl border p-4 mb-4 ${bonus.bg}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monthly Bonus Projection</div>
          <div className={`text-lg font-bold ${bonus.color}`}>{bonus.label}</div>
          <div className="text-xs text-gray-500 mt-1">90%+ = $500 | 83–89% = $300 | 75–82% = $150 | Below 75% = $0</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviewer Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Feedback and action items..." className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>
        <button onClick={handleSubmit} disabled={submitted || isSubmitting} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-all text-sm disabled:opacity-50">
          {submitted ? "✓ Scorecard Submitted" : isSubmitting ? "Saving..." : "Submit Weekly Scorecard"}
        </button>
        <div className="text-center text-xs text-gray-400 mt-3">TSM Roofing LLC • Roof Pro Hub • Weekly KPI Scorecard</div>
      </div>
    </div>
  );
}

export default AccountingScorecard;
