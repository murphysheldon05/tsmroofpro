import { useState } from "react";
import { useWeeklyScorecardForm } from "@/hooks/useWeeklyKpiScorecards";
import { getCurrentWeekStartDate } from "@/lib/weeklyScorecardConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const KPIS = [
  {
    id: "sop",
    name: "SOP Compliance — Self",
    description: "Manager is personally following all TSM SOPs, leading by example",
    type: "pass_fail",
  },
  {
    id: "team_one_to_one",
    name: "Team 1-to-1 Compliance Rate",
    description: "All reps under this manager met their 1:1 self-gen to office lead ratio this week. Manager is accountable.",
    type: "pass_fail",
  },
  {
    id: "rep_one_on_ones",
    name: "Weekly 1-on-1s with Reps",
    description: "Manager conducted a performance 1-on-1 with each direct report this week",
    type: "pass_fail",
  },
  {
    id: "salesrabbit_oversight",
    name: "SalesRabbit Activity Oversight",
    description: "Manager reviewed each rep's SalesRabbit canvassing activity and held reps below minimum accountable",
    type: "pass_fail",
  },
  {
    id: "acculynx_audit",
    name: "AccuLynx Team File Audit",
    description: "Manager audited team CRM files this week — incomplete files flagged and corrected before week close",
    type: "pass_fail",
  },
  {
    id: "commission_compliance",
    name: "Commission Submission Compliance",
    description: "Every rep on this manager's team submitted commission paperwork by Friday 11:59 PM — 100% or explain",
    type: "pass_fail",
  },
  {
    id: "rep_no_shows",
    name: "Rep No-Show Rate",
    description: "Number of rep no-shows or unexcused appointment misses this week. Target: 0.",
    type: "number",
    target: 0,
  },
  {
    id: "team_revenue",
    name: "Team Revenue This Week",
    description: "Total submitted revenue across all reps on this manager's team",
    type: "currency",
    target: 69400,
  },
  {
    id: "team_deals",
    name: "Team Deals Closed",
    description: "Total deals signed across all reps this week",
    type: "number",
    target: 8,
  },
];

function PassFail({ value, onChange, disabled = false }) {
  return (
    <div className={`flex gap-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => onChange(true)}
        disabled={disabled}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${value === true ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-emerald-50"}`}
      >PASS</button>
      <button
        type="button"
        onClick={() => onChange(false)}
        disabled={disabled}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${value === false ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-red-50"}`}
      >FAIL</button>
    </div>
  );
}

function NumberInput({ value, onChange, prefix, disabled = false }) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-gray-400 text-sm">{prefix}</span>}
      <input
        type="number"
        min={0}
        disabled={disabled}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-24 px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
      />
    </div>
  );
}

function ScoreBar({ passed, total }) {
  const pct = total > 0 ? (passed / total) * 100 : 0;
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold font-mono text-gray-700">{passed}/{total}</span>
      <span className={`text-xs font-bold ${pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-yellow-600" : "text-red-600"}`}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// Bonus tier logic
function getBonusTier(pct) {
  if (pct >= 92) return { label: "Tier 1 — $750", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-300" };
  if (pct >= 85) return { label: "Tier 2 — $500", color: "text-blue-600", bg: "bg-blue-50 border-blue-300" };
  if (pct >= 80) return { label: "Tier 3 — $250", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-300" };
  return { label: "No Bonus", color: "text-red-600", bg: "bg-red-50 border-red-300" };
}

export default function SalesManagerScorecard({ managerName = "Sales Manager", assignedUserId = null }) {
  const [week, setWeek] = useState(() => getCurrentWeekStartDate());

  const reviewers = ["Manny Madrid", "Sheldon Murphy"];
  const {
    scores,
    setScores,
    notes,
    setNotes,
    reviewerName,
    setReviewerName,
    saveEntry,
    existingEntry,
    isEmployeeSubject,
    isAdmin,
    isSubmitted,
    isReadOnly,
    adminOverrideUnlocked,
    setAdminOverrideUnlocked,
  } = useWeeklyScorecardForm({
    scorecardRole: "sales_manager",
    employeeName: managerName,
    assignedUserId,
    weekStartDate: week,
    reviewerOptions: reviewers,
  });

  const updateScore = (id, value) => setScores((prev) => ({ ...prev, [id]: value }));

  const passFails = KPIS.filter((k) => k.type === "pass_fail");
  const passed = passFails.filter((k) => scores[k.id] === true).length;
  const failed = passFails.filter((k) => scores[k.id] === false).length;
  const totalPF = passFails.length;
  const compliancePct = totalPF > 0 ? Math.round((passed / totalPF) * 100) : 0;
  const bonus = getBonusTier(compliancePct);

  const handleSubmit = async () => {
    await saveEntry.mutateAsync({
      reviewerName,
      scores: {
        ...scores,
        compliance_passed: passed,
        compliance_total: totalPF,
        compliance_pct: compliancePct,
        projected_bonus_tier: bonus.label,
      },
      notes,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">

        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h1 className="text-xl font-bold text-emerald-400 text-center">Weekly Sales Manager KPI Scorecard</h1>
          <p className="text-gray-500 text-center text-xs mt-1">TSM Roofing • Roof Pro Hub</p>
        </div>

        {(isEmployeeSubject || isSubmitted) && (
          <div className={`rounded-xl border px-4 py-3 mb-4 ${isSubmitted ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {isSubmitted
                  ? "Submitted ✓"
                  : "Your scorecard for this week. Only your manager can score and submit this."}
              </div>
              {isSubmitted && isAdmin && !adminOverrideUnlocked && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="rounded-md border border-emerald-500/30 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Admin Override
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlock submitted scorecard?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will unlock the submitted scorecard so an admin can update it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => setAdminOverrideUnlocked(true)}>
                        Unlock
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {existingEntry?.submitted_at && (
              <div className="mt-1 text-xs opacity-80">
                Submitted {new Date(existingEntry.submitted_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager</label>
              <div className="mt-1 px-3 py-2 text-sm font-bold bg-gray-100 border border-gray-300 rounded-lg">{managerName}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Week Starting</label>
              <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviewed By</label>
              <select value={reviewerName} disabled={isReadOnly} onChange={(e) => setReviewerName(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white disabled:opacity-60">
                <option value="">Select reviewer...</option>
                {reviewers.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Compliance Score</div>
          <ScoreBar passed={passed} total={totalPF} />
          {failed > 0 && <div className="mt-2 text-xs text-red-600 font-medium">{failed} compliance item{failed > 1 ? "s" : ""} failed this week</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="scroll-x-mobile"><table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase">KPI</th>
                <th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-32">Target</th>
                <th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-36">Score</th>
              </tr>
            </thead>
            <tbody>
              {KPIS.map((kpi, i) => (
                <tr key={kpi.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${scores[kpi.id] === false ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{kpi.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{kpi.description}</div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {kpi.type === "pass_fail" && <span className="text-xs text-gray-400">Pass/Fail</span>}
                    {kpi.type === "number" && <span className="text-xs font-mono text-gray-500">{kpi.target}/wk</span>}
                    {kpi.type === "currency" && <span className="text-xs font-mono text-gray-500">${kpi.target?.toLocaleString()}/wk</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center">
                      {kpi.type === "pass_fail" && <PassFail value={scores[kpi.id]} disabled={isReadOnly} onChange={(v) => updateScore(kpi.id, v)} />}
                      {kpi.type === "number" && <NumberInput value={scores[kpi.id]} disabled={isReadOnly} onChange={(v) => updateScore(kpi.id, v)} />}
                      {kpi.type === "currency" && <NumberInput value={scores[kpi.id]} disabled={isReadOnly} onChange={(v) => updateScore(kpi.id, v)} prefix="$" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        {/* Monthly Bonus Projection */}
        <div className={`rounded-xl border p-4 mb-4 ${bonus.bg}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monthly Bonus Projection (Based on This Week)</div>
          <div className={`text-lg font-bold ${bonus.color}`}>{bonus.label}</div>
          <div className="text-xs text-gray-500 mt-1">92%+ = $750 | 85–91% = $500 | 80–84% = $250 | Below 80% = $0</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reviewer Notes</label>
          <textarea value={notes} disabled={isReadOnly} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Performance feedback, coaching focus areas, action items..." className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none disabled:opacity-60" />
        </div>

        {!isEmployeeSubject && (!isSubmitted || adminOverrideUnlocked) && (
          <button onClick={handleSubmit} disabled={saveEntry.isPending} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-all text-sm disabled:opacity-50">
            {saveEntry.isPending ? "Saving..." : isSubmitted ? "Save Override" : "Submit Weekly Scorecard"}
          </button>
        )}
        <div className="text-center text-xs text-gray-400 mt-3">TSM Roofing LLC • Roof Pro Hub • Weekly KPI Scorecard</div>
      </div>
    </div>
  );
}
