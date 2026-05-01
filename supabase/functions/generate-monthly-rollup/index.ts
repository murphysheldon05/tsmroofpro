import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const bonusTiers: Record<string, Array<{ min: number; label: string; amount: number }>> = {
  sales_manager: [
    { min: 92, label: "Tier 1", amount: 750 },
    { min: 85, label: "Tier 2", amount: 500 },
    { min: 80, label: "Tier 3", amount: 250 },
    { min: 0, label: "No Bonus", amount: 0 },
  ],
  office_admin: [
    { min: 92, label: "Tier 1", amount: 750 },
    { min: 85, label: "Tier 2", amount: 500 },
    { min: 80, label: "Tier 3", amount: 250 },
    { min: 0, label: "No Bonus", amount: 0 },
  ],
  accounting: [
    { min: 90, label: "Tier 1", amount: 500 },
    { min: 83, label: "Tier 2", amount: 300 },
    { min: 75, label: "Tier 3", amount: 150 },
    { min: 0, label: "No Bonus", amount: 0 },
  ],
  production: [
    { min: 90, label: "Tier 1", amount: 500 },
    { min: 83, label: "Tier 2", amount: 300 },
    { min: 75, label: "Tier 3", amount: 150 },
    { min: 0, label: "No Bonus", amount: 0 },
  ],
  supplement: [
    { min: 90, label: "Tier 1", amount: 500 },
    { min: 83, label: "Tier 2", amount: 300 },
    { min: 75, label: "Tier 3", amount: 150 },
    { min: 0, label: "No Bonus", amount: 0 },
  ],
};

function getMonthWindow(monthYear?: string) {
  const target = monthYear
    ? new Date(`${monthYear}-01T00:00:00`)
    : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  return {
    monthYear: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

function getCompliancePct(scores: Record<string, unknown>) {
  const stored = Number(scores.compliance_pct ?? 0);
  if (!Number.isNaN(stored) && stored > 0) return stored;
  const passed = Number(scores.compliance_passed ?? 0);
  const total = Number(scores.compliance_total ?? 0);
  return total ? Math.round((passed / total) * 100) : 0;
}

/** Aligns with app `computeSalesRepComplianceTotals` (typed columns on `kpi_scorecard_entries`). */
function getSalesRepComplianceFromNormalizedColumns(entry: Record<string, unknown>) {
  const doors_knocked = Number(entry.doors_knocked ?? 0);
  const one_to_ones = !!entry.one_to_ones;
  const lead_gen_1_2 = !!entry.lead_gen_1_2;
  const chamber_activities = !!entry.chamber_activities;
  const social_media_posts = Number(entry.social_media_posts ?? 0);
  const crm_hygiene = !!entry.crm_hygiene;
  const sales_meeting_huddles = !!entry.sales_meeting_huddles;

  const checks = [
    doors_knocked >= 50,
    one_to_ones,
    lead_gen_1_2,
    chamber_activities,
    social_media_posts >= 1,
    crm_hygiene,
    sales_meeting_huddles,
  ];
  const compliance_passed = checks.filter(Boolean).length;
  const compliance_total = checks.length;
  return { compliance_passed, compliance_total };
}

function shouldUseNormalizedSalesRepCompliance(entry: Record<string, unknown>) {
  return entry.scorecard_role === "sales_rep" && typeof entry.doors_knocked === "number";
}

function getCompliancePctForEntry(entry: Record<string, unknown>) {
  if (shouldUseNormalizedSalesRepCompliance(entry)) {
    const { compliance_passed, compliance_total } = getSalesRepComplianceFromNormalizedColumns(entry);
    if (compliance_total > 0) {
      return Math.round((compliance_passed / compliance_total) * 100);
    }
  }

  const rawScores =
    typeof entry.scores === "object" && entry.scores !== null ? (entry.scores as Record<string, unknown>) : {};
  return getCompliancePct(rawScores);
}

function getRatingLabel(avg: number | null) {
  if (avg == null) return null;
  if (avg >= 3.5) return "Exceptional";
  if (avg >= 2.5) return "Meeting Standard";
  if (avg >= 1.5) return "Below Expectations";
  return "Needs Immediate Attention";
}

async function createNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string,
) {
  await supabase.from("user_notifications").insert({
    user_id: userId,
    notification_type: notificationType,
    title,
    message,
    entity_type: entityType,
    entity_id: entityId,
  });
}

function emailShell(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#111827;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#111;color:#fff;padding:20px 24px;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#00D26A;">TSM Roofing</div>
        <h1 style="margin:8px 0 0;font-size:22px;">${title}</h1>
      </div>
      <div style="padding:24px;">${body}</div>
    </div>
  </body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const body = await req.json().catch(() => ({}));
    const { monthYear, start, end, label } = getMonthWindow(body?.monthYear);

    const { data: entries, error } = await supabase
      .from("kpi_scorecard_entries")
      .select("*")
      .gte("week_start_date", start)
      .lte("week_start_date", end)
      .order("employee_name", { ascending: true });

    if (error) throw error;

    const grouped = new Map<string, any[]>();
    for (const entry of entries ?? []) {
      const key = `${entry.scorecard_role}::${entry.employee_name}`;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }

    for (const groupEntries of grouped.values()) {
      const sample = groupEntries[0];
      const weeklyBreakdown = groupEntries.map((entry) => ({
        week_start_date: entry.week_start_date,
        compliance_pct: getCompliancePctForEntry(entry as Record<string, unknown>),
        average_score: Number(entry.scores?.average_score ?? 0) || null,
      }));

      let monthlyAvgPct: number | null = null;
      let monthlyAvgRating: number | null = null;
      let monthlyRatingLabel: string | null = null;
      let bonusAmount = 0;
      let bonusTierLabel: string | null = null;

      if (sample.scorecard_role === "operations") {
        const ratings = groupEntries
          .map((entry) => Number(entry.scores?.average_score ?? 0))
          .filter((value) => value > 0);
        monthlyAvgRating = ratings.length
          ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
          : null;
        monthlyRatingLabel = getRatingLabel(monthlyAvgRating);
      } else {
        const averages = groupEntries.map((entry) =>
          getCompliancePctForEntry(entry as Record<string, unknown>),
        );
        monthlyAvgPct = averages.length
          ? averages.reduce((sum, value) => sum + value, 0) / averages.length
          : null;

        const tier = bonusTiers[sample.scorecard_role]?.find(
          (candidate) => monthlyAvgPct != null && monthlyAvgPct >= candidate.min,
        );
        bonusAmount = tier?.amount ?? 0;
        bonusTierLabel = tier?.label ?? null;
      }

      const bonusStatus = bonusAmount > 0 ? "pending" : "no_bonus";
      await supabase.from("kpi_monthly_rollups").upsert(
        {
          employee_name: sample.employee_name,
          employee_user_id: sample.assigned_user_id,
          scorecard_role: sample.scorecard_role,
          month_year: monthYear,
          weeks_submitted: groupEntries.length,
          monthly_avg_pct: monthlyAvgPct,
          monthly_avg_rating: monthlyAvgRating,
          monthly_rating_label: monthlyRatingLabel,
          bonus_amount: bonusAmount,
          bonus_tier_label: bonusTierLabel,
          bonus_status: bonusStatus,
          weekly_breakdown: weeklyBreakdown,
        },
        { onConflict: "employee_name,scorecard_role,month_year" },
      );

      if (Deno.env.get("RESEND_API_KEY")) {
        const targetProfile = sample.assigned_user_id
          ? await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", sample.assigned_user_id)
              .maybeSingle()
          : { data: null };

        if (targetProfile.data?.email) {
          await resend.emails.send({
            from: "TSM Hub <notifications@tsmroofpro.com>",
            to: [targetProfile.data.email],
            subject: `Your TSM Monthly KPI Summary — ${label}`,
            html: emailShell(
              `Monthly KPI Summary — ${label}`,
              `<p>Hi ${targetProfile.data.full_name?.split(" ")[0] ?? "there"},</p>
               <p>Here is your KPI summary for <strong>${label}</strong>.</p>
               <p>Weeks submitted: <strong>${groupEntries.length}</strong></p>
               <p>Monthly average: <strong>${
                 monthlyAvgPct != null
                   ? `${monthlyAvgPct.toFixed(1)}%`
                   : monthlyAvgRating != null
                   ? `${monthlyAvgRating.toFixed(2)}`
                   : "—"
               }</strong></p>
               <p>Bonus: <strong>${bonusTierLabel ?? "No Bonus"} ${bonusAmount > 0 ? `($${bonusAmount})` : ""}</strong></p>`,
            ),
          });
        }
      }
    }

    const { data: chamberLogs } = await supabase
      .from("chamber_activity_logs")
      .select("rep_user_id, manager_user_id")
      .gte("attended_on", start)
      .lte("attended_on", end);

    const { data: chamberAssignments } = await supabase
      .from("chamber_assignments")
      .select("user_id");

    const attendanceCounts = new Map<string, number>();
    for (const log of chamberLogs ?? []) {
      attendanceCounts.set(log.rep_user_id, (attendanceCounts.get(log.rep_user_id) ?? 0) + 1);
    }

    const { data: mannyProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", "Manny Madrid")
      .maybeSingle();

    for (const assignment of chamberAssignments ?? []) {
      const attended = attendanceCounts.get(assignment.user_id) ?? 0;
      if (attended >= 2) continue;

      const { data: rep } = await supabase
        .from("profiles")
        .select("id, full_name, email, manager_id")
        .eq("id", assignment.user_id)
        .maybeSingle();
      if (!rep?.id) continue;

      await createNotification(
        supabase,
        rep.id,
        "chamber_attendance_shortfall",
        "Chamber Attendance — Below Minimum",
        `You attended ${attended} of the required 2 Chamber events in ${label}.`,
        "chamber",
        rep.id,
      );

      if (rep.manager_id) {
        await createNotification(
          supabase,
          rep.manager_id,
          "chamber_attendance_shortfall",
          `Chamber Attendance Shortfall — ${rep.full_name}`,
          `${rep.full_name} attended only ${attended} Chamber events in ${label}.`,
          "chamber",
          rep.id,
        );
      }

      if (mannyProfile?.id) {
        await createNotification(
          supabase,
          mannyProfile.id,
          "chamber_attendance_shortfall",
          `Chamber Attendance Shortfall — ${rep.full_name}`,
          `${rep.full_name} attended only ${attended} Chamber events in ${label}.`,
          "chamber",
          rep.id,
        );
      }

      if (Deno.env.get("RESEND_API_KEY") && rep.email) {
        await resend.emails.send({
          from: "TSM Hub <notifications@tsmroofpro.com>",
          to: [rep.email],
          subject: `Chamber Attendance Notice — ${label}`,
          html: emailShell(
            `Chamber Attendance Notice — ${label}`,
            `<p>You attended ${attended} Chamber event(s) in ${label}, below the required 2.</p>`,
          ),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, monthYear }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
