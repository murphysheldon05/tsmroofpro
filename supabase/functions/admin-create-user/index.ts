import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "manager" | "employee";

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
  send_invite_email?: boolean;
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

    const payload: CreateUserPayload = await req.json();

    const email = (payload.email ?? "").trim().toLowerCase();
    const password = payload.password ?? "";
    const fullName = (payload.full_name ?? "").trim();
    const role: AppRole = (payload.role ?? "employee") as AppRole;
    const sendInviteEmail = payload.send_invite_email ?? true;

    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created.user) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError?.message ?? "Failed to create user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user.id;

    // Ensure profile exists with must_reset_password flag
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          must_reset_password: true,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      return new Response(JSON.stringify({ error: "User created but profile failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure role exists
    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Role upsert error:", roleError);
      return new Response(JSON.stringify({ error: "User created but role failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send invite email with credentials
    let emailSent = false;
    if (sendInviteEmail) {
      try {
        const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "https://app.tsmroofing.com";
        const loginUrl = `${appUrl}/auth`;
        
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

        const emailResponse = await resend.emails.send({
          from: "TSM Roofing <onboarding@resend.dev>",
          to: [email],
          subject: "Welcome to TSM Roofing Portal - Your Account Details",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to TSM Roofing</h1>
              </div>
              
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${fullName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Your account has been created for the TSM Roofing Employee Portal. Here are your login credentials:
                </p>
                
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
                      <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Temporary Password:</td>
                      <td style="padding: 8px 0; font-weight: 600; font-size: 14px; font-family: monospace; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${password}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Role:</td>
                      <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${roleLabel}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <strong>⚠️ Important:</strong> For security, you will be prompted to change your password on your first login.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Login to Portal
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                  If you have any questions, please contact your manager or the admin team.
                </p>
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

        console.log("Invite email sent successfully:", emailResponse);
        emailSent = true;
      } catch (emailError: any) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the entire operation if email fails
      }
    }

    return new Response(JSON.stringify({ user_id: userId, email_sent: emailSent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("admin-create-user error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
