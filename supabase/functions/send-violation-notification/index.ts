import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ViolationNotification {
  violation_id: string;
  violation_type: string;
  severity: "MINOR" | "MAJOR" | "SEVERE";
  sop_key: string;
  description: string;
  user_id: string;
  job_id?: string;
  department?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: ViolationNotification = await req.json();
    console.log("Violation notification payload:", payload);

    // BUG FIX: Guard required fields
    const requiredFields = ['user_id', 'violation_id', 'violation_type', 'severity'] as const;
    for (const field of requiredFields) {
      if (!payload[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user profile who has the violation - BUG FIX: use maybeSingle
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, manager_id")
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

    // Get ops_compliance users
    const { data: complianceUsers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "ops_compliance");

    const complianceEmails: string[] = [];
    if (complianceUsers && complianceUsers.length > 0) {
      const complianceIds = complianceUsers.map((c) => c.user_id);
      const { data: complianceProfiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", complianceIds);

      if (complianceProfiles) {
        complianceEmails.push(...complianceProfiles.map((p) => p.email).filter(Boolean));
      }
    }

    // Get manager email if exists
    let managerEmail: string | null = null;
    if (userProfile.manager_id) {
      const { data: manager } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", userProfile.manager_id)
        .maybeSingle();

      if (manager) {
        managerEmail = manager.email;
      }
    }

    // Create in-app notification for the user
    await supabaseAdmin.from("user_notifications").insert({
      user_id: payload.user_id,
      type: "violation_logged",
      title: `${payload.severity} Violation Logged`,
      message: `A ${payload.severity.toLowerCase()} violation has been logged against your account: ${payload.violation_type}`,
      read: false,
    });

    // Create in-app notifications for compliance officers
    if (complianceUsers && complianceUsers.length > 0) {
      await supabaseAdmin.from("user_notifications").insert(
        complianceUsers.map((cu) => ({
          user_id: cu.user_id,
          type: "violation_logged",
          title: `${payload.severity} Violation: ${userProfile.full_name}`,
          message: `${payload.violation_type}: ${payload.description}`,
          read: false,
        }))
      );
    }

    // Build recipient list
    const recipients: string[] = [...complianceEmails];
    if (managerEmail) recipients.push(managerEmail);
    if (payload.severity === "SEVERE") {
      // Get admins for severe violations
      const { data: adminUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((a) => a.user_id);
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .in("id", adminIds);

        if (adminProfiles) {
          recipients.push(...adminProfiles.map((p) => p.email).filter(Boolean));
        }
      }
    }

    const uniqueRecipients = [...new Set(recipients)];

    // Severity colors
    const severityColors = {
      MINOR: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
      MAJOR: { bg: "#FED7AA", border: "#EA580C", text: "#9A3412" },
      SEVERE: { bg: "#FEE2E2", border: "#DC2626", text: "#991B1B" },
    };

    const colors = severityColors[payload.severity];
    const appUrl = "https://tsmroofpro.com";
    const violationUrl = `${appUrl}/ops-compliance`;
    const logDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send email to the user about their violation
    if (userProfile.email) {
      const userEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #000000; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1F2937;">
    <div style="background-color: ${colors.border}; padding: 30px; text-align: center;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 700;">
        ⚠️ ${payload.severity} Compliance Violation
      </h1>
    </div>
    
    <div style="padding: 30px;">
      <p style="color: #F9FAFB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        A compliance violation has been logged against your account. Please review the details below.
      </p>
      
      <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Severity:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right; font-weight: 700;">${payload.severity}</td>
          </tr>
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Type:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right;">${payload.violation_type}</td>
          </tr>
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Playbook:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right;">${payload.sop_key}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #1F2937; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Description:</p>
        <p style="color: #F9FAFB; font-size: 14px; margin: 0; line-height: 1.6;">
          ${payload.description}
        </p>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 20px 0;">
        Logged: ${logDate}
      </p>
      
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        If you believe this was logged in error, please contact your manager or the compliance team.
      </p>
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
        to: [userProfile.email],
        reply_to: "sheldonmurphy@tsmroofs.com",
        subject: `⚠️ ${payload.severity} Compliance Violation Logged`,
        html: userEmailHtml,
        text: `${payload.severity} Compliance Violation Logged\n\nA compliance violation has been logged against your account.\n\nSeverity: ${payload.severity}\nType: ${payload.violation_type}\nPlaybook: ${payload.sop_key}\nDescription: ${payload.description}\n\nLogged: ${logDate}\n\nIf you believe this was logged in error, please contact your manager or the compliance team.\n\nTSM Roofing LLC`,
      });

      console.log("User violation email sent to:", userProfile.email);
    }

    // Send notification to compliance officers and managers
    if (uniqueRecipients.length > 0) {
      const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #000000; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1F2937;">
    <div style="background-color: ${colors.border}; padding: 30px; text-align: center;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 700;">
        ⚠️ ${payload.severity} Violation Logged
      </h1>
    </div>
    
    <div style="padding: 30px;">
      <p style="color: #F9FAFB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        A compliance violation has been logged for <strong>${userProfile.full_name || "a team member"}</strong>.
      </p>
      
      <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Employee:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right; font-weight: 700;">${userProfile.full_name || "N/A"}</td>
          </tr>
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Severity:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right; font-weight: 700;">${payload.severity}</td>
          </tr>
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Type:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right;">${payload.violation_type}</td>
          </tr>
          <tr>
            <td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Playbook:</td>
            <td style="color: ${colors.text}; padding: 8px 0; text-align: right;">${payload.sop_key}</td>
          </tr>
          ${payload.department ? `<tr><td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Department:</td><td style="color: ${colors.text}; padding: 8px 0; text-align: right;">${payload.department}</td></tr>` : ""}
          ${payload.job_id ? `<tr><td style="color: ${colors.text}; padding: 8px 0; font-weight: 600;">Job ID:</td><td style="color: ${colors.text}; padding: 8px 0; text-align: right;">${payload.job_id}</td></tr>` : ""}
        </table>
      </div>
      
      <div style="background-color: #1F2937; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Description:</p>
        <p style="color: #F9FAFB; font-size: 14px; margin: 0; line-height: 1.6;">
          ${payload.description}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${violationUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D26A 0%, #00FF85 100%); color: #000000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View in Ops Compliance
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${violationUrl}" style="color: #00D26A;">${violationUrl}</a>
      </p>
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
        to: uniqueRecipients,
        reply_to: "sheldonmurphy@tsmroofs.com",
        subject: `⚠️ ${payload.severity} Violation: ${userProfile.full_name || "Team Member"} - ${payload.violation_type}`,
        html: adminEmailHtml,
        text: `${payload.severity} Compliance Violation Logged\n\nEmployee: ${userProfile.full_name || "N/A"}\nSeverity: ${payload.severity}\nType: ${payload.violation_type}\nPlaybook: ${payload.sop_key}\nDescription: ${payload.description}\n\nView in Ops Compliance: ${violationUrl}\n\nTSM Roofing LLC`,
      });

      console.log("Admin violation email sent to:", uniqueRecipients);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Violation notifications sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-violation-notification:", error);
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
