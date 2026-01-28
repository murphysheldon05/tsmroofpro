import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvitePayload {
  email: string;
  full_name?: string;
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

    // Create anon client to verify the caller
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
      return new Response(JSON.stringify({ error: "Forbidden - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: InvitePayload = await req.json();
    const email = (payload.email ?? "").trim().toLowerCase();
    const fullName = (payload.full_name ?? "").trim();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic email format validation
    if (!email.includes("@") || !email.includes(".")) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client for database operations
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if email already has an active account (in auth.users with login history)
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email);

    if (existingAuthUser) {
      // Check if they've logged in
      const { data: profile } = await admin
        .from("profiles")
        .select("id, last_login_at, employee_status")
        .eq("id", existingAuthUser.id)
        .maybeSingle();

      if (profile?.last_login_at) {
        return new Response(JSON.stringify({ 
          error: "This user already has an active account. They can sign in directly.",
          code: "already_registered"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if email already has a pending invite
    const { data: existingInvite } = await admin
      .from("pending_invites")
      .select("id, email, invited_at")
      .eq("email", email)
      .maybeSingle();

    if (existingInvite) {
      // Update the existing invite (resend)
      const { error: updateError } = await admin
        .from("pending_invites")
        .update({
          full_name: fullName || existingInvite.email.split("@")[0],
          invited_at: new Date().toISOString(),
          invited_by: caller.id,
        })
        .eq("id", existingInvite.id);

      if (updateError) {
        console.error("Failed to update invite:", updateError);
      }
    } else {
      // Insert new pending invite
      const { error: insertError } = await admin
        .from("pending_invites")
        .insert({
          email,
          full_name: fullName || email.split("@")[0],
          invited_by: caller.id,
        });

      if (insertError) {
        console.error("Failed to insert invite:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create invite" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get inviter name
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", caller.id)
      .maybeSingle();

    const inviterName = inviterProfile?.full_name || "TSM Roofing Admin";

    // Send invite email
    // HARD LOCK: Always use tsmroofpro.com for all auth emails
    const signupUrl = "https://tsmroofpro.com/signup";
    const firstName = fullName?.split(" ")[0] || email.split("@")[0];

    const plainText = `You're Invited to Join TSM Hub

Hi ${firstName},

${inviterName} has invited you to join the TSM Roofing Hub — our internal portal for SOPs, forms, trackers, and team resources.

To get started:
1. Click the link below to create your account
2. Enter your email (${email}) and choose a password
3. Your account will be pending admin approval

Create your account here: ${signupUrl}

If you have questions, contact your manager or email sheldonmurphy@tsmroofs.com.

© ${new Date().getFullYear()} TSM Roofing. All rights reserved.`;

    try {
      const emailResponse = await resend.emails.send({
        from: "TSM Hub <notifications@tsmroofpro.com>",
        reply_to: "sheldonmurphy@tsmroofs.com",
        to: [email],
        subject: "You're Invited to Join TSM Hub",
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
              <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited! 🎉</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${firstName},
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${inviterName}</strong> has invited you to join the TSM Roofing Hub — our internal portal for SOPs, forms, trackers, and team resources.
              </p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Get started in 3 easy steps:</p>
                <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
                  <li>Click the button below to create your account</li>
                  <li>Enter your email (<strong>${email}</strong>) and choose a password</li>
                  <li>Your account will be pending admin approval</li>
                </ol>
              </div>
              
              <!-- Outlook-compatible table-based button -->
              <div style="text-align: center; margin: 30px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                      <a href="${signupUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                        Create My Account
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                Or copy this link: <a href="${signupUrl}" style="color: #3b82f6;">${signupUrl}</a>
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you have any questions, please reach out to your manager or administrator.
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
    } catch (emailError: any) {
      console.error("Failed to send invite email:", emailError);
      // Don't fail - invite is still stored
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: existingInvite ? "Invite resent successfully" : "Invite sent successfully",
      email 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-invite error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
