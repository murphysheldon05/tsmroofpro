import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChamberNotificationPayload {
  eventType:
    | "chamber_assignment"
    | "chamber_event_created"
    | "chamber_event_updated"
    | "chamber_activity_logged";
  chamberId?: string | null;
  chamberName?: string | null;
  eventId?: string | null;
  eventName?: string | null;
  repUserId?: string | null;
  managerUserId?: string | null;
  actorUserId?: string | null;
  contactsMade?: number;
  inspectionsGenerated?: number;
  notes?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  eventLocation?: string | null;
}

async function createInAppNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  entityId: string,
) {
  await supabase.from("user_notifications").insert({
    user_id: userId,
    notification_type: notificationType,
    title,
    message,
    entity_type: "chamber",
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

async function leadership(supabase: ReturnType<typeof createClient>) {
  const result = [];
  for (const name of ["Manny Madrid", "Sheldon Murphy"]) {
    const profile = await getProfileByName(supabase, name);
    if (profile) result.push(profile);
  }
  return result;
}

function shell(title: string, body: string) {
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
    const payload = (await req.json()) as ChamberNotificationPayload;
    const rep = await getProfileById(supabase, payload.repUserId);
    const actor = await getProfileById(supabase, payload.actorUserId);
    const manager = await getProfileById(supabase, payload.managerUserId ?? rep?.manager_id);
    const leaders = await leadership(supabase);
    const entityId = payload.eventId ?? payload.chamberId ?? payload.repUserId ?? crypto.randomUUID();

    if (payload.eventType === "chamber_assignment" && rep?.id && payload.chamberName) {
      await createInAppNotification(
        supabase,
        rep.id,
        "chamber_assignment",
        "Chamber Assignment",
        `You have been assigned to ${payload.chamberName}. Check your Chamber dashboard for upcoming events and requirements.`,
        entityId,
      );

      if (Deno.env.get("RESEND_API_KEY") && rep.email) {
        await resend.emails.send({
          from: "TSM Hub <notifications@tsmroofpro.com>",
          to: [rep.email],
          subject: `TSM Chamber Assignment — ${payload.chamberName}`,
          html: shell(
            `Chamber Assignment — ${payload.chamberName}`,
            `<p>Hi ${rep.full_name?.split(" ")[0] ?? "there"},</p>
             <p>You have been assigned to represent TSM Roofing at <strong>${payload.chamberName}</strong>.</p>
             <p>Your responsibilities:</p>
             <ul>
               <li>Attend a minimum of 2 Chamber events per month</li>
               <li>Log attendance and contact notes after each event in Roof Pro Hub</li>
               <li>Self-generate at least 1 inspection per Chamber event attended</li>
             </ul>`,
          ),
        });
      }

      for (const leader of leaders) {
        await createInAppNotification(
          supabase,
          leader.id,
          "chamber_assignment",
          "Chamber Assignment",
          `${rep.full_name} has been assigned to ${payload.chamberName} by ${actor?.full_name ?? "a manager"}.`,
          entityId,
        );
      }
    }

    if (
      (payload.eventType === "chamber_event_created" ||
        payload.eventType === "chamber_event_updated") &&
      payload.chamberId &&
      payload.eventName
    ) {
      const { data: assignments } = await supabase
        .from("chamber_assignments")
        .select("user_id")
        .eq("chamber_id", payload.chamberId);

      for (const assignment of assignments ?? []) {
        const assignedRep = await getProfileById(supabase, assignment.user_id);
        if (!assignedRep?.id) continue;

        const title =
          payload.eventType === "chamber_event_created"
            ? "Chamber Event New"
            : "Chamber Event Updated";
        const message =
          payload.eventType === "chamber_event_created"
            ? `New event: ${payload.eventName} on ${payload.eventDate ?? "scheduled date"} at ${payload.eventTime ?? "TBD"} — ${payload.eventLocation ?? "TBD"}.`
            : `${payload.eventName} has been updated. New date/time: ${payload.eventDate ?? "TBD"} at ${payload.eventTime ?? "TBD"}.`;

        await createInAppNotification(
          supabase,
          assignedRep.id,
          payload.eventType,
          title,
          message,
          entityId,
        );

        if (Deno.env.get("RESEND_API_KEY") && assignedRep.email) {
          await resend.emails.send({
            from: "TSM Hub <notifications@tsmroofpro.com>",
            to: [assignedRep.email],
            subject:
              payload.eventType === "chamber_event_created"
                ? `New Chamber Event — ${payload.eventName}`
                : `Updated: ${payload.eventName}`,
            html: shell(
              payload.eventType === "chamber_event_created"
                ? "New Chamber Event"
                : "Updated Chamber Event",
              `<p>Hi ${assignedRep.full_name?.split(" ")[0] ?? "there"},</p>
               <p><strong>${payload.eventName}</strong></p>
               <p>Date: ${payload.eventDate ?? "TBD"}<br/>Time: ${payload.eventTime ?? "TBD"}<br/>Location: ${payload.eventLocation ?? "TBD"}</p>`,
            ),
          });
        }
      }

      for (const leader of leaders) {
        await createInAppNotification(
          supabase,
          leader.id,
          payload.eventType,
          "Chamber Event Updated",
          `Chamber event ${payload.eventType === "chamber_event_created" ? "created" : "updated"}: ${payload.eventName}.`,
          entityId,
        );
      }
    }

    if (payload.eventType === "chamber_activity_logged" && rep?.id && payload.eventName) {
      if (manager?.id) {
        await createInAppNotification(
          supabase,
          manager.id,
          "chamber_activity_logged",
          `Chamber Activity — ${rep.full_name}`,
          `${rep.full_name} logged Chamber activity for ${payload.eventName}: ${payload.contactsMade ?? 0} contacts, ${payload.inspectionsGenerated ?? 0} inspections generated.`,
          entityId,
        );
      }

      const manny = leaders.find((leader) => leader.full_name === "Manny Madrid");
      const sheldon = leaders.find((leader) => leader.full_name === "Sheldon Murphy");

      if (manny?.id) {
        await createInAppNotification(
          supabase,
          manny.id,
          "chamber_activity_logged",
          `Chamber Activity — ${rep.full_name}`,
          `${rep.full_name} logged Chamber activity for ${payload.eventName}: ${payload.contactsMade ?? 0} contacts, ${payload.inspectionsGenerated ?? 0} inspections generated.`,
          entityId,
        );
      }

      if (sheldon?.id) {
        await createInAppNotification(
          supabase,
          sheldon.id,
          "chamber_activity_logged",
          "Chamber Activity Logged",
          `${rep.full_name} logged Chamber activity for ${payload.eventName}.`,
          entityId,
        );
      }

      if (Deno.env.get("RESEND_API_KEY") && manager?.email) {
        await resend.emails.send({
          from: "TSM Hub <notifications@tsmroofpro.com>",
          to: [manager.email],
          subject: `Chamber Activity Logged — ${rep.full_name} | ${payload.eventName}`,
          html: shell(
            "Chamber Activity Logged",
            `<p>${rep.full_name} has submitted their Chamber activity report for <strong>${payload.eventName}</strong>.</p>
             <p>Contacts Made: ${payload.contactsMade ?? 0}<br/>Inspections Scheduled: ${payload.inspectionsGenerated ?? 0}</p>
             <p>Notes: ${payload.notes ?? "—"}</p>`,
          ),
        });
      }
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
