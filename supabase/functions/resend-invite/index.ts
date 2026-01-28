import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Supports two modes:
// 1. { email: string } - Resend invite email (no password change)
// 2. { user_id: string, new_password: string } - Reset password and send credentials
interface ResendInvitePayload {
  email?: string;
  user_id?: string;
  new_password?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const { email, user_id, new_password } = payload;

    // Validate: must have either email OR (user_id + new_password)
    if (!email && (!user_id || !new_password)) {
      return new Response(JSON.stringify({ error: "Missing email or (user_id + new_password)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let profile: { id: string; email: string; full_name: string | null } | null = null;

    // Mode 1: Resend invite by email (no password change)
    if (email && !user_id) {
      const { data: profileData, error: profileError } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", email)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch by email error:", profileError);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      profile = profileData;
    }

    // Mode 2: Reset password by user_id
    if (user_id && new_password) {
      if (new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profileData, error: profileError } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", user_id)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch by user_id error:", profileError);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      profile = profileData;

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

      // Set must_reset_password flag
      const { error: flagError } = await admin
        .from("profiles")
        .update({ must_reset_password: true })
        .eq("id", user_id);

      if (flagError) {
        console.error("Flag update error:", flagError);
      }
    }

    if (!profile || !profile.email) {
      return new Response(JSON.stringify({ error: "Could not determine user email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send invite email
    let emailSent = false;
    try {
      // HARD LOCK: Always use tsmroofpro.com for all auth emails
      const loginUrl = "https://tsmroofpro.com/auth";
      
      // Extract first name from full name
      const firstName = profile.full_name?.split(' ')[0] || 'there';

      // Plain text version for deliverability
      const plainText = `TSM Roofing Hub - You've Been Invited

Hi ${firstName},

You've been invited to join the TSM Roofing Hub — our internal portal for SOPs, forms, trackers, and team resources.

What to expect:
- If you already have an account, log in and you'll be taken directly into the hub.
- If you're new, create your login using this email address.
- Access is role-based. If your access is still pending, you'll see a brief "Pending Approval" message until an admin approves your account.

Open the TSM Roofing Hub: ${loginUrl}

If you have any trouble getting in, reply to this email and we'll fix it fast.

— TSM Roofing Team

© ${new Date().getFullYear()} TSM Roofing. All rights reserved.`;

      const emailResponse = await resend.emails.send({
        from: "TSM Roofing <notifications@tsmroofpro.com>",
        reply_to: "sheldonmurphy@tsmroofs.com",
        to: [profile.email],
        subject: "You've been invited to the TSM Roofing Hub — Activate your access",
        text: plainText,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">TSM Roofing Hub</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${firstName},
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                You've been invited to join the <strong>TSM Roofing Hub</strong> — our internal portal for SOPs, forms, trackers, and team resources.
              </p>
              
              <!-- Outlook-compatible table-based button -->
              <div style="text-align: center; margin: 30px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                      <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                        Open the TSM Roofing Hub
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px 0;">What to expect:</p>
                <ul style="font-size: 14px; color: #374151; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">If you already have an account, log in and you'll be taken directly into the hub.</li>
                  <li style="margin-bottom: 8px;">If you're new, create your login using this email address.</li>
                  <li style="margin-bottom: 8px;">Access is role-based. If your access is still pending, you'll see a brief "Pending Approval" message until an admin approves your account.</li>
                </ul>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                Or copy this link: <a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a>
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If you have any trouble getting in, reply to this email and we'll fix it fast.
              </p>
              
              <p style="font-size: 14px; color: #374151; margin-top: 20px;">
                — TSM Roofing Team
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} TSM Roofing. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Invite email sent successfully:", emailResponse);
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
