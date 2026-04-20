import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ScorecardEventType =
  | "scorecard_submitted"
  | "scorecard_edited"
  | "scorecard_overdue"
  | "scorecard_fail"
  | "scorecard_correction_plan";

interface ScorecardPayload {
  eventType: ScorecardEventType;
  entryId?: string;
  scorecardRole: string;
  employeeName: string;
  reviewerName?: string;
  weekStartDate: string;
  assignedUserId?: string | null;
  submittedByUserId?: string | null;
  scores?: Record<string, unknown>;
  notes?: string | null;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  kpiName?: string | null;
  overrideActorName?: string | null;
}

const appUrl = "https://tsmroofpro.com";

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(`${addDays(weekStartDate, 6)}T00:00:00`);
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

async function createInAppNotification(
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

async function getProfileById(
  supabase: ReturnType<typeof createClient>,
  userId: string | null | undefined,
) {
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, manager_id")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function getProfileByName(
  supabase: ReturnType<typeof createClient>,
  fullName: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, manager_id")
    .eq("full_name", fullName)
    .maybeSingle();
  return data;
}

async function getLeadershipRecipients(
  supabase: ReturnType<typeof createClient>,
) {
  const recipients = [];
  for (const name of ["Manny Madrid", "Sheldon Murphy"]) {
    const profile = await getProfileByName(supabase, name);
    if (profile) recipients.push(profile);
  }
  return recipients;
}

function getFailedKpis(scores: Record<string, unknown> | undefined) {
  if (!scores) return [];
  return Object.entries(scores)
    .filter(([key, value]) => {
      if (key.startsWith("compliance_") || key.endsWith("_id")) return false;
      return value === false || value === 1;
    })
    .map(([key]) => key);
}

function htmlShell(title: string, body: string) {
  return `<!DOCTYPE html>
  <html>
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#111111;color:#ffffff;padding:20px 24px;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#00D26A;">TSM Roofing</div>
          <h1 style="margin:8px 0 0;font-size:22px;">${title}</h1>
        </div>
        <div style="padding:24px;line-height:1.6;">${body}</div>
      </div>
    </body>
  </html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
) {
  if (!Deno.env.get("RESEND_API_KEY")) return;
  await resend.emails.send({
    from: "TSM Hub <notifications@tsmroofpro.com>",
    to: [to],
    subject,
    html,
  });
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

    const payload = (await req.json()) as ScorecardPayload;
    const weekLabel = formatWeekLabel(payload.weekStartDate);
    const employeeProfile =
      (await getProfileById(supabase, payload.assignedUserId)) ??
      (await getProfileByName(supabase, payload.employeeName));

    if (payload.eventType === "scorecard_submitted" && employeeProfile?.id) {
      const title = "KPI scorecard submitted";
      const message = `${payload.reviewerName ?? "Your reviewer"} submitted your weekly KPI scorecard for the week of ${weekLabel}.`;
      await createInAppNotification(
        supabase,
        employeeProfile.id,
        "scorecard_submitted",
        title,
        message,
        "kpi_scorecard",
        payload.scorecardRole,
      );
      if (employeeProfile.email) {
        await sendEmail(
          employeeProfile.email,
          `Your TSM Weekly KPI Scorecard — Week of ${payload.weekStartDate}`,
          htmlShell(
            "Weekly KPI Scorecard Submitted",
            `<p>Hi ${employeeProfile.full_name?.split(" ")[0] ?? "there"},</p>
             <p>${payload.reviewerName ?? "Your reviewer"} submitted your weekly KPI scorecard for <strong>${weekLabel}</strong>.</p>
             <p>You can review it in Roof Pro Hub.</p>`,
          ),
        );
      }
    }

    if (payload.eventType === "scorecard_edited" && employeeProfile?.id) {
      const actor = payload.overrideActorName ?? payload.reviewerName ?? "An admin";
      const title = "KPI scorecard updated";
      const message = `Your KPI scorecard for the week of ${weekLabel} was updated by ${actor}.`;
      await createInAppNotification(
        supabase,
        employeeProfile.id,
        "scorecard_edited",
        title,
        message,
        "kpi_scorecard",
        payload.scorecardRole,
      );
      if (employeeProfile.email) {
        await sendEmail(
          employeeProfile.email,
          `Your KPI scorecard was updated — Week of ${payload.weekStartDate}`,
          htmlShell(
            "KPI Scorecard Updated",
            `<p>Hi ${employeeProfile.full_name?.split(" ")[0] ?? "there"},</p>
             <p>Your KPI scorecard for <strong>${weekLabel}</strong> was updated by ${actor}.</p>`,
          ),
        );
      }
    }

    const failedKpis = getFailedKpis(payload.scores);
    if (failedKpis.length > 0) {
      const leaders = await getLeadershipRecipients(supabase);
      for (const failedKpi of failedKpis) {
        for (const leader of leaders) {
          await createInAppNotification(
            supabase,
            leader.id,
            "scorecard_fail",
            "Scorecard fail alert",
            `${payload.employeeName} scored a fail on ${failedKpi} for ${weekLabel}.`,
            "kpi_scorecard",
            payload.scorecardRole,
          );
        }

        const { data: previousRows } = await supabase
          .from("kpi_scorecard_entries")
          .select("scores")
          .eq("scorecard_role", payload.scorecardRole)
          .eq("employee_name", payload.employeeName)
          .lt("week_start_date", payload.weekStartDate)
          .order("week_start_date", { ascending: false })
          .limit(1);

        const previousScores = previousRows?.[0]?.scores as Record<string, unknown> | undefined;
        const previousFailed = previousScores?.[failedKpi] === false || previousScores?.[failedKpi] === 1;

        if (previousFailed) {
          for (const leader of leaders) {
            await createInAppNotification(
              supabase,
              leader.id,
              "scorecard_correction_plan",
              "Correction plan required",
              `${payload.employeeName} has failed ${failedKpi} for 2 consecutive weeks.`,
              "kpi_scorecard",
              payload.scorecardRole,
            );
            if (leader.email) {
              await sendEmail(
                leader.email,
                `Correction Plan Required — ${payload.employeeName}`,
                htmlShell(
                  "Correction Plan Required",
                  `<p>${payload.employeeName} has failed <strong>${failedKpi}</strong> for two consecutive weeks.</p>`,
                ),
              );
            }
          }
        }
      }
    }

    if (payload.eventType === "scorecard_overdue" && payload.recipientUserId) {
      await createInAppNotification(
        supabase,
        payload.recipientUserId,
        "scorecard_overdue",
        "Weekly KPI scorecard overdue",
        `Reminder: ${payload.employeeName}'s KPI scorecard has not been scored for ${weekLabel}.`,
        "kpi_scorecard",
        payload.scorecardRole,
      );
    }

    return new Response(JSON.stringify({ success: true }), {
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
