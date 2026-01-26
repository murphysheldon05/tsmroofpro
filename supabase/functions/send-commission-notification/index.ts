import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CommissionNotification {
  notification_type: "submitted" | "manager_approved" | "accounting_approved" | "paid" | "revision_required" | "status_change";
  commission_id: string;
  job_name: string;
  job_address: string;
  sales_rep_name: string | null;
  subcontractor_name: string | null;
  submission_type: "employee" | "subcontractor";
  contract_amount: number;
  net_commission_owed: number;
  submitter_email?: string;
  submitter_name?: string;
  status?: string;
  previous_status?: string;
  notes?: string;
  changed_by_name?: string;
}

// Dynamic recipient resolution using notification_routing and role_assignments
async function resolveRecipients(
  supabaseClient: any,
  notificationType: string
): Promise<string[]> {
  const recipients: string[] = [];

  // Get notification routing configuration
  const { data: routing } = await supabaseClient
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
  const { data: roleAssignment } = await supabaseClient
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

  return [...new Set(recipients.filter(e => e && e.trim()))];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: CommissionNotification = await req.json();
    console.log("Commission notification payload:", payload);

    // HARD LOCK: Always use tsmroofpro.com for all portal links - never use any other domain
    const appUrl = "https://tsmroofpro.com";
    const commissionUrl = `${appUrl}/commissions/${payload.commission_id}`;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    };

    const repName = payload.submission_type === "subcontractor" 
      ? `Subcontractor: ${payload.subcontractor_name}` 
      : payload.sales_rep_name;

    let subject = "";
    let heading = "";
    let introText = "";
    let buttonText = "View Commission";
    let recipientEmails: string[] = [];
    let additionalContent = "";
    let headerColor = "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)";

    switch (payload.notification_type) {
      case "submitted":
        subject = `📋 New Commission Submitted: ${payload.job_name}`;
        heading = "New Commission Submitted";
        introText = `A new commission has been submitted and is awaiting manager review.`;
        headerColor = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        // Use dynamic routing for commission submissions
        recipientEmails = await resolveRecipients(supabaseClient, "commission_submission");
        additionalContent = `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Job Name:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${payload.job_name}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Job Address:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${payload.job_address}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Rep/Subcontractor:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${repName}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Contract Amount:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${formatCurrency(payload.contract_amount)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Net Commission:</strong>
            </td>
            <td style="padding: 10px 0; color: #16a34a; font-weight: bold;">
              ${formatCurrency(payload.net_commission_owed)}
            </td>
          </tr>
        `;
        break;

      case "manager_approved":
        subject = `✅ Commission Manager Approved: ${payload.job_name}`;
        heading = "Manager Approved - Pending Accounting";
        introText = `The commission for ${payload.job_name} has been approved by the manager and is now awaiting accounting review.`;
        headerColor = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
        // Notify accounting via dynamic routing + submitter
        recipientEmails = await resolveRecipients(supabaseClient, "commission_accounting");
        if (payload.submitter_email) {
          recipientEmails.push(payload.submitter_email);
        }
        additionalContent = `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Job:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${payload.job_name}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Rep:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${repName}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Commission Amount:</strong>
            </td>
            <td style="padding: 10px 0; color: #3b82f6; font-weight: bold;">
              ${formatCurrency(payload.net_commission_owed)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 15px; background: #dbeafe; border-radius: 8px; margin-top: 10px;">
              <strong>Status:</strong> Waiting for accounting review and final approval.
            </td>
          </tr>
        `;
        break;

      case "accounting_approved":
        subject = `💰 Commission Approved for Payment: ${payload.job_name}`;
        heading = "Commission Approved for Payment!";
        introText = `Great news! The commission for ${payload.job_name} has been fully approved and is ready for payout.`;
        headerColor = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
        // Notify submitter + accounting
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        const accountingRecipients = await resolveRecipients(supabaseClient, "commission_accounting");
        recipientEmails.push(...accountingRecipients);
        additionalContent = `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Job:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${payload.job_name}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Commission Amount:</strong>
            </td>
            <td style="padding: 10px 0; color: #16a34a; font-weight: bold; font-size: 20px;">
              ${formatCurrency(payload.net_commission_owed)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 15px; background: #dcfce7; border-radius: 8px; margin-top: 10px;">
              ✅ <strong>Fully Approved</strong> - This commission is now ready for payout processing.
            </td>
          </tr>
        `;
        break;

      case "paid":
        subject = `🎉 Commission Paid: ${payload.job_name}`;
        heading = "Commission Paid! 🎉";
        introText = `Your commission for ${payload.job_name} has been processed and paid.`;
        headerColor = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        additionalContent = `
          <tr>
            <td style="padding: 10px 0;">
              <strong>Amount Paid:</strong>
            </td>
            <td style="padding: 10px 0; color: #16a34a; font-weight: bold; font-size: 24px;">
              ${formatCurrency(payload.net_commission_owed)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 20px; background: #dcfce7; border-radius: 8px; margin-top: 10px; text-align: center;">
              🎉 <strong>Payment Complete!</strong>
            </td>
          </tr>
        `;
        break;

      case "revision_required":
        subject = `⚠️ Commission Needs Revision: ${payload.job_name}`;
        heading = "Commission Revision Required";
        introText = `The commission submission for ${payload.job_name} requires revisions before it can be approved.`;
        headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        additionalContent = `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Job:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${payload.job_name}
            </td>
          </tr>
        `;
        if (payload.notes) {
          additionalContent += `
            <tr>
              <td colspan="2" style="padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-top: 10px;">
                <strong>Revision Reason:</strong><br>
                <span style="color: #dc2626;">${payload.notes}</span>
              </td>
            </tr>
          `;
        }
        buttonText = "View & Revise";
        break;

      case "status_change":
        subject = `📋 Commission Status Updated: ${payload.job_name}`;
        heading = "Commission Status Changed";
        introText = `The status for commission "${payload.job_name}" has been updated.`;
        headerColor = "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        additionalContent = `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>Previous Status:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${payload.previous_status?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "N/A"}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>New Status:</strong>
            </td>
            <td style="padding: 10px 0; font-weight: bold; color: #1e40af;">
              ${payload.status?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </td>
          </tr>
          ${payload.notes ? `
            <tr>
              <td colspan="2" style="padding: 15px; background: #f3f4f6; border-radius: 8px; margin-top: 10px;">
                <strong>Notes:</strong><br>
                ${payload.notes}
              </td>
            </tr>
          ` : ""}
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${payload.notification_type}`);
    }

    // Filter out empty emails and deduplicate
    recipientEmails = [...new Set(recipientEmails.filter(email => email && email.trim()))];

    if (recipientEmails.length === 0) {
      console.log("No recipients for notification, skipping email send");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients, email skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${introText}
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            ${additionalContent}
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${commissionUrl}" style="background: ${headerColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
              ${buttonText}
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            If you have questions, please contact your supervisor or the accounting team.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} TSM Roofing. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    console.log("Sending commission notification to:", recipientEmails);

    const emailResponse = await resend.emails.send({
      from: "TSM Hub <notifications@tsmroofpro.com>",
      to: recipientEmails,
      subject,
      html: emailHtml,
    });

    console.log("Commission notification sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending commission notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
