import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0?target=deno";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommissionNotification {
  notification_type: "manager_review" | "accounting_review" | "approved" | "rejected";
  request_id: string;
  title: string;
  submitter_name: string;
  submitter_email: string;
  manager_name?: string;
  manager_email?: string;
  manager_notes?: string;
  has_attachment: boolean;
}

async function sendEmail(to: string[], subject: string, html: string) {
  console.log("Sending email to:", to);
  
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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
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
      console.error("Authentication failed:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const payload: CommissionNotification = await req.json();
    console.log("Commission notification payload:", payload);

    const { notification_type, request_id, title, submitter_name, submitter_email, manager_name, manager_email, manager_notes, has_attachment } = payload;
    const attachmentNote = has_attachment ? "📎 This commission includes an attached document." : "";
    const appUrl = Deno.env.get("APP_BASE_URL") || "https://hub.tsmroofs.com";

    const emailsSent: string[] = [];

    // Handle different notification types
    if (notification_type === "manager_review") {
      // Employee submitted → Notify their manager
      if (!manager_email) {
        console.error("No manager email provided for manager_review notification");
        return new Response(
          JSON.stringify({ error: "Manager email is required for manager_review notification" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const managerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .detail-row { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #64748b; font-size: 14px; }
            .value { font-weight: 500; margin-top: 4px; }
            .attachment-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 16px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Commission Pending Your Review</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">A team member has submitted a commission form for your approval.</p>
            </div>
            <div class="content">
              <span class="badge">Commission Form</span>
              
              <div class="details">
                <div class="detail-row">
                  <div class="label">Subject:</div>
                  <div class="value">${title}</div>
                </div>
                <div class="detail-row">
                  <div class="label">Submitted By:</div>
                  <div class="value">${submitter_name}</div>
                </div>
                <div class="detail-row">
                  <div class="label">Email:</div>
                  <div class="value">${submitter_email}</div>
                </div>
              </div>
              
              ${attachmentNote ? `<div class="attachment-note">${attachmentNote}</div>` : ''}
              
              <p style="margin-top: 20px;">Please log in to review and approve or reject this commission form. Once approved, it will be forwarded to accounting for final processing.</p>
              
              <a href="${appUrl}/requests" class="button">Review Commission</a>
            </div>
            <div class="footer">
              <p>TSM Roofing Employee Portal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail([manager_email], `⚠️ Commission Pending Review: ${title}`, managerHtml);
      emailsSent.push(manager_email);

      // Also send confirmation to submitter
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
              <h1 style="margin: 0; font-size: 24px;">Commission Submitted!</h1>
            </div>
            <div class="content">
              <p>Hi ${submitter_name},</p>
              <p>Your commission form titled "<strong>${title}</strong>" has been successfully submitted and is now pending review by your manager${manager_name ? ` (${manager_name})` : ''}.</p>
              <p>Once your manager approves it, the commission will be forwarded to accounting for processing.</p>
              <p style="margin-top: 24px;">Thank you,<br>TSM Roofing Team</p>
            </div>
            <div class="footer">
              <p>TSM Roofing Employee Portal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail([submitter_email], `Commission Submitted: ${title}`, submitterHtml);
      emailsSent.push(submitter_email);

    } else if (notification_type === "accounting_review") {
      // Manager approved → Notify accounting department
      const { data: accountingRecipients, error: recipientsError } = await supabaseAdmin
        .from("notification_settings")
        .select("recipient_email, recipient_name")
        .eq("notification_type", "commission_accounting")
        .eq("is_active", true);

      if (recipientsError) {
        console.error("Failed to fetch accounting recipients:", recipientsError);
      }

      const accountingEmails = accountingRecipients?.map(r => r.recipient_email) || [];
      
      if (accountingEmails.length === 0) {
        console.warn("No accounting recipients configured for commission_accounting notification type");
      } else {
        const accountingHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
              .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
              .badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
              .approved-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-left: 8px; }
              .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
              .detail-row { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
              .detail-row:last-child { border-bottom: none; }
              .label { color: #64748b; font-size: 14px; }
              .value { font-weight: 500; margin-top: 4px; }
              .manager-notes { background: #f0fdf4; border: 1px solid #10b981; padding: 12px; border-radius: 6px; margin-top: 16px; }
              .attachment-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 16px; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">💰 Commission Ready for Processing</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A commission form has been manager-approved and is ready for accounting review.</p>
              </div>
              <div class="content">
                <span class="badge">Commission Form</span>
                <span class="approved-badge">✓ Manager Approved</span>
                
                <div class="details">
                  <div class="detail-row">
                    <div class="label">Subject:</div>
                    <div class="value">${title}</div>
                  </div>
                  <div class="detail-row">
                    <div class="label">Submitted By:</div>
                    <div class="value">${submitter_name} (${submitter_email})</div>
                  </div>
                  <div class="detail-row">
                    <div class="label">Approved By:</div>
                    <div class="value">${manager_name || 'Manager'}</div>
                  </div>
                </div>
                
                ${manager_notes ? `<div class="manager-notes"><strong>Manager Notes:</strong><br>${manager_notes}</div>` : ''}
                ${attachmentNote ? `<div class="attachment-note">${attachmentNote}</div>` : ''}
                
                <p style="margin-top: 20px;">Please log in to review and process this commission.</p>
                
                <a href="${appUrl}/requests" class="button">Process Commission</a>
              </div>
              <div class="footer">
                <p>TSM Roofing Employee Portal</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail(accountingEmails, `💰 Commission Approved for Processing: ${title}`, accountingHtml);
        emailsSent.push(...accountingEmails);
      }

      // Also notify the submitter that manager approved
      const submitterApprovedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
            .checkmark { font-size: 48px; margin-bottom: 16px; }
            .manager-notes { background: #f0fdf4; border: 1px solid #10b981; padding: 12px; border-radius: 6px; margin-top: 16px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="checkmark">✓</div>
              <h1 style="margin: 0; font-size: 24px;">Manager Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${submitter_name},</p>
              <p>Great news! Your commission form titled "<strong>${title}</strong>" has been approved by your manager${manager_name ? ` (${manager_name})` : ''} and has been forwarded to accounting for processing.</p>
              ${manager_notes ? `<div class="manager-notes"><strong>Manager Notes:</strong><br>${manager_notes}</div>` : ''}
              <p style="margin-top: 24px;">Thank you,<br>TSM Roofing Team</p>
            </div>
            <div class="footer">
              <p>TSM Roofing Employee Portal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail([submitter_email], `✓ Commission Manager Approved: ${title}`, submitterApprovedHtml);
      emailsSent.push(submitter_email);

    } else if (notification_type === "approved") {
      // Final approval by accounting/admin
      const approvedHtml = `
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
              <div class="checkmark">✓✓</div>
              <h1 style="margin: 0; font-size: 24px;">Commission Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${submitter_name},</p>
              <p>Congratulations! Your commission form titled "<strong>${title}</strong>" has been fully approved and is being processed by accounting.</p>
              <p style="margin-top: 24px;">Thank you,<br>TSM Roofing Team</p>
            </div>
            <div class="footer">
              <p>TSM Roofing Employee Portal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail([submitter_email], `✓ Commission Fully Approved: ${title}`, approvedHtml);
      emailsSent.push(submitter_email);

    } else if (notification_type === "rejected") {
      // Rejection at any stage
      const rejectedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
            .icon { font-size: 48px; margin-bottom: 16px; }
            .notes { background: #fef2f2; border: 1px solid #dc2626; padding: 12px; border-radius: 6px; margin-top: 16px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">✗</div>
              <h1 style="margin: 0; font-size: 24px;">Commission Rejected</h1>
            </div>
            <div class="content">
              <p>Hi ${submitter_name},</p>
              <p>Unfortunately, your commission form titled "<strong>${title}</strong>" has been rejected.</p>
              ${manager_notes ? `<div class="notes"><strong>Reason:</strong><br>${manager_notes}</div>` : ''}
              <p style="margin-top: 20px;">Please review the feedback and submit a new request if needed.</p>
              <p style="margin-top: 24px;">Thank you,<br>TSM Roofing Team</p>
            </div>
            <div class="footer">
              <p>TSM Roofing Employee Portal</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail([submitter_email], `Commission Rejected: ${title}`, rejectedHtml);
      emailsSent.push(submitter_email);
    }

    console.log("Commission notifications sent to:", emailsSent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: emailsSent,
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-commission-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
