import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewSignupPayload {
  user_id: string;
  email: string;
  full_name: string;
  requested_role?: string;
  requested_department?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NewSignupPayload = await req.json();
    const { user_id, email, full_name, requested_role, requested_department } = payload;

    if (!user_id || !email) {
      return new Response(JSON.stringify({ error: "Missing user_id or email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch notification settings for new user approvals
    const { data: notificationSettings, error: settingsError } = await admin
      .from("notification_settings")
      .select("recipient_email, recipient_name")
      .eq("notification_type", "new_user_approval")
      .eq("is_active", true);

    if (settingsError) {
      console.error("Failed to fetch notification settings:", settingsError);
    }

    // If no specific settings, fall back to admin emails
    let recipients: string[] = [];
    if (notificationSettings && notificationSettings.length > 0) {
      recipients = notificationSettings.map(s => s.recipient_email);
    } else {
      // Fetch admin users as fallback
      const { data: adminRoles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        const { data: adminProfiles } = await admin
          .from("profiles")
          .select("email")
          .in("id", adminIds);

        if (adminProfiles) {
          recipients = adminProfiles.map(p => p.email).filter(Boolean) as string[];
        }
      }
    }

    if (recipients.length === 0) {
      console.log("No recipients found for new user notification");
      return new Response(JSON.stringify({ success: true, message: "No recipients configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HARD LOCK: Always use tsmrest.com for all portal links - never use any other domain
    const adminUrl = "https://tsmrest.com/admin";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New User Signup</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            A new user has signed up and is waiting for approval.
          </p>
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Name:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${full_name || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${email}</td>
              </tr>
              ${requested_role ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Requested Role:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${requested_role}</td>
              </tr>
              ` : ''}
              ${requested_department ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Requested Dept:</td>
                <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${requested_department}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⚠️ Action Required:</strong> Please review and approve this user in the Admin panel.
            </p>
          </div>
          
           <div style="text-align: center; margin: 30px 0;">
             <a href="${adminUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
               Review in Admin Panel
             </a>
           </div>
        </div>
        
        <div style="background: #1e3a5f; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} TSM Roofing. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "TSM Roofing <notifications@hub.tsmroofs.com>",
      to: recipients,
      subject: `New User Signup: ${full_name || email}`,
      html: emailHtml,
    });

    console.log("Admin notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, recipients: recipients.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-new-signup error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
