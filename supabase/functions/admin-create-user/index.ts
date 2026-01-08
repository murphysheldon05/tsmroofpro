import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

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

    // Basic email format validation only
    if (!email.includes("@") || !email.includes(".")) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    // Handle orphaned auth users (exist in auth but not in profiles)
    if (createError?.message?.includes("already been registered") || 
        (createError as any)?.code === "email_exists") {
      console.log("User exists in auth, checking if orphaned...");
      
      // Check if user exists in profiles
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      
      if (!existingProfile) {
        // User is orphaned - exists in auth but not in profiles
        // Find and delete the orphaned auth user, then recreate
        console.log("Orphaned user detected, cleaning up...");
        
        const { data: authUsers } = await admin.auth.admin.listUsers();
        const orphanedUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
        
        if (orphanedUser) {
          console.log("Deleting orphaned auth user:", orphanedUser.id);
          
          // Clean up any related data
          await admin.from("user_roles").delete().eq("user_id", orphanedUser.id);
          await admin.from("user_permissions").delete().eq("user_id", orphanedUser.id);
          await admin.auth.admin.deleteUser(orphanedUser.id);
          
          // Retry creating the user
          const retryResult = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });
          
          created = retryResult.data;
          createError = retryResult.error;
        }
      }
    }

    if (createError || !created?.user) {
      console.error("Create user error:", createError);
      
      // Provide more specific error messages
      let errorMessage = createError?.message ?? "Failed to create user";
      let errorCode = "unknown";
      
      if (createError?.message?.includes("already been registered") || 
          (createError as any)?.code === "email_exists") {
        errorMessage = "A user with this email address already exists. Use 'Resend Invite' to send a new invite to existing users.";
        errorCode = "email_exists";
      }
      
      return new Response(JSON.stringify({ error: errorMessage, code: errorCode }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user.id;

    // Ensure profile exists with must_reset_password flag and pre-approved status
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          must_reset_password: true,
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: caller.id,
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

    // Ensure role exists - delete any existing role first, then insert new one
    await admin.from("user_roles").delete().eq("user_id", userId);
    
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleError) {
      console.error("Role insert error:", roleError);
      return new Response(JSON.stringify({ error: "User created but role failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send invite email with credentials
    let emailSent = false;
    if (sendInviteEmail) {
      try {
        // Fetch email template from database
        const { data: templateData } = await admin
          .from("email_templates")
          .select("subject, heading, intro_text, button_text, footer_text")
          .eq("template_key", "user_invite")
          .single();

        // Use template values or defaults
        const template: EmailTemplate = templateData || {
          subject: "Welcome to TSM Roofing Portal - Your Account Details",
          heading: "Welcome to TSM Roofing",
          intro_text: "Your account has been created for the TSM Roofing Employee Portal. Here are your login credentials:",
          button_text: "Login to Portal",
          footer_text: "If you have any questions, please contact your manager or the admin team.",
        };

        const rawBaseUrl = (Deno.env.get("APP_BASE_URL") ?? "https://hub.tsmroofs.com").trim();
        const appBaseUrl = (rawBaseUrl.startsWith("http://") || rawBaseUrl.startsWith("https://"))
          ? rawBaseUrl.replace(/\/$/, "")
          : `https://${rawBaseUrl.replace(/\/$/, "")}`;
        const loginUrl = `${appBaseUrl}/auth`;
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

        const emailResponse = await resend.emails.send({
          from: "TSM Roofing <noreply@hub.tsmroofs.com>",
          to: [email],
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
                <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${fullName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  ${template.intro_text}
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
                   <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
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
