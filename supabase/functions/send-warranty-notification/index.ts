import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WarrantyNotification {
  notification_type: "submitted" | "status_change" | "assigned" | "completed";
  warranty_id: string;
  customer_name: string;
  job_address: string;
  issue_description: string;
  priority_level: string;
  status: string;
  previous_status?: string;
  assigned_to?: string;
  assigned_to_user_id?: string;
  submitter_email?: string;
  submitter_name?: string;
  notes?: string;
}

async function sendEmail(to: string[], subject: string, html: string) {
  console.log("Sending warranty email to:", to);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TSM Roofing <notifications@hub.tsmroofs.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#f97316",
  emergency: "#ef4444",
};

// Dynamic recipient resolution using notification_routing and role_assignments
async function resolveRecipients(
  supabaseAdmin: any,
  notificationType: string,
  assignedToUserId?: string
): Promise<string[]> {
  const recipients: string[] = [];

  // If assigned to a specific user, get their email first
  if (assignedToUserId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", assignedToUserId)
      .single();
    
    if (profile?.email) {
      recipients.push(profile.email);
      console.log("Added assigned user email:", profile.email);
    }
  }

  // Get notification routing configuration
  const { data: routing } = await supabaseAdmin
    .from("notification_routing")
    .select("*")
    .eq("notification_type", notificationType)
    .eq("enabled", true)
    .single();

  if (!routing) {
    console.log("No routing configured for:", notificationType);
    return recipients;
  }

  // Get role assignment for the primary role
  const { data: roleAssignment } = await supabaseAdmin
    .from("role_assignments")
    .select("*")
    .eq("role_name", routing.primary_role)
    .eq("active", true)
    .single();

  if (roleAssignment) {
    // Priority: assigned_email > backup_email > fallback_email
    if (roleAssignment.assigned_email) {
      recipients.push(roleAssignment.assigned_email);
      console.log("Added assigned role email:", roleAssignment.assigned_email);
    } else if (roleAssignment.backup_email) {
      recipients.push(roleAssignment.backup_email);
      console.log("Added backup role email:", roleAssignment.backup_email);
    } else {
      recipients.push(routing.fallback_email);
      console.log("Added fallback email:", routing.fallback_email);
    }
  } else {
    // No role assignment, use fallback
    recipients.push(routing.fallback_email);
    console.log("No role assignment, using fallback:", routing.fallback_email);
  }

  // Deduplicate
  return [...new Set(recipients.filter(e => e && e.trim()))];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WarrantyNotification = await req.json();
    console.log("Warranty notification payload:", payload);

    // HARD LOCK: Always use hub.tsmroofs.com for all portal links - never use any other domain
    const appUrl = "https://hub.tsmroofs.com";
    const warrantyUrl = `${appUrl}/warranties?id=${payload.warranty_id}`;
    const priorityColor = PRIORITY_COLORS[payload.priority_level] || "#6b7280";

    // Determine notification type for routing lookup
    const routingType = payload.notification_type === "submitted" 
      ? "warranty_submission" 
      : "warranty_submission"; // All warranty notifications route to Production

    // Resolve recipients dynamically
    const recipientEmails = await resolveRecipients(
      supabaseAdmin,
      routingType,
      payload.assigned_to_user_id
    );

    if (recipientEmails.length === 0) {
      console.log("No recipients resolved for warranty notifications");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let heading = "";
    let headerColor = "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)";

    switch (payload.notification_type) {
      case "submitted":
        subject = `🔧 New Warranty Request: ${payload.customer_name}`;
        heading = "New Warranty Request Submitted";
        headerColor = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        break;
      case "status_change":
        subject = `📋 Warranty Status Updated: ${payload.customer_name}`;
        heading = "Warranty Status Changed";
        headerColor = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
        break;
      case "assigned":
        subject = `👤 Warranty Assigned: ${payload.customer_name}`;
        heading = "Warranty Request Assigned";
        headerColor = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
        break;
      case "completed":
        subject = `✅ Warranty Completed: ${payload.customer_name}`;
        heading = "Warranty Request Completed";
        headerColor = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
        break;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${headerColor}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Customer:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${payload.customer_name}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Address:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${payload.job_address}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Priority:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                  ${payload.priority_level}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Status:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #1e40af;">
                ${payload.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </td>
            </tr>
            ${payload.previous_status ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Previous Status:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${payload.previous_status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </td>
            </tr>
            ` : ""}
            ${payload.assigned_to ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Assigned To:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${payload.assigned_to}
              </td>
            </tr>
            ` : ""}
            <tr>
              <td colspan="2" style="padding: 15px 0;">
                <strong>Issue Description:</strong><br>
                <p style="margin: 8px 0 0 0; color: #4b5563;">${payload.issue_description}</p>
              </td>
            </tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${warrantyUrl}" style="background: ${headerColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              View Warranty Details
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} TSM Roofing. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(recipientEmails, subject, emailHtml);
    console.log("Warranty notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending warranty notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
