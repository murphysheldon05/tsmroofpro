import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("Draw notification payload:", payload);

    const {
      notification_type,
      draw_id,
      user_id,
      job_number,
      job_name,
      amount,
      denial_reason,
      deduction_amount,
      remaining_balance,
      requires_manager_approval,
    } = payload;

    if (!notification_type || !draw_id) {
      return new Response(
        JSON.stringify({ error: "Missing notification_type or draw_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = "https://tsmroofpro.com";
    const commissionsUrl = `${appUrl}/commissions`;

    // Get requesting user's profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user_id)
      .single();

    const repName = userProfile?.full_name || "Unknown Rep";
    const repEmail = userProfile?.email || "";
    const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

    let subject = "";
    let heading = "";
    let introText = "";
    let recipientEmails: string[] = [];
    let headerColor = "#d97706";
    let additionalContent = "";

    switch (notification_type) {
      case "requested": {
        subject = `💰 New Draw Request: ${repName} — $${Number(amount).toLocaleString()}`;
        heading = "New Draw Request Submitted";
        introText = `<strong>${repName}</strong> has submitted a draw request for <strong>${formattedAmount}</strong> against Job #${job_number}.${requires_manager_approval ? " <em>This request exceeds $1,500 and requires your approval.</em>" : ""}`;
        headerColor = "#d97706";

        // Get rep's assigned manager
        const { data: teamAssign } = await supabase
          .from("team_assignments")
          .select("manager_id")
          .eq("employee_id", user_id)
          .single();

        if (teamAssign?.manager_id) {
          const { data: mgrProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", teamAssign.manager_id)
            .single();
          if (mgrProfile?.email) recipientEmails.push(mgrProfile.email);
        }

        // Fallback to admins
        if (recipientEmails.length === 0) {
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");
          if (admins) {
            for (const a of admins) {
              const { data: ap } = await supabase.from("profiles").select("email").eq("id", a.user_id).single();
              if (ap?.email) recipientEmails.push(ap.email);
            }
          }
        }

        // In-app notification for manager
        if (teamAssign?.manager_id) {
          await createInAppNotification(supabase, teamAssign.manager_id, "draw_requested",
            "New Draw Request", `${repName} requested ${formattedAmount} against Job #${job_number}`,
            "draw_request", draw_id
          );
        }

        additionalContent = buildDetailRows([
          ["Rep", repName],
          ["Job #", job_number],
          ["Job Name", job_name || "—"],
          ["Amount", formattedAmount],
          ["Requires Approval", requires_manager_approval ? "Yes — over $1,500" : "No"],
        ]);
        break;
      }

      case "approved": {
        subject = `✅ Draw Approved: ${formattedAmount} for Job #${job_number}`;
        heading = "Draw Request Approved";
        introText = `Your draw request for <strong>${formattedAmount}</strong> against Job #${job_number} has been approved.`;
        headerColor = "#059669";
        if (repEmail) recipientEmails.push(repEmail);

        // Notify Accounting
        const { data: accDept } = await supabase
          .from("departments")
          .select("id")
          .eq("name", "Accounting")
          .single();
        if (accDept) {
          const { data: accProfiles } = await supabase
            .from("profiles")
            .select("email")
            .eq("department_id", accDept.id);
          accProfiles?.forEach(p => { if (p.email) recipientEmails.push(p.email); });
        }

        // In-app for rep
        await createInAppNotification(supabase, user_id, "draw_approved",
          "Draw Approved", `Your ${formattedAmount} draw for Job #${job_number} was approved. Ready for disbursement.`,
          "draw_request", draw_id
        );

        additionalContent = buildDetailRows([
          ["Job #", job_number],
          ["Amount", formattedAmount],
          ["Status", "Approved — Ready for disbursement"],
        ]);
        break;
      }

      case "denied": {
        subject = `🚫 Draw Denied: ${formattedAmount} for Job #${job_number}`;
        heading = "Draw Request Denied";
        introText = `Your draw request for <strong>${formattedAmount}</strong> against Job #${job_number} has been denied.`;
        headerColor = "#dc2626";
        if (repEmail) recipientEmails.push(repEmail);

        await createInAppNotification(supabase, user_id, "draw_denied",
          "Draw Denied", `Your ${formattedAmount} draw for Job #${job_number} was denied. Reason: ${denial_reason || "No reason provided"}`,
          "draw_request", draw_id
        );

        additionalContent = buildDetailRows([
          ["Job #", job_number],
          ["Amount", formattedAmount],
        ]);
        if (denial_reason) {
          additionalContent += `<tr><td colspan="2" style="padding:15px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-top:10px;"><strong style="color:#991b1b;">Reason:</strong> ${denial_reason}</td></tr>`;
        }
        break;
      }

      case "paid": {
        subject = `💵 Draw Disbursed: ${formattedAmount} for Job #${job_number}`;
        heading = "Draw Disbursed";
        introText = `Your draw of <strong>${formattedAmount}</strong> for Job #${job_number} has been disbursed.`;
        headerColor = "#059669";
        if (repEmail) recipientEmails.push(repEmail);

        await createInAppNotification(supabase, user_id, "draw_paid",
          "Draw Disbursed", `Your ${formattedAmount} draw for Job #${job_number} has been disbursed.`,
          "draw_request", draw_id
        );

        additionalContent = buildDetailRows([
          ["Job #", job_number],
          ["Amount Disbursed", formattedAmount],
        ]);
        break;
      }

      case "deducted": {
        const fmtDeduction = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(deduction_amount || 0);
        const fmtRemaining = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(remaining_balance || 0);
        const isPartial = (remaining_balance || 0) > 0;

        subject = isPartial
          ? `⚠️ Partial Draw Deduction: ${fmtDeduction} of ${formattedAmount}`
          : `✅ Draw Fully Deducted: ${formattedAmount} from Commission`;
        heading = isPartial ? "Partial Draw Deduction" : "Draw Fully Deducted";
        introText = isPartial
          ? `A partial deduction of <strong>${fmtDeduction}</strong> was applied to your draw of <strong>${formattedAmount}</strong> on Job #${job_number}. Remaining balance: <strong>${fmtRemaining}</strong>.`
          : `Your draw of <strong>${formattedAmount}</strong> on Job #${job_number} has been fully deducted from your commission.`;
        headerColor = isPartial ? "#d97706" : "#059669";
        if (repEmail) recipientEmails.push(repEmail);

        await createInAppNotification(supabase, user_id, "draw_deducted",
          isPartial ? "Partial Draw Deduction" : "Draw Deducted",
          isPartial
            ? `${fmtDeduction} deducted from your ${formattedAmount} draw. Remaining: ${fmtRemaining}`
            : `Your ${formattedAmount} draw for Job #${job_number} has been fully deducted.`,
          "draw_request", draw_id
        );

        additionalContent = buildDetailRows([
          ["Job #", job_number],
          ["Original Draw", formattedAmount],
          ["Deducted", fmtDeduction],
          ["Remaining Balance", fmtRemaining],
        ]);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown notification_type: ${notification_type}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    // De-dupe
    recipientEmails = [...new Set(recipientEmails.filter(e => e && e.trim()))];

    if (recipientEmails.length === 0) {
      console.log("No recipients found for draw notification:", notification_type);
      return new Response(
        JSON.stringify({ success: true, message: "No recipients" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const htmlBody = buildEmailHtml(heading, introText, additionalContent, commissionsUrl, headerColor);
    const plainText = `${heading}\n\n${introText.replace(/<[^>]+>/g, "")}\n\nView in Hub: ${commissionsUrl}`;

    console.log("Sending draw email to:", recipientEmails);

    const emailResult = await resend.emails.send({
      from: "TSM Roofing Hub <notifications@tsmroofpro.com>",
      reply_to: "sheldonmurphy@tsmroofs.com",
      to: recipientEmails,
      subject,
      html: htmlBody,
      text: plainText,
    });

    console.log("Draw email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Draw notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function buildDetailRows(rows: [string, string][]): string {
  return rows
    .map(([label, value]) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><strong>${label}:</strong></td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">${value}</td></tr>`
    )
    .join("");
}

function buildEmailHtml(heading: string, intro: string, details: string, ctaUrl: string, color: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:${color};padding:30px 40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:22px;">${heading}</h1>
<p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:13px;">TSM Roofing Hub</p>
</td></tr>
<tr><td style="padding:30px 40px;">
<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">${intro}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${details}</table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
<table cellpadding="0" cellspacing="0"><tr><td style="background:${color};border-radius:8px;padding:14px 32px;">
<a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">View in Hub</a>
</td></tr></table>
<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Or visit: <a href="${ctaUrl}" style="color:${color};">${ctaUrl}</a></p>
</td></tr></table>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;">TSM Roofing LLC — Automated Notification</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

async function createInAppNotification(
  supabase: any,
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_notifications")
      .insert({ user_id: userId, notification_type: notificationType, title, message, entity_type: entityType, entity_id: entityId });
    if (error) console.error("Failed to create in-app notification:", error);
  } catch (err) {
    console.error("Error creating in-app notification:", err);
  }
}

serve(handler);
