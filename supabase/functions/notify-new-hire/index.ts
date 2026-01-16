import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewHireNotificationRequest {
  newHireName: string;
  personalEmail: string;
  phoneNumber: string;
  requiredAccess: string[];
  submittedByName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { newHireName, personalEmail, phoneNumber, requiredAccess, submittedByName }: NewHireNotificationRequest = await req.json();

    console.log("Sending new hire notification for:", newHireName);

    // Get HR notification recipients from notification_settings
    const { data: recipients, error: recipientsError } = await supabase
      .from("notification_settings")
      .select("recipient_email, recipient_name")
      .eq("notification_type", "new_hire")
      .eq("is_active", true);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      console.log("No HR recipients configured for new hire notifications");
      return new Response(
        JSON.stringify({ message: "No recipients configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const accessList = requiredAccess.length > 0
      ? requiredAccess.map(a => `<li>${a}</li>`).join("")
      : "<li>No specific access requested</li>";

    // HARD LOCK: Always use tsm-roofing-hub.lovable.app for all portal links - never use any other domain
    const appBaseUrl = "https://tsm-roofing-hub.lovable.app";

    // Send email to all HR recipients
     for (const recipient of recipients) {
       if (!RESEND_API_KEY) {
         throw new Error("Missing RESEND_API_KEY secret");
       }

        const emailPayload = {
          from: "TSM Roofing <notifications@hub.tsmroofs.com>",
          to: [recipient.recipient_email],
         subject: `New Hire Alert: ${newHireName} - Action Required`,
         html: `
           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
             <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
               <h1 style="color: white; margin: 0;">New Hire Onboarding</h1>
             </div>
             <div style="padding: 30px; background: #f8fafc;">
               <p style="font-size: 16px; color: #334155;">Hi ${recipient.recipient_name || 'HR Team'},</p>
               <p style="font-size: 16px; color: #334155;">A new hire has been submitted and requires account setup.</p>
               
               <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                 <h3 style="margin-top: 0; color: #1e40af;">New Hire Details</h3>
                 <table style="width: 100%; border-collapse: collapse;">
                   <tr>
                     <td style="padding: 8px 0; color: #64748b; width: 140px;">Name:</td>
                     <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${newHireName}</td>
                   </tr>
                   <tr>
                     <td style="padding: 8px 0; color: #64748b;">Personal Email:</td>
                     <td style="padding: 8px 0; color: #1e293b;">${personalEmail}</td>
                   </tr>
                   <tr>
                     <td style="padding: 8px 0; color: #64748b;">Phone:</td>
                     <td style="padding: 8px 0; color: #1e293b;">${phoneNumber || 'Not provided'}</td>
                   </tr>
                   <tr>
                     <td style="padding: 8px 0; color: #64748b;">Submitted By:</td>
                     <td style="padding: 8px 0; color: #1e293b;">${submittedByName}</td>
                   </tr>
                 </table>
               </div>

               <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                 <h3 style="margin-top: 0; color: #1e40af;">Required Access</h3>
                 <ul style="color: #334155; margin: 0; padding-left: 20px;">
                   ${accessList}
                 </ul>
               </div>

               <div style="text-align: center; margin-top: 30px;">
                 <a href="${appBaseUrl}/training/new-hire" 
                    style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                   View in Portal
                 </a>
               </div>
             </div>
             <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
               <p>TSM Roofing Employee Portal</p>
             </div>
           </div>
         `,
       };

       const res = await fetch("https://api.resend.com/emails", {
         method: "POST",
         headers: {
           Authorization: `Bearer ${RESEND_API_KEY}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify(emailPayload),
       });

       const resText = await res.text();
       if (!res.ok) {
         console.error("Resend API error:", res.status, resText);
         throw new Error(`Resend API error ${res.status}: ${resText}`);
       }

       console.log("Email sent to:", recipient.recipient_email, resText);
     }

    return new Response(
      JSON.stringify({ success: true, recipientCount: recipients.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-new-hire function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
