import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY environment variable is not set");
}

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

async function sendEmail(to: string[], subject: string, html: string, text: string) {
  console.log("Sending warranty email to:", to);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TSM Roofing <notifications@tsmroofpro.com>",
      reply_to: "sheldonmurphy@tsmroofs.com",
      to,
      subject,
      text,
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
      .maybeSingle();

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

    // BUG FIX: Guard required fields
    if (!payload.warranty_id) {
      return new Response(
        JSON.stringify({ error: "warranty_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BUG FIX: Null-safe defaults for all payload fields
    const customerName = payload.customer_name || "Unknown Customer";
    const jobAddress = payload.job_address || "Address not provided";
    const issueDescription = payload.issue_description || "No description provided";
    const priorityLevel = payload.priority_level || "medium";
    const currentStatus = payload.status || "submitted";
    const assignedTo = payload.assigned_to || null;

    // HARD LOCK: Always use tsmroofpro.com for all portal links - never use any other domain
    const appUrl = "https://tsmroofpro.com";
    const warrantyUrl = `${appUrl}/warranties?id=${payload.warranty_id}`;
    const priorityColor = PRIORITY_COLORS[priorityLevel] || "#6b7280";

    // Determine notification type for routing lookup
    const routingType = payload.notification_type === "submitted"
      ? "warranty_submission"
      : payload.notification_type === "assigned"
      ? "warranty_assigned"
      : payload.notification_type === "completed"
      ? "warranty_completed"
      : "warranty_status_change";

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
    let headerColor = "#1e40af";

    switch (payload.notification_type) {
      case "submitted":
        subject = `🔧 New Warranty Request: ${customerName}`;
        heading = "New Warranty Request Submitted";
        headerColor = "#d97706";
        break;
      case "status_change":
        subject = `📋 Warranty Status Updated: ${customerName}`;
        heading = "Warranty Status Changed";
        headerColor = "#1d4ed8";
        break;
      case "assigned":
        subject = `👤 Warranty Assigned: ${customerName}`;
        heading = "Warranty Request Assigned";
        headerColor = "#7c3aed";
        break;
      case "completed":
        subject = `✅ Warranty Completed: ${customerName}`;
        heading = "Warranty Request Completed";
        headerColor = "#059669";
        break;
    }

    // Plain text version for deliverability
    const plainText = `${heading}

Customer: ${customerName}
Address: ${jobAddress}
Priority: ${priorityLevel.toUpperCase()}
Status: ${currentStatus.replace(/_/g, " ")}
${payload.previous_status ? `Previous Status: ${payload.previous_status.replace(/_/g, " ")}` : ""}
${assignedTo ? `Assigned To: ${assignedTo}` : ""}

Issue Description:
${issueDescription}

View Warranty Details: ${warrantyUrl}

© ${new Date().getFullYear()} TSM Roofing. All rights reserved.`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${headerColor}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${heading}</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Customer:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${customerName}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Address:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${jobAddress}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Priority:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                  ${priorityLevel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Status:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #1e40af;">
                ${currentStatus.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
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
            ${assignedTo ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>Assigned To:</strong>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${assignedTo}
              </td>
            </tr>
            ` : ""}
            <tr>
              <td colspan="2" style="padding: 15px 0;">
                <strong>Issue Description:</strong><br>
                <p style="margin: 8px 0 0 0; color: #4b5563;">${issueDescription}</p>
              </td>
            </tr>
          </table>
          
          <!-- Outlook-compatible table-based button -->
          <div style="text-align: center; margin: 30px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                  <a href="${warrantyUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                    View Warranty Details
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Or copy this link: <a href="${warrantyUrl}" style="color: #3b82f6;">${warrantyUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} TSM Roofing. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(recipientEmails, subject, emailHtml, plainText);
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
