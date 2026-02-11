import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HoldNotification {
  hold_id: string;
  hold_type: string;
  reason: string;
  user_id: string;
  job_id?: string;
  action: "applied" | "released";
  released_by_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: HoldNotification = await req.json();
    console.log("Hold notification payload:", payload);

    // BUG FIX: Guard required fields
    if (!payload.user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user profile - BUG FIX: use maybeSingle + proper null check
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", payload.user_id)
      .maybeSingle();

    if (userError || !userProfile) {
      console.error("User profile not found for ID:", payload.user_id, userError);
      return new Response(
        JSON.stringify({ error: "User profile not found", user_id: payload.user_id }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userName = userProfile?.full_name || "Team Member";
    const userEmail = userProfile?.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "No email found for user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = "https://tsmroofpro.com";
    const actionDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create in-app notification
    await supabaseAdmin.from("user_notifications").insert({
      user_id: payload.user_id,
      type: payload.action === "applied" ? "hold_applied" : "hold_released",
      title: payload.action === "applied" 
        ? `🚫 Hold Applied: ${payload.hold_type}` 
        : `✅ Hold Released: ${payload.hold_type}`,
      message: payload.action === "applied"
        ? `A ${payload.hold_type} hold has been applied to your account: ${payload.reason}`
        : `The ${payload.hold_type} hold on your account has been released.`,
      read: false,
    });

    // Send email notification
    if (userEmail) {
      const isApplied = payload.action === "applied";
      const headerColor = isApplied ? "#DC2626" : "#059669";
      const headerEmoji = isApplied ? "🚫" : "✅";
      const headerText = isApplied ? "Hold Applied" : "Hold Released";

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #000000; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1F2937;">
    <div style="background-color: ${headerColor}; padding: 30px; text-align: center;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 700;">
        ${headerEmoji} ${headerText}
      </h1>
    </div>
    
    <div style="padding: 30px;">
      <p style="color: #F9FAFB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        ${isApplied 
          ? `A hold has been placed on your account that may restrict certain actions until resolved.`
          : `Great news! The hold on your account has been released and you now have full access.`
        }
      </p>
      
      <div style="background-color: #1F2937; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Hold Type:</td>
            <td style="color: #F9FAFB; padding: 8px 0; text-align: right; font-weight: 600;">${payload.hold_type}</td>
          </tr>
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Status:</td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="background-color: ${headerColor}; color: #FFFFFF; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                ${isApplied ? "ACTIVE" : "RELEASED"}
              </span>
            </td>
          </tr>
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Date:</td>
            <td style="color: #F9FAFB; padding: 8px 0; text-align: right;">${actionDate}</td>
          </tr>
          ${payload.job_id ? `<tr><td style="color: #9CA3AF; padding: 8px 0;">Job ID:</td><td style="color: #F9FAFB; padding: 8px 0; text-align: right;">${payload.job_id}</td></tr>` : ""}
          ${!isApplied && payload.released_by_name ? `<tr><td style="color: #9CA3AF; padding: 8px 0;">Released By:</td><td style="color: #F9FAFB; padding: 8px 0; text-align: right;">${payload.released_by_name}</td></tr>` : ""}
        </table>
      </div>
      
      ${isApplied ? `
      <div style="background-color: #FEE2E2; border: 1px solid #FECACA; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #991B1B; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Reason:</p>
        <p style="color: #DC2626; font-size: 14px; margin: 0; line-height: 1.6;">
          ${payload.reason}
        </p>
      </div>
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Please contact your manager or the compliance team to resolve this hold. Certain actions may be blocked until the hold is released.
      </p>
      ` : `
      <div style="background-color: #D1FAE5; border: 1px solid #6EE7B7; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #065F46; font-size: 16px; margin: 0; font-weight: 600;">
          ✅ All restrictions have been lifted
        </p>
      </div>
      `}
    </div>
    
    <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #1F2937;">
      <p style="color: #6B7280; font-size: 12px; margin: 0;">
        TSM Roofing LLC • Phoenix & Prescott, Arizona<br>
        <a href="${appUrl}" style="color: #00D26A;">tsmroofpro.com</a>
      </p>
    </div>
  </div>
</body>
</html>
      `;

      await resend.emails.send({
        from: "TSM Roof Pro Hub <notifications@tsmroofpro.com>",
        to: [userEmail],
        reply_to: "sheldonmurphy@tsmroofs.com",
        subject: `${headerEmoji} ${headerText}: ${payload.hold_type}`,
        html: emailHtml,
        text: `${headerText}\n\nHold Type: ${payload.hold_type}\nStatus: ${isApplied ? "ACTIVE" : "RELEASED"}\nDate: ${actionDate}\n${isApplied ? `\nReason: ${payload.reason}\n\nPlease contact your manager or the compliance team to resolve this hold.` : "\nAll restrictions have been lifted."}\n\nTSM Roofing LLC`,
      });

      console.log("Hold notification email sent to:", userEmail);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Hold notification sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-hold-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
