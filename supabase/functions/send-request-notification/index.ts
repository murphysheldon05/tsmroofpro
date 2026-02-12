import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestNotification {
  type: string;
  title: string;
  description: string | null;
  submitter_name: string;
  submitter_email: string;
  has_attachment: boolean;
}

const requestTypeLabels: Record<string, string> = {
  sop_update: "SOP Update Request",
  it_access: "IT Access Request",
  hr: "HR Request",
};

async function sendEmail(to: string[], subject: string, html: string, text: string) {
  console.log("Sending email to:", to);
  
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

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for fetching notification settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the JWT token using user client
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { type, title, description, submitter_name, submitter_email, has_attachment }: RequestNotification = await req.json();

    // Guard required fields
    if (!type || !title || !submitter_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, title, and submitter_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending notification for request:", { type, title, submitter_name });

    // Create in-app notification for admins and managers
    try {
      // Notify all admins
      const { data: adminUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (adminUsers) {
        for (const au of adminUsers) {
          if (au.user_id === user.id) continue; // Don't notify submitter
          await supabaseAdmin.from("user_notifications").insert({
            user_id: au.user_id,
            notification_type: "request_submitted",
            title: `📋 New ${requestTypeLabels[type] || type}: ${title}`,
            message: `${submitter_name} submitted a new request for review.`,
            entity_type: "request",
            entity_id: title, // Using title as reference since requests may not have UUID
          });
        }
      }

      // Notify managers
      const { data: managerUsers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["manager", "sales_manager"]);
      
      if (managerUsers) {
        for (const mu of managerUsers) {
          if (mu.user_id === user.id) continue;
          await supabaseAdmin.from("user_notifications").insert({
            user_id: mu.user_id,
            notification_type: "request_submitted",
            title: `📋 New ${requestTypeLabels[type] || type}: ${title}`,
            message: `${submitter_name} submitted a new request for review.`,
            entity_type: "request",
            entity_id: title,
          });
        }
      }
    } catch (notifyError) {
      console.error("Failed to create in-app notifications for request:", notifyError);
    }

    // Determine which notification type to use based on request type
    let notificationType = "request_submission"; // default for general requests
    if (type === "hr") {
      notificationType = "hr_request";
    } else if (type === "it_access") {
      notificationType = "it_request";
    }

    console.log("Using notification type:", notificationType);

    // Fetch notification recipients from database based on request type
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("notification_settings")
      .select("recipient_email")
      .eq("notification_type", notificationType)
      .eq("is_active", true);

    if (recipientsError) {
      console.error("Failed to fetch notification recipients:", recipientsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notification recipients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no type-specific recipients, fall back to general request_submission recipients
    let recipientEmails: string[] = [];
    if (!recipients || recipients.length === 0) {
      console.log("No type-specific recipients, checking general request_submission...");
      const { data: fallbackRecipients } = await supabaseAdmin
        .from("notification_settings")
        .select("recipient_email")
        .eq("notification_type", "request_submission")
        .eq("is_active", true);
      
      recipientEmails = fallbackRecipients?.map(r => r.recipient_email) || [];
    } else {
      recipientEmails = recipients.map(r => r.recipient_email);
    }

    if (recipientEmails.length === 0) {
      console.warn("No active notification recipients configured");
      // Still send confirmation to submitter even if no managers are configured
    }

    console.log("Notification recipients:", recipientEmails);

    const requestLabel = requestTypeLabels[type] || type;
    const attachmentNote = has_attachment ? "📎 This request includes an attached document." : "";

    // HARD LOCK: Always use tsmroofpro.com for all portal links - never use any other domain
    const appUrl = "https://tsmroofpro.com";
    const requestsUrl = `${appUrl}/requests`;

    // Send notification to managers (if any recipients configured)
    let managerEmailResponse = null;
    if (recipientEmails.length > 0) {
      const managerPlainText = `New ${requestLabel} Submitted

A team member has submitted a new request for your review.

Request Type: ${requestLabel}
Subject: ${title}
Submitted By: ${submitter_name}
Email: ${submitter_email}
${description ? `Details: ${description}` : ''}

${attachmentNote}

Review this request: ${requestsUrl}

If the link doesn't work, copy and paste this URL: ${requestsUrl}

TSM Roofing Employee Portal`;

      const managerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">New Request Submitted</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">A team member has submitted a new request for your review.</p>
          </div>
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <span style="display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">${requestLabel}</span>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b;">Subject:</span>
                <span style="font-weight: 500; margin-left: 8px;">${title}</span>
              </div>
              <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b;">Submitted By:</span>
                <span style="font-weight: 500; margin-left: 8px;">${submitter_name}</span>
              </div>
              <div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b;">Email:</span>
                <span style="font-weight: 500; margin-left: 8px;">${submitter_email}</span>
              </div>
              ${description ? `
              <div style="padding-top: 12px;">
                <span style="color: #64748b;">Details:</span>
                <p style="margin: 8px 0 0 0;">${description}</p>
              </div>
              ` : ''}
            </div>
            
            ${attachmentNote ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 16px;">${attachmentNote}</div>` : ''}
            
            <!-- Outlook-compatible table-based button -->
            <div style="text-align: center; margin: 30px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                    <a href="${requestsUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                      Review Request
                    </a>
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              Or copy this link: <a href="${requestsUrl}" style="color: #3b82f6;">${requestsUrl}</a>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
            <p>TSM Roofing Employee Portal</p>
          </div>
        </body>
        </html>
      `;

      managerEmailResponse = await sendEmail(
        recipientEmails,
        `New ${requestLabel} Submitted: ${title}`,
        managerHtml,
        managerPlainText
      );

      console.log("Manager notification sent:", managerEmailResponse);
    }

    // Send confirmation to submitter
    const submitterPlainText = `Request Received!

Hi ${submitter_name},

Your ${requestLabel} titled "${title}" has been successfully submitted and is now pending review.

A manager will review your request and you'll be notified once a decision is made.

View your requests: ${requestsUrl}

If the link doesn't work, copy and paste this URL: ${requestsUrl}

Thank you,
TSM Roofing Team

TSM Roofing Employee Portal`;

    const submitterHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
          <h1 style="margin: 0; font-size: 24px;">Request Received!</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${submitter_name},</p>
          <p>Your <strong>${requestLabel}</strong> titled "<strong>${title}</strong>" has been successfully submitted and is now pending review.</p>
          <p>A manager will review your request and you'll be notified once a decision is made.</p>
          
          <!-- Outlook-compatible table-based button -->
          <div style="text-align: center; margin: 30px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                  <a href="${requestsUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                    View My Requests
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Or copy this link: <a href="${requestsUrl}" style="color: #3b82f6;">${requestsUrl}</a>
          </p>
          
          <p style="margin-top: 24px;">Thank you,<br>TSM Roofing Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
          <p>TSM Roofing Employee Portal</p>
        </div>
      </body>
      </html>
    `;

    const submitterEmailResponse = await sendEmail(
      [submitter_email],
      `Your ${requestLabel} Has Been Submitted`,
      submitterHtml,
      submitterPlainText
    );

    console.log("Submitter confirmation sent:", submitterEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        managerEmail: managerEmailResponse,
        submitterEmail: submitterEmailResponse,
        recipientCount: recipientEmails.length
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-request-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
