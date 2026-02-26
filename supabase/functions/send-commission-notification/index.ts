import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CommissionNotification {
  notification_type: "submitted" | "manager_approved" | "accounting_approved" | "paid" | "rejected" | "denied" | "status_change" | "rejected_commission_revised";
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
  scheduled_pay_date?: string; // ISO date string of Friday pay date
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

// Create in-app notification for a user
async function createInAppNotification(
  supabaseClient: any,
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from("user_notifications")
      .insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
      });

    if (error) {
      console.error("Failed to create in-app notification:", error);
    } else {
      console.log("In-app notification created for user:", userId);
    }
  } catch (err) {
    console.error("Error creating in-app notification:", err);
  }
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

    const rawPayload = await req.json();
    console.log("Commission notification raw payload:", rawPayload);

    // BUG FIX: Accept both notification_type and action for backwards compatibility
    if (!rawPayload.notification_type && rawPayload.action) {
      rawPayload.notification_type = rawPayload.action;
    }

    if (!rawPayload.notification_type) {
      return new Response(
        JSON.stringify({ error: "Missing notification_type in payload" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!rawPayload.commission_id) {
      return new Response(
        JSON.stringify({ error: "Missing commission_id in payload" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload: CommissionNotification = rawPayload;
    console.log("Commission notification payload (resolved):", payload);

    // HARD LOCK: Always use tsmroofpro.com for all portal links - never use any other domain
    const appUrl = "https://tsmroofpro.com";
    // Route to correct detail page based on document_type
    const basePath = (rawPayload as any).document_type === 'commission_document' 
      ? 'commission-documents' 
      : 'commissions';
    const commissionUrl = `${appUrl}/${basePath}/${payload.commission_id}`;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    };

    const formatPayDateFn = (dateStr: string | undefined): string => {
      if (!dateStr) return "this Friday";
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const repName = payload.submission_type === "subcontractor" 
      ? `Subcontractor: ${payload.subcontractor_name}` 
      : payload.sales_rep_name;

    // Resolve admin reply-to email dynamically from profiles
    const { data: adminProfile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    const replyToEmail = adminProfile?.email || "notifications@tsmroofpro.com";

    let subject = "";
    let heading = "";
    let introText = "";
    let buttonText = "View Commission";
    let recipientEmails: string[] = [];
    let additionalContent = "";
    let additionalPlainText = "";
    let headerColor = "#1e40af";

    switch (payload.notification_type) {
      case "submitted":
        subject = `New Commission Submitted — ${payload.submitter_name || repName}`;
        heading = "New Commission Submitted";
        introText = `New commission submitted by <strong>${payload.submitter_name || repName}</strong>.`;
        headerColor = "#d97706";
        recipientEmails = await resolveRecipients(supabaseClient, "commission_submission");
        additionalPlainText = `Job: ${payload.job_name}\nRep: ${payload.submitter_name || repName}\nAmount: ${formatCurrency(payload.net_commission_owed)}`;
        additionalContent = `
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Rep:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.submitter_name || repName}</td></tr>
          <tr><td style="padding: 10px 0;"><strong>Net Commission:</strong></td><td style="padding: 10px 0; font-weight: bold;">${formatCurrency(payload.net_commission_owed)}</td></tr>
        `;
        buttonText = "Review Commission";
        break;

      case "manager_approved":
        subject = `Commission Ready for Payment — ${payload.submitter_name || repName}`;
        heading = "Commission Ready for Payment";
        introText = `Commission ready for payment review — <strong>${payload.submitter_name || repName}</strong> — <strong>${payload.job_name}</strong>.`;
        headerColor = "#1d4ed8";
        recipientEmails = await resolveRecipients(supabaseClient, "commission_accounting");
        additionalPlainText = `Rep: ${payload.submitter_name || repName}\nJob: ${payload.job_name}\nAmount: ${formatCurrency(payload.net_commission_owed)}`;
        additionalContent = `
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Rep:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.submitter_name || repName}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
          <tr><td style="padding: 10px 0;"><strong>Commission Amount:</strong></td><td style="padding: 10px 0; color: #3b82f6; font-weight: bold;">${formatCurrency(payload.net_commission_owed)}</td></tr>
        `;
        buttonText = "Review Commission";
        break;

      case "accounting_approved":
        // Celebratory email with scheduled pay date
        const payDateFormatted = formatPayDateFn(payload.scheduled_pay_date);
        subject = `🎉 Commission Approved - Payment Scheduled for ${payDateFormatted}!`;
        heading = "Congratulations! Your Commission is Approved! 🎉";
        introText = `Great news! Your commission for <strong>${payload.job_name}</strong> has been fully approved and is scheduled for payment!`;
        headerColor = "#059669";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        const accountingRecipients = await resolveRecipients(supabaseClient, "commission_accounting");
        recipientEmails.push(...accountingRecipients);
        additionalPlainText = `Job: ${payload.job_name}\nCommission Amount: ${formatCurrency(payload.net_commission_owed)}\nPayment Date: ${payDateFormatted}\n\n🎉 Your hard work is paying off!`;
        additionalContent = `
          <tr><td colspan="2" style="padding: 30px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #d1fae5 100%); border-radius: 16px; text-align: center; margin-bottom: 15px;">
            <div style="font-size: 48px; margin-bottom: 12px;">🎉💰🏠</div>
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #166534; font-weight: 600; margin-bottom: 8px;">Your Commission</div>
            <div style="font-size: 36px; font-weight: 800; color: #15803d; margin-bottom: 4px;">${formatCurrency(payload.net_commission_owed)}</div>
            <div style="font-size: 16px; color: #166534; font-weight: 600;">Has been approved! 🎊</div>
          </td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><strong>Payment Date:</strong></td><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #1e40af; font-weight: bold; font-size: 18px;">📅 ${payDateFormatted}</td></tr>
          <tr><td colspan="2" style="padding: 20px; background: #eff6ff; border-radius: 12px; margin-top: 10px; text-align: center;">
            <div style="font-size: 15px; font-weight: 600; color: #1e40af;">Payment will be deposited on ${payDateFormatted}</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">Your hard work is paying off — keep closing those deals! 💪</div>
          </td></tr>
        `;
        break;

      case "paid":
        subject = `Commission Paid — ${formatCurrency(payload.net_commission_owed)}`;
        heading = "Commission Paid! 🎉";
        introText = `Your commission for ${payload.job_name} has been processed and paid.`;
        headerColor = "#059669";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        additionalPlainText = `Amount Paid: ${formatCurrency(payload.net_commission_owed)}\n\n🎉 Payment Complete!`;
        additionalContent = `
          <tr><td style="padding: 10px 0;"><strong>Amount Paid:</strong></td><td style="padding: 10px 0; color: #16a34a; font-weight: bold; font-size: 24px;">${formatCurrency(payload.net_commission_owed)}</td></tr>
          <tr><td colspan="2" style="padding: 20px; background: #dcfce7; border-radius: 8px; margin-top: 10px; text-align: center;">🎉 <strong>Payment Complete!</strong></td></tr>
        `;
        break;

      case "rejected":
        subject = `Commission Rejected — Action Required`;
        heading = "Commission Rejected";
        introText = `Your commission for <strong>${payload.job_name}</strong> was rejected.${payload.notes ? ` Rejection reason: ${payload.notes}` : " Please review the notes below and resubmit."}`;
        headerColor = "#dc2626";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        additionalPlainText = `Job: ${payload.job_name}${payload.notes ? `\nRejection Reason: ${payload.notes}` : ""}`;
        additionalContent = `
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Rep:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${repName}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Commission Amount:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${formatCurrency(payload.net_commission_owed)}</td></tr>
          ${payload.notes ? `
          <tr><td colspan="2" style="padding: 20px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fecaca; border-radius: 12px; margin-top: 15px;">
            <div style="font-size: 16px; font-weight: bold; color: #991b1b; margin-bottom: 8px;">📝 Rejection Reason:</div>
            <div style="font-size: 14px; color: #dc2626; line-height: 1.6;">${payload.notes}</div>
            <div style="font-size: 13px; color: #9ca3af; margin-top: 12px;">Please make the requested changes and resubmit your commission.</div>
          </td></tr>` : ""}
        `;
        buttonText = "View & Resubmit";
        break;

      case "rejected_commission_revised":
        subject = `Rejected Commission Revised by ${payload.submitter_name || repName}`;
        heading = "Rejected Commission Revised";
        introText = `A previously rejected commission for <strong>${payload.job_name}</strong> has been revised and resubmitted by <strong>${payload.submitter_name || repName}</strong>. It is back in the compliance review queue.`;
        headerColor = "#d97706";
        recipientEmails = await resolveRecipients(supabaseClient, "commission_submission");
        additionalPlainText = `Job: ${payload.job_name}\nRep: ${payload.submitter_name || repName}\nAmount: ${formatCurrency(payload.net_commission_owed)}`;
        additionalContent = `
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Revised by:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.submitter_name || repName}</td></tr>
          <tr><td style="padding: 10px 0;"><strong>Commission Amount:</strong></td><td style="padding: 10px 0;">${formatCurrency(payload.net_commission_owed)}</td></tr>
        `;
        buttonText = "Review Commission";
        break;

      case "denied":
        subject = `🚫 Commission Denied: ${payload.job_name}`;
        heading = "Commission Denied";
        introText = `The commission submission for <strong>${payload.job_name}</strong> has been denied. The associated job number has been permanently locked.`;
        headerColor = "#991b1b";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        const adminRecipients = await resolveRecipients(supabaseClient, "commission_submission");
        recipientEmails.push(...adminRecipients);
        additionalPlainText = `Job: ${payload.job_name}\nRep: ${repName}${payload.notes ? `\nDenial Reason: ${payload.notes}` : ""}`;
        additionalContent = `
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Rep:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${repName}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${formatCurrency(payload.net_commission_owed)}</td></tr>
          ${payload.notes ? `
          <tr><td colspan="2" style="padding: 20px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fecaca; border-radius: 12px; margin-top: 15px;">
            <div style="font-size: 16px; font-weight: bold; color: #991b1b; margin-bottom: 8px;">🚫 Denial Reason:</div>
            <div style="font-size: 14px; color: #dc2626; line-height: 1.6;">${payload.notes}</div>
          </td></tr>` : ""}
        `;
        break;

      case "status_change":
        subject = `📋 Commission Status Updated: ${payload.job_name}`;
        heading = "Commission Status Changed";
        introText = `The status for commission "${payload.job_name}" has been updated.`;
        headerColor = "#4b5563";
        recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
        additionalPlainText = `Previous Status: ${payload.previous_status?.replace(/_/g, " ") || "N/A"}\nNew Status: ${payload.status?.replace(/_/g, " ")}${payload.notes ? `\nNotes: ${payload.notes}` : ""}`;
        additionalContent = `
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Previous Status:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.previous_status?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "N/A"}</td></tr>
          <tr><td style="padding: 10px 0;"><strong>New Status:</strong></td><td style="padding: 10px 0; font-weight: bold; color: #1e40af;">${payload.status?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</td></tr>
          ${payload.notes ? `<tr><td colspan="2" style="padding: 15px; background: #f3f4f6; border-radius: 8px; margin-top: 10px;"><strong>Notes:</strong><br>${payload.notes}</td></tr>` : ""}
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${payload.notification_type}`);
    }

    // Filter out empty emails and deduplicate
    recipientEmails = [...new Set(recipientEmails.filter(email => email && email.trim()))];

    const hasRepConfirmation = payload.notification_type === "submitted" && payload.submitter_email;
    if (recipientEmails.length === 0 && !hasRepConfirmation) {
      console.warn("No recipients resolved for commission notification:", payload.notification_type, "commission_id:", payload.commission_id);
      return new Response(
        JSON.stringify({ success: false, warning: "No recipients resolved", notification_type: payload.notification_type }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Plain text version for deliverability
    const plainText = `${heading}

${introText}

${additionalPlainText}

${buttonText}: ${commissionUrl}

If you have questions, please contact your supervisor or the accounting team.

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
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${introText}
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            ${additionalContent}
          </table>
          
          <!-- Outlook-compatible table-based button -->
          <div style="text-align: center; margin: 30px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                  <a href="${commissionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                    ${buttonText}
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Or copy this link: <a href="${commissionUrl}" style="color: #3b82f6;">${commissionUrl}</a>
          </p>
          
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

    let emailResponse: unknown = null;
    if (recipientEmails.length > 0) {
      emailResponse = await resend.emails.send({
        from: "TSM Hub <notifications@tsmroofpro.com>",
        reply_to: replyToEmail,
        to: recipientEmails,
        subject,
        text: plainText,
        html: emailHtml,
      });
      console.log("Commission notification sent successfully:", emailResponse);
    }

    // REP TRIGGER 1: Commission successfully submitted — rep gets confirmation email (separate from compliance email)
    if (payload.notification_type === "submitted" && payload.submitter_email) {
      const repConfirmSubject = "Commission successfully submitted";
      const repConfirmHtml = `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #059669; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Commission successfully submitted</h1>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px;">Your commission for <strong>${payload.job_name}</strong> has been submitted and is in the compliance review queue.</p>
            <p style="font-size: 14px; color: #6b7280;">You will be notified when it is rejected, approved by accounting, or marked as paid.</p>
            <p style="text-align: center; margin-top: 24px;"><a href="${commissionUrl}" style="display: inline-block; background: #111827; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Commission</a></p>
          </div>
        </body></html>`;
      await resend.emails.send({
        from: "TSM Hub <notifications@tsmroofpro.com>",
        reply_to: replyToEmail,
        to: [payload.submitter_email],
        subject: repConfirmSubject,
        text: `Your commission for ${payload.job_name} has been submitted and is in the compliance review queue. View: ${commissionUrl}`,
        html: repConfirmHtml,
      }).catch((e) => console.error("Rep confirmation email failed:", e));
    }

    // Create in-app notifications — check both commission_submissions and commission_documents tables
    let submittedBy: string | null = null;
    let salesRepName: string | null = null;
    let isManagerSubmission = false;
    let managerId: string | null = null;

    // Try commission_submissions first
    const { data: commission } = await supabaseClient
      .from("commission_submissions")
      .select("submitted_by, sales_rep_name, is_manager_submission")
      .eq("id", payload.commission_id)
      .single();

    if (commission) {
      submittedBy = commission.submitted_by;
      salesRepName = commission.sales_rep_name;
      isManagerSubmission = commission.is_manager_submission;
    } else {
      // Fallback to commission_documents table
      const { data: commDoc } = await supabaseClient
        .from("commission_documents")
        .select("created_by, sales_rep, manager_id")
        .eq("id", payload.commission_id)
        .single();

      if (commDoc) {
        submittedBy = commDoc.created_by;
        salesRepName = commDoc.sales_rep;
        managerId = commDoc.manager_id;
      }
    }

    if (submittedBy || managerId) {
      // SUBMITTED: Compliance (Manny + Sheldon) get in-app "New commission submitted by [Rep Name]"; Rep gets confirmation
      if (payload.notification_type === "submitted") {
        const complianceTitle = `New commission submitted by ${payload.submitter_name || salesRepName || "Rep"}`;
        const complianceMessage = `New commission submitted by ${payload.submitter_name || salesRepName || "Rep"} — ${payload.job_name}.`;
        // Notify compliance officers (commission_reviewers table + admins for compliance role)
        const { data: reviewers } = await supabaseClient
          .from("commission_reviewers")
          .select("user_email")
          .eq("is_active", true);
        if (reviewers) {
          for (const reviewer of reviewers) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("id")
              .eq("email", reviewer.user_email)
              .single();
            if (profile?.id) {
              await createInAppNotification(
                supabaseClient,
                profile.id,
                "commission_submitted",
                complianceTitle,
                complianceMessage,
                "commission_submission",
                payload.commission_id
              );
            }
          }
        }
        const { data: adminUsers } = await supabaseClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (adminUsers) {
          for (const au of adminUsers) {
            await createInAppNotification(
              supabaseClient,
              au.user_id,
              "commission_submitted",
              complianceTitle,
              complianceMessage,
              "commission_submission",
              payload.commission_id
            );
          }
        }
        // Rep: in-app confirmation (TRIGGER 1)
        if (submittedBy) {
          await createInAppNotification(
            supabaseClient,
            submittedBy,
            "commission_submitted",
            "Commission successfully submitted",
            `Your commission for ${payload.job_name} has been submitted and is in the compliance review queue.`,
            "commission_submission",
            payload.commission_id
          );
        }
      }

      // For rejected_commission_revised — notify compliance officers (same recipients as new submission, different copy)
      if (payload.notification_type === "rejected_commission_revised") {
        const { data: reviewers } = await supabaseClient
          .from("commission_reviewers")
          .select("user_email")
          .eq("is_active", true);
        const title = `Rejected Commission Revised by ${payload.submitter_name || salesRepName || "Rep"}`;
        const message = `A previously rejected commission for ${payload.job_name} has been revised and resubmitted. It is back in the compliance review queue.`;
        if (reviewers) {
          for (const reviewer of reviewers) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("id")
              .eq("email", reviewer.user_email)
              .single();
            if (profile?.id) {
              await createInAppNotification(
                supabaseClient,
                profile.id,
                "rejected_commission_revised",
                title,
                message,
                "commission_submission",
                payload.commission_id
              );
            }
          }
        }
        // Also notify admins
        const { data: adminUsers } = await supabaseClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (adminUsers) {
          for (const au of adminUsers) {
            await createInAppNotification(
              supabaseClient,
              au.user_id,
              "rejected_commission_revised",
              title,
              message,
              "commission_submission",
              payload.commission_id
            );
          }
        }
      }

      // MANAGER_APPROVED (compliance approved): Accounting (Courtney) only — "Commission ready for accounting review — [Rep Name] [Job]"
      if (payload.notification_type === "manager_approved") {
        const accountingTitle = `Commission ready for accounting review — ${payload.submitter_name || salesRepName || "Rep"} ${payload.job_name}`;
        const accountingMessage = `Commission ready for accounting review — ${payload.submitter_name || salesRepName || "Rep"} — ${payload.job_name}.`;
        const { data: accountingUsers } = await supabaseClient
          .from("commission_reviewers")
          .select("user_email")
          .eq("is_active", true);
        if (accountingUsers) {
          for (const reviewer of accountingUsers) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("id")
              .eq("email", reviewer.user_email)
              .single();
            if (profile?.id) {
              await createInAppNotification(
                supabaseClient,
                profile.id,
                "commission_approved_for_accounting",
                accountingTitle,
                accountingMessage,
                "commission_submission",
                payload.commission_id
              );
            }
          }
        }
      }

      // REP: rejected (TRIGGER 2), accounting_approved (TRIGGER 3), paid (TRIGGER 4), denied — no notification at compliance approval
      if (["rejected", "accounting_approved", "paid", "denied"].includes(payload.notification_type)) {
        if (submittedBy) {
          const notificationTitle =
            payload.notification_type === "rejected" ? `⚠️ Commission Rejected: ${payload.job_name}` :
            payload.notification_type === "accounting_approved" ? `🎉 Commission Approved: ${payload.job_name}` :
            payload.notification_type === "paid" ? `💰 Commission Paid: ${payload.job_name}` :
            `🚫 Commission Denied: ${payload.job_name}`;

          const notificationMessage =
            payload.notification_type === "rejected" ? (payload.notes || "Your commission has been rejected. Please resubmit with the requested changes.") :
            payload.notification_type === "accounting_approved" ? `Your commission has been approved! Payment scheduled for ${formatPayDateFn(payload.scheduled_pay_date)}.` :
            payload.notification_type === "paid" ? `Your commission of ${formatCurrency(payload.net_commission_owed)} has been paid!` :
            (payload.notes || "Your commission has been denied.");

          await createInAppNotification(
            supabaseClient,
            submittedBy,
            payload.notification_type,
            notificationTitle,
            notificationMessage,
            "commission_submission",
            payload.commission_id
          );
        }
      }
    }

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