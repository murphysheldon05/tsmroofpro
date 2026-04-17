import { useState } from "react";
import { useWeeklyScorecardSubmission } from "@/hooks/useWeeklyScorecardSubmission";

// ─── KPI DEFINITIONS ────────────────────────────────────────────────────────
const KPIS = [
  {
    id: "sop",
    name: "SOP Compliance",
    description: "100% adherence to all TSM SOPs and operational expectations — no reminders needed",
    type: "pass_fail",
  },
  {
    id: "apps",
    name: "App Compliance",
    description: "100% usage of AccuLynx, RingCentral, TSM Roof Pro Hub, CompanyCam — every job, every time",
    type: "pass_fail",
  },
  {
    id: "ringcentral",
    name: "RingCentral Only",
    description: "All business communications through RingCentral — zero personal cell, zero outside texts/calls",
    type: "pass_fail",
  },
  {
    id: "self_gen",
    name: "Self-Gen Inspections",
    description: "Quality self-generated inspections logged in AccuLynx this week (photos, contact info, scope complete)",
    type: "number",
    target: 4,
  },
  {
    id: "office_leads",
    name: "Office Leads Worked",
    description: "Office leads received and appointment completed this week",
    type: "number",
    target: 4,
  },
  {
    id: "one_to_one",
    name: "1-to-1 Ratio Met",
    description: "Self-gen inspections this week ≥ office leads received this week. Running monthly compliance enforced.",
    type: "pass_fail",
  },
  {
    id: "salesrabbit",
    name: "SalesRabbit Activity",
    description: "Doors knocked this week logged in SalesRabbit. Min 100 doors/wk for full compliance.",
    type: "number",
    target: 100,
  },
  {
    id: "field_activity",
    name: "In the Field",
    description: "Active in field canvassing/D2D/networking during core hours — not working from home",
    type: "pass_fail",
  },
  {
    id: "sales_meetings",
    name: "Sales Meetings & Huddles",
    description: "Attended all required sales meetings, huddles, and training sessions this week",
    type: "pass_fail",
  },
  {
    id: "acculynx_quality",
    name: "AccuLynx File Quality",
    description: "All jobs in pipeline have complete files: photos, measurements, contact info, status current. No orphan leads.",
    type: "pass_fail",
  },
  {
    id: "commission_sub",
    name: "Commission Submitted",
    description: "All eligible commissions submitted by Friday 11:59 PM — no exceptions",
    type: "pass_fail",
  },
  {
    id: "no_shows",
    name: "Zero No-Shows",
    description: "Rep showed up on time to every scheduled appointment this week. Zero no-shows or unexcused lates.",
    type: "pass_fail",
  },
  {
    id: "revenue",
    name: "Closed Revenue",
    description: "Total contract value of deals closed and signed this week",
    type: "currency",
    target: 17350,
  },
  {
    id: "deals_closed",
    name: "Deals Closed",
    description: "Number of contracts signed this week",
    type: "number",
    target: 2,
  },
];

// ─── SHARED UI COMPONENTS ────────────────────────────────────────────────────
function PassFail({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
          value === true
            ? "bg-emerald-500 text-white"
            : "bg-gray-100 text-gray-400 hover:bg-emerald-50"
        }`}
      >
        PASS
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
          value === false
            ? "bg-red-500 text-white"
            : "bg-gray-100 text-gray-400 hover:bg-red-50"
        }`}
      >
        FAIL
      </button>
    </div>
  );
}

function NumberInput({ value, onChange, prefix }) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-gray-400 text-sm">{prefix}</span>}
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-24 px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />
    </div>
  );
}

function ScoreBar({ passed, total }) {
  const pct = total > 0 ? (passed / total) * 100 : 0;
  const color =
    pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold font-mono text-gray-700">
        {passed}/{total}
      </span>
      <span
        className={`text-xs font-bold ${
          pct >= 90
            ? "text-emerald-600"
            : pct >= 70
            ? "text-yellow-600"
            : "text-red-600"
        }`}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SalesRepScorecard({ repName = "Sales Rep", repId }) {
  const [week, setWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  });

  const reviewers = ["Conrad Demecs", "Jordan Pollei", "Manny Madrid", "Sheldon Murphy"];
  const [reviewer, setReviewer] = useState("");
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { submitEntry, isSubmitting } = useWeeklyScorecardSubmission();

  const updateScore = (id, value) =>
    setScores((prev) => ({ ...prev, [id]: value }));

  // 1:1 auto-calc
  const selfGen = scores["self_gen"] || 0;
  const officeLeads = scores["office_leads"] || 0;
  const ratioMet = officeLeads === 0 ? true : selfGen >= officeLeads;
  const ratioDisplay = officeLeads > 0 ? `${selfGen} / ${officeLeads}` : "—";
  const ratioColor = ratioMet ? "text-emerald-600" : "text-red-600";

  // SalesRabbit color guide
  const doors = scores["salesrabbit"] || 0;
  const doorsColor =
    doors >= 100 ? "text-emerald-600" : doors >= 60 ? "text-yellow-600" : "text-red-600";
  const doorsLabel =
    doors >= 100 ? "✓ At Target" : doors >= 60 ? "Below Target" : doors > 0 ? "⚠ Low Activity" : "";

  const passFails = KPIS.filter((k) => k.type === "pass_fail");
  const passed = passFails.filter((k) => scores[k.id] === true).length;
  const failed = passFails.filter((k) => scores[k.id] === false).length;
  const totalPF = passFails.length;

  // Vehicle eligibility checks
  const vehicleChecks = {
    oneToOne: scores["one_to_one"] === true,
    revenue75k: (scores["revenue_ytd"] || 0) >= 75000,
    drugTest: scores["drug_test"] === true,
    mvd: scores["mvd_submitted"] === true,
  };
  const vehicleEligible = Object.values(vehicleChecks).every(Boolean);

  const handleSubmit = async () => {
    const didSave = await submitEntry({
      scorecardRole: "sales_rep",
      employeeName: repName,
      reviewerName: reviewer,
      weekStartDate: week,
      assignedUserId: repId ?? null,
      scores: {
        ...scores,
        rep_id: repId ?? null,
        compliance_passed: passed,
        compliance_total: totalPF,
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

        {/* Header */}
        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h1 className="text-xl font-bold text-emerald-400 text-center">
            Weekly Sales Rep KPI Scorecard
          </h1>
          <p className="text-gray-500 text-center text-xs mt-1">
            TSM Roofing • Roof Pro Hub
          </p>
        </div>

        {/* Rep / Week / Reviewer */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sales Rep
              </label>
              <div className="mt-1 px-3 py-2 text-sm font-bold bg-gray-100 border border-gray-300 rounded-lg">
                {repName}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Week Starting
              </label>
              <input
                type="date"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Reviewed By
              </label>
              <select
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              >
                <option value="">Select reviewer...</option>
                {reviewers.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 1:1 Ratio Banner */}
        <div
          className={`rounded-xl border p-3 mb-4 flex items-center justify-between ${
            ratioMet
              ? "bg-emerald-50 border-emerald-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              1-to-1 Ratio (This Week)
            </div>
            <div className={`text-lg font-bold font-mono mt-0.5 ${ratioColor}`}>
              Self-Gen {ratioDisplay} Office Leads
            </div>
          </div>
          <div
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              ratioMet
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {ratioMet ? "✓ Compliant" : "⚠ Deficient"}
          </div>
        </div>

        {/* Compliance Score Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Compliance Score
          </div>
          <ScoreBar passed={passed} total={totalPF} />
          {failed > 0 && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              {failed} compliance item{failed > 1 ? "s" : ""} failed this week
            </div>
          )}
        </div>

        {/* KPI Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-4 py-2.5 text-left text-xs font-bold uppercase">
                  KPI
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-32">
                  Target
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-36">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {KPIS.map((kpi, i) => (
                <tr
                  key={kpi.id}
                  className={`border-b border-gray-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } ${scores[kpi.id] === false ? "bg-red-50" : ""}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{kpi.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {kpi.description}
                    </div>
                    {/* SalesRabbit color hint */}
                    {kpi.id === "salesrabbit" && doors > 0 && (
                      <div className={`text-xs font-bold mt-1 ${doorsColor}`}>
                        {doorsLabel}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {kpi.type === "pass_fail" && (
                      <span className="text-xs text-gray-400">Pass/Fail</span>
                    )}
                    {kpi.type === "number" && (
                      <span className="text-xs font-mono text-gray-500">
                        {kpi.target}/wk
                      </span>
                    )}
                    {kpi.type === "currency" && (
                      <span className="text-xs font-mono text-gray-500">
                        ${kpi.target?.toLocaleString()}/wk
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center">
                      {kpi.type === "pass_fail" && (
                        <PassFail
                          value={scores[kpi.id]}
                          onChange={(v) => updateScore(kpi.id, v)}
                        />
                      )}
                      {kpi.type === "number" && (
                        <NumberInput
                          value={scores[kpi.id]}
                          onChange={(v) => updateScore(kpi.id, v)}
                        />
                      )}
                      {kpi.type === "currency" && (
                        <NumberInput
                          value={scores[kpi.id]}
                          onChange={(v) => updateScore(kpi.id, v)}
                          prefix="$"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vehicle Eligibility */}
        <div
          className={`rounded-xl border p-4 mb-4 ${
            vehicleEligible
              ? "bg-emerald-50 border-emerald-300"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Vehicle Eligibility Tracker
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={vehicleChecks.oneToOne ? "text-emerald-600" : "text-gray-400"}>
                {vehicleChecks.oneToOne ? "✓" : "✗"}
              </span>
              <span>1-to-1 Lead Gen Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={vehicleChecks.revenue75k ? "text-emerald-600" : "text-gray-400"}>
                {vehicleChecks.revenue75k ? "✓" : "✗"}
              </span>
              <span>$75K Revenue (tracked in Hub)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={vehicleChecks.drugTest ? "text-emerald-600" : "text-gray-400"}>
                ○
              </span>
              <span>Drug Test Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={vehicleChecks.mvd ? "text-emerald-600" : "text-gray-400"}>
                ○
              </span>
              <span>MVD Record Submitted</span>
            </div>
          </div>
          {vehicleEligible && (
            <div className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-lg px-3 py-2">
              ✓ All vehicle eligibility criteria met
            </div>
          )}
        </div>

        {/* Manager Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Manager Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Coaching notes, observations, action items for next week..."
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitted || isSubmitting}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitted
            ? "✓ Scorecard Submitted"
            : isSubmitting
            ? "Saving..."
            : "Submit Weekly Scorecard"}
        </button>

        <div className="text-center text-xs text-gray-400 mt-3">
          TSM Roofing LLC • Roof Pro Hub • Weekly KPI Scorecard
        </div>
      </div>
    </div>
  );
}
