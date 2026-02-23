import { supabase } from "@/integrations/supabase/client";
import { CommissionSubmission } from "./useCommissions";

interface NotificationPayload {
  notification_type: "submitted" | "manager_approved" | "accounting_approved" | "paid" | "rejected" | "status_change";
  document_type?: 'commission_document' | 'commission_submission';
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
  scheduled_pay_date?: string;
}

export async function sendCommissionNotification(
  submission: CommissionSubmission,
  notificationType: NotificationPayload["notification_type"],
  additionalData?: {
    submitter_email?: string;
    submitter_name?: string;
    previous_status?: string;
    notes?: string;
    changed_by_name?: string;
  }
) {
  try {
    const payload: NotificationPayload = {
      notification_type: notificationType,
      document_type: 'commission_submission',
      commission_id: submission.id,
      job_name: submission.job_name,
      job_address: submission.job_address,
      sales_rep_name: submission.sales_rep_name,
      subcontractor_name: submission.subcontractor_name,
      submission_type: submission.submission_type,
      contract_amount: submission.contract_amount,
      net_commission_owed: submission.net_commission_owed,
      status: submission.status,
      ...additionalData,
    };

    const { data, error } = await supabase.functions.invoke("send-commission-notification", {
      body: payload,
    });

    if (error) {
      console.error("Failed to send commission notification:", error);
      return { success: false, error };
    }

    console.log("Commission notification sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending commission notification:", error);
    return { success: false, error };
  }
}

export async function getSubmitterInfo(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.error("Failed to get submitter info:", error);
      return null;
    }

    return {
      email: profile.email || "",
      name: profile.full_name || "",
    };
  } catch (error) {
    console.error("Error getting submitter info:", error);
    return null;
  }
}
