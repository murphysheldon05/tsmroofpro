// ─────────────────────────────────────────────────────────────────────────────
// OperationsScorecard.jsx  (Manny Madrid)
// Scoring: Rating labels — no bonus, tracking only
// ─────────────────────────────────────────────────────────────────────────────
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

const RATING_OPTIONS = [
  { label: "Exceptional", value: 4, color: "bg-emerald-500" },
  { label: "Meeting Standard", value: 3, color: "bg-blue-500" },
  { label: "Below Expectations", value: 2, color: "bg-yellow-500" },
  { label: "Needs Immediate Attention", value: 1, color: "bg-red-600" },
];

const KPIS = [
  { id: "rep_sop", name: "Sales Rep SOP Enforcement", description: "Reps are following process — violations caught and addressed same day, not next week" },
  { id: "office_sop", name: "Office Staff SOP Enforcement", description: "Jayden and office staff actively managed to standard daily" },
  { id: "commission_review", name: "Commission Compliance Review", description: "Commission submissions reviewed and finalized by Tuesday 6 PM — zero exceptions" },
  { id: "acculynx_qc", name: "AccuLynx File Quality Control", description: "Files clean. Reps and production responding to file deficiencies within 24 hours." },
  { id: "one_to_one_audit", name: "1-to-1 Lead Audit", description: "Lead distribution is fair, no cherry-picking, no hoarding. 1:1 ratios verified weekly in AccuLynx." },
  { id: "warranty_tracking", name: "Warranty Tracking", description: "All warranties moving through the pipeline on schedule. Proactive follow-up on anything stalled." },
  { id: "vehicle_monitoring", name: "Vehicle Maintenance Monitoring", description: "Company fleet (trucks, trailers) current on maintenance. Nothing overdue. Checks documented." },
];

function RatingButtons({ value, onChange, disabled = false }) {
  return (
    <div className={`flex flex-wrap gap-1.5 justify-end ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      {RATING_OPTIONS.map((opt) => (
        <button
          type="button"
          key={opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 rounded text-xs font-bold transition-all whitespace-nowrap ${
            value === opt.value ? `${opt.color} text-white` : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function OperationsScorecard({ assignedUserId = null }) {
  const [week, setWeek] = useState(() => getCurrentWeekStartDate());
  const {
    scores,
    setScores,
    notes,
    setNotes,
    reviewerName,
    saveEntry,
    existingEntry,
    isEmployeeSubject,
    isAdmin,
    isSubmitted,
    isReadOnly,
    adminOverrideUnlocked,
    setAdminOverrideUnlocked,
  } = useWeeklyScorecardForm({
    scorecardRole: "operations",
    employeeName: "Manny Madrid",
    assignedUserId,
    weekStartDate: week,
    reviewerOptions: ["Sheldon Murphy"],
  });
  const updateScore = (id, v) => setScores((p) => ({ ...p, [id]: v }));
  const avgScore = KPIS.length > 0 ? (Object.values(scores).reduce((a, b) => a + (b || 0), 0) / KPIS.length).toFixed(1) : "—";

  const handleSubmit = async () => {
    await saveEntry.mutateAsync({
      reviewerName: reviewerName || "Sheldon Murphy",
      scores: {
        ...scores,
        average_score: avgScore,
      },
      notes,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h1 className="text-xl font-bold text-emerald-400 text-center">Operations & Compliance KPI Scorecard</h1>
          <p className="text-gray-500 text-center text-xs mt-1">TSM Roofing • Roof Pro Hub • Tracking Only — No Bonus</p>
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
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee</label>
              <div className="mt-1 px-3 py-2 text-sm font-bold bg-gray-100 border border-gray-300 rounded-lg">Manny Madrid</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Week Starting</label>
              <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="mt-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
            Scored by <span className="font-bold text-gray-700">Sheldon Murphy only</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase">KPI</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold uppercase w-80">Rating</th>
              </tr>
            </thead>
            <tbody>
              {KPIS.map((kpi, i) => (
                <tr key={kpi.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${scores[kpi.id] === 1 ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{kpi.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{kpi.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RatingButtons value={scores[kpi.id]} disabled={isReadOnly} onChange={(v) => updateScore(kpi.id, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
          <textarea value={notes} disabled={isReadOnly} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Performance observations, areas of focus..." className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none disabled:opacity-60" />
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

export default OperationsScorecard;
