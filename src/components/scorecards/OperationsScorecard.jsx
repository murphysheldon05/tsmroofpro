// ─────────────────────────────────────────────────────────────────────────────
// OperationsScorecard.jsx  (Manny Madrid)
// Scoring: Rating labels — no bonus, tracking only
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { useWeeklyScorecardSubmission } from "@/hooks/useWeeklyScorecardSubmission";

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

function RatingButtons({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {RATING_OPTIONS.map((opt) => (
        <button
          key={opt.value}
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

export function OperationsScorecard() {
  const [week, setWeek] = useState(() => {
    const d = new Date(); const day = d.getDay();
    const monday = new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)));
    return monday.toISOString().split("T")[0];
  });
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { submitEntry, isSubmitting } = useWeeklyScorecardSubmission();
  const updateScore = (id, v) => setScores((p) => ({ ...p, [id]: v }));
  const avgScore = KPIS.length > 0 ? (Object.values(scores).reduce((a, b) => a + (b || 0), 0) / KPIS.length).toFixed(1) : "—";

  const handleSubmit = async () => {
    const didSave = await submitEntry({
      scorecardRole: "operations",
      employeeName: "Manny Madrid",
      reviewerName: "Sheldon Murphy",
      weekStartDate: week,
      scores: {
        ...scores,
        average_score: avgScore,
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
          <h1 className="text-xl font-bold text-emerald-400 text-center">Operations & Compliance KPI Scorecard</h1>
          <p className="text-gray-500 text-center text-xs mt-1">TSM Roofing • Roof Pro Hub • Tracking Only — No Bonus</p>
        </div>
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
                    <RatingButtons value={scores[kpi.id]} onChange={(v) => updateScore(kpi.id, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Performance observations, areas of focus..." className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
        </div>
        <button onClick={handleSubmit} disabled={submitted || isSubmitting} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-all text-sm disabled:opacity-50">
          {submitted ? "✓ Scorecard Submitted" : isSubmitting ? "Saving..." : "Submit Weekly Scorecard"}
        </button>
        <div className="text-center text-xs text-gray-400 mt-3">TSM Roofing LLC • Roof Pro Hub • Weekly KPI Scorecard</div>
      </div>
    </div>
  );
}

export default OperationsScorecard;
