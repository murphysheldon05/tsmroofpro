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

    // Password strength validation
    const PASSWORD_MIN_LENGTH = 12;
    const passwordErrors: string[] = [];
    
    if (password.length < PASSWORD_MIN_LENGTH) {
      passwordErrors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push("Password must contain at least one number");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      passwordErrors.push("Password must contain at least one special character");
    }
    
    if (passwordErrors.length > 0) {
      return new Response(JSON.stringify({ 
        error: passwordErrors[0],
        errors: passwordErrors,
        code: "weak_password"
      }), {
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

        // HARD LOCK: Always use tsmrest.com for all auth emails - never use any other domain
        // NOTE: The app route is /auth (NOT /auth/login) - do not change this!
        const loginUrl = "https://tsmrest.com/auth";
        
        // Extract first name from full name
        const firstName = fullName?.split(' ')[0] || 'there';

        const emailResponse = await resend.emails.send({
          from: "TSM Roofing <notifications@hub.tsmroofs.com>",
          to: [email],
          subject: "You've been invited to the TSM Roofing Hub — Activate your access",
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
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                    Open the TSM Roofing Hub
                  </a>
                </div>
                
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px 0;">What to expect:</p>
                  <ul style="font-size: 14px; color: #374151; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">If you already have an account, log in and you'll be taken directly into the hub.</li>
                    <li style="margin-bottom: 8px;">If you're new, create your login using this email address.</li>
                    <li style="margin-bottom: 8px;">Access is role-based. If your access is still pending, you'll see a brief "Pending Approval" message until an admin approves your account.</li>
                  </ul>
                </div>
                
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
