import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Manager email addresses for notifications
const NOTIFICATION_RECIPIENTS = [
  "courtneymurphy@tsmroofs.com",
  "jordan.pollei@tsmroofs.com", 
  "conrad.demecs@tsmroofs.com"
];

interface RequestNotification {
  type: string;
  title: string;
  description: string | null;
  submitter_name: string;
  submitter_email: string;
  has_attachment: boolean;
}

const requestTypeLabels: Record<string, string> = {
  commission: "Commission Form",
  sop_update: "SOP Update Request",
  it_access: "IT Access Request",
  hr: "HR Request",
};

async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TSM Roofing <onboarding@resend.dev>",
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

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, title, description, submitter_name, submitter_email, has_attachment }: RequestNotification = await req.json();

    console.log("Sending notification for request:", { type, title, submitter_name });

    const requestLabel = requestTypeLabels[type] || type;
    const attachmentNote = has_attachment ? "📎 This request includes an attached document." : "";

    // Send notification to managers
    const managerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
          .badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #64748b; }
          .value { font-weight: 500; }
          .attachment-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 16px; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">New Request Submitted</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">A team member has submitted a new request for your review.</p>
          </div>
          <div class="content">
            <span class="badge">${requestLabel}</span>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Subject:</span>
                <span class="value">${title}</span>
              </div>
              <div class="detail-row">
                <span class="label">Submitted By:</span>
                <span class="value">${submitter_name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${submitter_email}</span>
              </div>
              ${description ? `
              <div style="padding-top: 12px;">
                <span class="label">Details:</span>
                <p style="margin: 8px 0 0 0;">${description}</p>
              </div>
              ` : ''}
            </div>
            
            ${attachmentNote ? `<div class="attachment-note">${attachmentNote}</div>` : ''}
            
            <p style="margin-top: 20px;">Please log in to the TSM Portal to review and take action on this request.</p>
          </div>
          <div class="footer">
            <p>TSM Roofing Employee Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const managerEmailResponse = await sendEmail(
      NOTIFICATION_RECIPIENTS,
      `New ${requestLabel} Submitted: ${title}`,
      managerHtml
    );

    console.log("Manager notification sent:", managerEmailResponse);

    // Send confirmation to submitter
    const submitterHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
          .checkmark { font-size: 48px; margin-bottom: 16px; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="checkmark">✓</div>
            <h1 style="margin: 0; font-size: 24px;">Request Received!</h1>
          </div>
          <div class="content">
            <p>Hi ${submitter_name},</p>
            <p>Your <strong>${requestLabel}</strong> titled "<strong>${title}</strong>" has been successfully submitted and is now pending review.</p>
            <p>A manager will review your request and you'll be notified once a decision is made.</p>
            <p style="margin-top: 24px;">Thank you,<br>TSM Roofing Team</p>
          </div>
          <div class="footer">
            <p>TSM Roofing Employee Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const submitterEmailResponse = await sendEmail(
      [submitter_email],
      `Your ${requestLabel} Has Been Submitted`,
      submitterHtml
    );

    console.log("Submitter confirmation sent:", submitterEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        managerEmail: managerEmailResponse,
        submitterEmail: submitterEmailResponse 
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
