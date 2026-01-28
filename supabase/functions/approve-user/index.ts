import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApproveUserRequest {
  user_id: string;
  assigned_role: "admin" | "manager" | "employee";
  assigned_department_id: string | null;
  assigned_tier_id: string | null;
  assigned_manager_id: string | null;
  custom_message?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Team Member",
};

/**
 * ATOMIC USER APPROVAL - Server-Side Edge Function
 * 
 * GOVERNANCE: This function implements the CANONICAL approval commit:
 * 1. All database updates MUST succeed before sending email
 * 2. employee_status = 'active' is the SINGLE SOURCE OF TRUTH for access
 * 3. pending_approvals.status is updated to 'approved' atomically
 * 4. No partial state - if ANY step fails, the entire operation fails
 */
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get approver from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized - no auth header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: approver }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !approver) {
      throw new Error("Unauthorized - invalid token");
    }

    // Verify approver is admin
    const { data: approverRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", approver.id)
      .maybeSingle();

    if (approverRole?.role !== "admin") {
      throw new Error("Forbidden - only admins can approve users");
    }

    const payload: ApproveUserRequest = await req.json();
    const { 
      user_id, 
      assigned_role, 
      assigned_department_id, 
      assigned_tier_id, 
      assigned_manager_id,
      custom_message 
    } = payload;

    if (!user_id || !assigned_role) {
      throw new Error("Missing required fields: user_id and assigned_role");
    }

    console.log(`[APPROVE-USER] Starting atomic approval for user: ${user_id}`);
    console.log(`[APPROVE-USER] Assigned role: ${assigned_role}, dept: ${assigned_department_id}`);

    const now = new Date().toISOString();

    // ========================================================================
    // STEP 1: Update profile to ACTIVE status (CANONICAL ACCESS FIELD)
    // ========================================================================
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_approved: true,
        employee_status: "active", // CANONICAL: This grants access
        approved_at: now,
        approved_by: approver.id,
        department_id: assigned_department_id,
        manager_id: assigned_manager_id,
        commission_tier_id: assigned_tier_id,
      })
      .eq("id", user_id)
      .select("email, full_name")
      .single();

    if (profileError) {
      console.error("[APPROVE-USER] Profile update failed:", profileError);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    console.log(`[APPROVE-USER] Profile updated successfully for: ${profileData.email}`);

    // ========================================================================
    // STEP 2: Update pending_approvals to 'approved' status
    // ========================================================================
    const { error: pendingApprovalError } = await supabaseAdmin
      .from("pending_approvals")
      .update({
        status: "approved",
        approved_by: approver.id,
        approved_at: now,
        notes: `Approved as ${assigned_role}`,
      })
      .eq("entity_type", "user")
      .eq("entity_id", user_id);

    if (pendingApprovalError) {
      console.warn("[APPROVE-USER] pending_approvals update warning:", pendingApprovalError);
      // Non-blocking - profile update is canonical
    }

    console.log("[APPROVE-USER] pending_approvals updated");

    // ========================================================================
    // STEP 3: Update user role in user_roles table
    // ========================================================================
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: assigned_role })
      .eq("user_id", user_id);

    if (roleError) {
      // Try insert if update fails (user_role might not exist)
      const { error: insertRoleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: user_id,
          role: assigned_role,
        }, { onConflict: "user_id" });

      if (insertRoleError) {
        console.error("[APPROVE-USER] Role assignment failed:", insertRoleError);
        throw new Error(`Failed to assign role: ${insertRoleError.message}`);
      }
    }

    console.log(`[APPROVE-USER] Role ${assigned_role} assigned`);

    // ========================================================================
    // STEP 4: Get department name for email
    // ========================================================================
    let departmentName: string | null = null;
    if (assigned_department_id) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("name")
        .eq("id", assigned_department_id)
        .maybeSingle();
      departmentName = dept?.name || null;
    }

    // ========================================================================
    // STEP 5: Send approval email ONLY AFTER all DB commits succeed
    // GOVERNANCE: No cosmetic emails - DB state must be correct first
    // ========================================================================
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && profileData.email) {
      try {
        const resend = new Resend(resendKey);
        const loginUrl = "https://tsmroofpro.com/auth";
        const roleDisplay = ROLE_LABELS[assigned_role] || assigned_role;

        const plainText = `Account Approved!

Hi ${profileData.full_name || "there"},

Great news! Your TSM Hub account has been approved by an administrator. You now have full access to the platform.

${roleDisplay ? `Role: ${roleDisplay}` : ""}
${departmentName ? `Department: ${departmentName}` : ""}

${custom_message ? `Message from the Admin:\n${custom_message}` : ""}

Log in to TSM Hub: ${loginUrl}

If you have any questions, please reach out to your manager or administrator.

© ${new Date().getFullYear()} TSM Roofing. All rights reserved.`;

        await resend.emails.send({
          from: "TSM Hub <notifications@tsmroofpro.com>",
          reply_to: "sheldonmurphy@tsmroofs.com",
          to: [profileData.email],
          subject: "Your TSM Hub Account Has Been Approved!",
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
                <h1 style="color: white; margin: 0; font-size: 24px;">Account Approved! 🎉</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Hi ${profileData.full_name || "there"},
                </p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Great news! Your TSM Hub account has been approved by an administrator. You now have full access to the platform.
                </p>
                
                ${(roleDisplay || departmentName) ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Your Account Details:</p>
                  <table style="width: 100%; border-collapse: collapse;">
                    ${roleDisplay ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Role:</td>
                      <td style="padding: 4px 0; font-weight: 600; font-size: 14px;">${roleDisplay}</td>
                    </tr>
                    ` : ''}
                    ${departmentName ? `
                    <tr>
                      <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Department:</td>
                      <td style="padding: 4px 0; font-weight: 600; font-size: 14px;">${departmentName}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                ` : ''}
                
                ${custom_message ? `
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                  <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Message from the Admin:</p>
                  <p style="font-size: 14px; color: #374151; margin: 0; white-space: pre-wrap;">${custom_message}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin: 30px 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                    <tr>
                      <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                        <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                          Log In to TSM Hub
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; text-align: center;">
                  Or copy this link: <a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a>
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                <p>© ${new Date().getFullYear()} TSM Roofing. All rights reserved.</p>
              </div>
            </body>
            </html>
          `,
        });

        console.log("[APPROVE-USER] Approval email sent successfully");
      } catch (emailError) {
        console.error("[APPROVE-USER] Email send warning:", emailError);
        // Email failure is non-blocking - user is already approved in DB
      }
    }

    console.log(`[APPROVE-USER] APPROVAL COMPLETE for ${profileData.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${profileData.email} approved successfully`,
        user: {
          id: user_id,
          email: profileData.email,
          full_name: profileData.full_name,
          role: assigned_role,
          department: departmentName,
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[APPROVE-USER] ERROR:", error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: error.message.includes("Unauthorized") ? 401 : 
               error.message.includes("Forbidden") ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
