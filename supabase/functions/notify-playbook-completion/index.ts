import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId }: NotifyRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, manager_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup failed:", profileError);
      throw new Error("Could not find user profile");
    }

    console.log("User completed playbook:", profile.full_name);

    // Get manager info if exists
    let managerEmail: string | null = null;
    let managerName: string | null = null;

    if (profile.manager_id) {
      const { data: manager } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", profile.manager_id)
        .single();

      if (manager) {
        managerEmail = manager.email;
        managerName = manager.full_name;
      }
    }

    // Get all admins
    const { data: adminUsers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminEmails: string[] = [];
    if (adminUsers && adminUsers.length > 0) {
      const adminIds = adminUsers.map((a) => a.user_id);
      const { data: adminProfiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", adminIds);

      if (adminProfiles) {
        adminEmails.push(...adminProfiles.map((p) => p.email).filter(Boolean));
      }
    }

    // Create in-app notification for the user
    await supabaseAdmin.from("user_notifications").insert({
      user_id: userId,
      notification_type: "playbook_complete",
      title: "Master Playbook Complete! 🎉",
      message: "Congratulations! You've completed all 10 Master Playbook acknowledgments and now have full access to the hub.",
      entity_type: "playbook",
      entity_id: userId,
    });

    // Build recipient list
    const recipients: string[] = [];
    if (managerEmail) recipients.push(managerEmail);
    recipients.push(...adminEmails);
    
    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];

    // Send email notification
    if (uniqueRecipients.length > 0) {
      const completionDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #000000; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1F2937;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #00D26A 0%, #00FF85 100%); padding: 30px; text-align: center;">
      <h1 style="color: #000000; margin: 0; font-size: 24px; font-weight: 700;">
        🎉 Master Playbook Complete!
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <p style="color: #F9FAFB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Great news! <strong>${profile.full_name || "A team member"}</strong> has successfully completed all 10 Master Playbook acknowledgments.
      </p>
      
      <div style="background-color: #1F2937; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Employee:</td>
            <td style="color: #F9FAFB; padding: 8px 0; text-align: right; font-weight: 600;">${profile.full_name || "N/A"}</td>
          </tr>
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Email:</td>
            <td style="color: #F9FAFB; padding: 8px 0; text-align: right;">${profile.email || "N/A"}</td>
          </tr>
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Completed:</td>
            <td style="color: #00D26A; padding: 8px 0; text-align: right;">${completionDate}</td>
          </tr>
          <tr>
            <td style="color: #9CA3AF; padding: 8px 0;">Status:</td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="background-color: #00D26A; color: #000000; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                ✓ All 10 Playbooks Acknowledged
              </span>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        This employee now has full access to all TSM Roof Pro Hub features and can begin normal operations.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://tsmroofpro.com/admin" style="display: inline-block; background: linear-gradient(135deg, #00D26A 0%, #00FF85 100%); color: #000000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View in Admin Panel
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="https://tsmroofpro.com/admin" style="color: #00D26A;">https://tsmroofpro.com/admin</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #1F2937;">
      <p style="color: #6B7280; font-size: 12px; margin: 0;">
        TSM Roofing LLC • Phoenix & Prescott, Arizona<br>
        <a href="https://tsmroofpro.com" style="color: #00D26A;">tsmroofpro.com</a>
      </p>
    </div>
  </div>
</body>
</html>
      `;

      const emailText = `
Master Playbook Complete!

Great news! ${profile.full_name || "A team member"} has successfully completed all 10 Master Playbook acknowledgments.

Employee: ${profile.full_name || "N/A"}
Email: ${profile.email || "N/A"}
Completed: ${completionDate}
Status: All 10 Playbooks Acknowledged

This employee now has full access to all TSM Roof Pro Hub features.

View in Admin Panel: https://tsmroofpro.com/admin

---
TSM Roofing LLC
Phoenix & Prescott, Arizona
      `;

      const emailResponse = await resend.emails.send({
        from: "TSM Roof Pro Hub <notifications@tsmroofpro.com>",
        to: uniqueRecipients,
        reply_to: "sheldonmurphy@tsmroofs.com",
        subject: `🎉 ${profile.full_name || "Team Member"} Completed Master Playbook`,
        html: emailHtml,
        text: emailText,
      });

      console.log("Completion email sent to:", uniqueRecipients, emailResponse);
    } else {
      console.log("No recipients for completion email");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-playbook-completion:", error);
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
