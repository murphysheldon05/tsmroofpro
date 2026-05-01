import { useMemo, useState } from "react";
import { useWeeklyScorecardForm } from "@/hooks/useWeeklyKpiScorecards";
import {
  computeSalesRepComplianceTotals,
  getSalesRepDoorsTierLabel,
  getSalesRepPayCycleWeekEndDate,
  getSalesRepPayCycleWeekStartDate,
} from "@/lib/weeklyScorecardConfig";
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

// ─── KPI DEFINITIONS (normalized columns + pay-cycle week Sat–Fri) ───────────
const NUMERIC_KPIS = [
  {
    field: "doors_knocked",
    name: "Doors Knocked",
    description:
      "Logged in SalesRabbit for the pay week. Tiers: 50 / 150 / 300 (minimum pass for compliance = 50).",
    type: "number",
  },
  {
    field: "social_media_posts",
    name: "Social Media Posts",
    description: "Posts this pay week (target = 1 for full compliance).",
    type: "number",
    target: 1,
  },
];

const PASS_FAIL_KPIS = [
  {
    field: "one_to_ones",
    name: "1-to-1s",
    description: "1-to-1 coaching / ratio expectations met this week (P/F).",
  },
  {
    field: "lead_gen_1_2",
    name: "Lead Gen (1–2)",
    description: "1–2 leads generated this week (P/F).",
  },
  {
    field: "chamber_activities",
    name: "Chamber Activities",
    description: "Chamber participation completed as required (P/F).",
  },
  {
    field: "crm_hygiene",
    name: "CRM Hygiene",
    description: "Photos, samples, estimates within 24hr where applicable (P/F).",
  },
  {
    field: "sales_meeting_huddles",
    name: "Sales Meetings & Huddles",
    description: "Attended required sales meetings and huddles (P/F).",
  },
];

// ─── SHARED UI COMPONENTS ────────────────────────────────────────────────────
function PassFail({ value, onChange, disabled = false }) {
  return (
    <div className={`flex gap-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <button
        type="button"
        disabled={disabled}
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
        type="button"
        disabled={disabled}
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
  const [week, setWeek] = useState(() => getSalesRepPayCycleWeekStartDate());
  const weekEndDisplay = useMemo(() => getSalesRepPayCycleWeekEndDate(week), [week]);

  const reviewers = ["Conrad Demecs", "Jordan Pollei", "Manny Madrid", "Sheldon Murphy"];
  const {
    scores,
    setScores,
    salesRepKpis,
    setSalesRepKpis,
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
    scorecardRole: "sales_rep",
    employeeName: repName,
    assignedUserId: repId ?? null,
    weekStartDate: week,
    reviewerOptions: reviewers,
  });

  const doorsTierLabel = useMemo(
    () => getSalesRepDoorsTierLabel(salesRepKpis.doors_knocked),
    [salesRepKpis.doors_knocked],
  );

  const doorsColor =
    salesRepKpis.doors_knocked >= 300
      ? "text-emerald-600"
      : salesRepKpis.doors_knocked >= 150
        ? "text-emerald-600"
        : salesRepKpis.doors_knocked >= 50
          ? "text-yellow-600"
          : "text-red-600";

  const { compliance_passed: passed, compliance_total: totalPF } = useMemo(
    () => computeSalesRepComplianceTotals(salesRepKpis),
    [salesRepKpis],
  );
  const failed = totalPF - passed;

  const updateSalesRepField = (field, value) =>
    setSalesRepKpis((prev) => ({ ...prev, [field]: value }));

  const updateScore = (id, value) =>
    setScores((prev) => ({ ...prev, [id]: value }));

  const vehicleChecks = {
    leadGen: salesRepKpis.lead_gen_1_2 === true,
    revenue75k: (scores["revenue_ytd"] || 0) >= 75000,
    drugTest: scores["drug_test"] === true,
    mvd: scores["mvd_submitted"] === true,
  };
  const vehicleEligible = Object.values(vehicleChecks).every(Boolean);

  const handleSubmit = async () => {
    await saveEntry.mutateAsync({
      reviewerName,
      notes,
    });
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="branded-header rounded-2xl p-5 mb-4 animate-fade-in relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <h1 className="text-lg sm:text-xl font-extrabold text-primary text-center tracking-tight relative">
            Weekly Sales Rep KPI Scorecard
          </h1>
          <p className="text-muted-foreground text-center text-xs mt-1 relative">
            TSM Roofing • Roof Pro Hub • Pay cycle Sat–Fri
          </p>
        </div>

        {(isEmployeeSubject || isSubmitted) && (
          <div
            className={`rounded-xl border px-4 py-3 mb-4 ${isSubmitted ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {isSubmitted
                  ? "Submitted ✓"
                  : "Your scorecard for this week. Only your manager can score and submit this."}
              </div>
              {isSubmitted && isAdmin && !adminOverrideUnlocked && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="rounded-md border border-emerald-500/30 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700"
                    >
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
                Week Start (Saturday)
              </label>
              <input
                type="date"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">Week ends {weekEndDisplay} (Friday)</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Reviewed By
              </label>
              <select
                value={reviewerName}
                disabled={isReadOnly}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white disabled:opacity-60"
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

        {/* Compliance Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Compliance (7 KPIs)
          </div>
          <ScoreBar passed={passed} total={totalPF} />
          {failed > 0 && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              {failed} KPI{failed > 1 ? "s" : ""} below target this pay week
            </div>
          )}
        </div>

        {/* KPI Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 animate-fade-in">
          <div className="scroll-x-mobile">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-900 via-gray-800 to-emerald-900 text-white">
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">
                    KPI
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-32 tracking-wider">
                    Target
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold uppercase w-36 tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="row-stagger">
                {NUMERIC_KPIS.map((kpi, i) => (
                  <tr
                    key={kpi.field}
                    className={`border-b border-gray-100 transition-colors hover:bg-emerald-50/40 ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{kpi.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{kpi.description}</div>
                      {kpi.field === "doors_knocked" && salesRepKpis.doors_knocked >= 0 && (
                        <div className={`text-xs font-bold mt-1 ${doorsColor}`}>{doorsTierLabel}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {kpi.field === "doors_knocked" && (
                        <span className="text-xs font-mono text-gray-500">50 / 150 / 300</span>
                      )}
                      {kpi.field === "social_media_posts" && (
                        <span className="text-xs font-mono text-gray-500">1/wk</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <NumberInput
                          value={salesRepKpis[kpi.field]}
                          disabled={isReadOnly}
                          onChange={(v) => updateSalesRepField(kpi.field, v)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {PASS_FAIL_KPIS.map((kpi, i) => (
                  <tr
                    key={kpi.field}
                    className={`border-b border-gray-100 transition-colors hover:bg-emerald-50/40 ${
                      (i + NUMERIC_KPIS.length) % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } ${salesRepKpis[kpi.field] === false ? "bg-red-50" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{kpi.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{kpi.description}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs text-gray-400">Pass/Fail</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <PassFail
                          value={salesRepKpis[kpi.field]}
                          disabled={isReadOnly}
                          onChange={(v) => updateSalesRepField(kpi.field, v)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Eligibility (supplemental fields in scores JSON) */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={vehicleChecks.leadGen ? "text-emerald-600" : "text-gray-400"}>
                {vehicleChecks.leadGen ? "✓" : "✗"}
              </span>
              <span>Lead Gen 1–2 (weekly KPI)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NumberInput
                value={scores["revenue_ytd"] ?? 0}
                disabled={isReadOnly}
                prefix="$"
                onChange={(v) => updateScore("revenue_ytd", v)}
              />
              <span className="text-gray-600">YTD Revenue (≥ $75k for vehicle)</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-600">Drug Test Passed</span>
              <PassFail
                value={scores["drug_test"]}
                disabled={isReadOnly}
                onChange={(v) => updateScore("drug_test", v)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-600">MVD Record Submitted</span>
              <PassFail
                value={scores["mvd_submitted"]}
                disabled={isReadOnly}
                onChange={(v) => updateScore("mvd_submitted", v)}
              />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            Drug test & MVD are stored with this scorecard for eligibility tracking only.
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
            disabled={isReadOnly}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Coaching notes, observations, action items for next week..."
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none disabled:opacity-60"
          />
        </div>

        {!isEmployeeSubject && (!isSubmitted || adminOverrideUnlocked) && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveEntry.isPending}
            className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:shadow-[0_0_24px_hsl(142_72%_40%/0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveEntry.isPending
              ? "Saving..."
              : isSubmitted
                ? "Save Override"
                : "Submit Weekly Scorecard"}
          </button>
        )}

        <div className="text-center text-xs text-gray-400 mt-3">
          TSM Roofing LLC • Roof Pro Hub • Weekly KPI Scorecard
        </div>
      </div>
    </div>
  );
}
