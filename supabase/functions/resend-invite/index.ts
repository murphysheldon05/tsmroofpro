import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendInvitePayload {
  user_id: string;
  new_password: string;
}

interface EmailTemplate {
  subject: string;
  heading: string;
  intro_text: string;
  button_text: string;
  footer_text: string | null;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await anon.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = authData.user;

    // Check if caller is admin
    const { data: isAdmin, error: roleCheckError } = await anon.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleCheckError) {
      console.error("Role check error:", roleCheckError);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: ResendInvitePayload = await req.json();
    const { user_id, new_password } = payload;

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "Missing user_id or new_password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user profile info
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user role
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .single();

    const role = roleData?.role || "employee";

    // Update user password
    const { error: updateError } = await admin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset the must_reset_password flag
    const { error: flagError } = await admin
      .from("profiles")
      .update({ must_reset_password: true })
      .eq("id", user_id);

    if (flagError) {
      console.error("Flag update error:", flagError);
    }

    // Fetch email template from database
    const { data: templateData } = await admin
      .from("email_templates")
      .select("subject, heading, intro_text, button_text, footer_text")
      .eq("template_key", "user_invite")
      .single();

    // Use template values or defaults (with slight modifications for resend context)
    const template: EmailTemplate = templateData || {
      subject: "TSM Roofing Portal - Your New Login Credentials",
      heading: "New Login Credentials",
      intro_text: "Your login credentials for the TSM Roofing Employee Portal have been updated. Here are your new details:",
      button_text: "Login to Portal",
      footer_text: "If you have any questions, please contact your manager or the admin team.",
    };

    // Send invite email
    let emailSent = false;
    try {
      const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://hub.tsmroofs.com";
      const loginUrl = `${appBaseUrl}/auth`;
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

      const emailResponse = await resend.emails.send({
        from: "TSM Roofing <noreply@hub.tsmroofs.com>",
        to: [profile.email],
        subject: template.subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${template.heading}</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${profile.full_name || 'Team Member'}</strong>,</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${template.intro_text}
              </p>
              
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${profile.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Temporary Password:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px; font-family: monospace; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${new_password}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Role:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${roleLabel}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>⚠️ Important:</strong> For security, you will be prompted to change your password when you log in.
                </p>
              </div>
              
               <div style="text-align: center; margin: 30px 0;">
                 <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                   ${template.button_text}
                 </a>
               </div>

               <p style="font-size: 13px; color: #64748b; margin: 0 0 10px; text-align: center;">
                 If the button doesn’t work, copy and paste this link:
                 <br />
                 <a href="${loginUrl}" style="color: #2563eb; word-break: break-all;">${loginUrl}</a>
               </p>
              
              ${template.footer_text ? `<p style="font-size: 14px; color: #64748b; margin-top: 30px;">${template.footer_text}</p>` : ""}
            </div>
            
            <div style="background: #1e3a5f; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} TSM Roofing. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Resend invite email sent successfully:", emailResponse);
      emailSent = true;
    } catch (emailError: any) {
      console.error("Failed to send invite email:", emailError);
    }

    return new Response(JSON.stringify({ success: true, email_sent: emailSent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("resend-invite error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
