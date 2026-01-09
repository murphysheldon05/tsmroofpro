import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CredentialInfo {
  accessType: string;
  email: string | null;
  password: string | null;
  inviteSent: boolean;
  notes: string | null;
}

interface SendCredentialsRequest {
  newHireId: string;
  newHireName: string;
  submitterId: string;
  credentials: CredentialInfo[];
  generalNotes?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY secret");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { newHireId, newHireName, submitterId, credentials, generalNotes }: SendCredentialsRequest = await req.json();

    console.log("Sending credentials for new hire:", newHireName, "to submitter:", submitterId);

    // Get submitter's profile info
    const { data: submitterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", submitterId)
      .single();

    if (profileError || !submitterProfile?.email) {
      console.error("Error fetching submitter profile:", profileError);
      throw new Error("Could not find submitter's email address");
    }

    console.log("Sending to:", submitterProfile.email);

    // Build credentials HTML
    const credentialsHtml = credentials.map(cred => {
      let statusHtml = "";
      
      if (cred.inviteSent) {
        statusHtml = `<p style="color: #059669; font-weight: 600;">✓ Invite sent to tsmroofs.com email</p>`;
      }
      
      if (cred.email || cred.password) {
        statusHtml += `
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            ${cred.email ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 80px;">Email:</td>
                <td style="padding: 4px 0; color: #1e293b; font-family: monospace;">${cred.email}</td>
              </tr>
            ` : ''}
            ${cred.password ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Password:</td>
                <td style="padding: 4px 0; color: #1e293b; font-family: monospace;">${cred.password}</td>
              </tr>
            ` : ''}
          </table>
        `;
      }

      if (cred.notes) {
        statusHtml += `<p style="color: #64748b; font-size: 13px; margin-top: 8px; font-style: italic;">Note: ${cred.notes}</p>`;
      }

      return `
        <div style="background: white; border-radius: 8px; padding: 16px; margin: 12px 0; border-left: 4px solid #3b82f6;">
          <h4 style="margin: 0 0 8px 0; color: #1e40af;">${cred.accessType}</h4>
          ${statusHtml || '<p style="color: #94a3b8;">No credentials provided yet</p>'}
        </div>
      `;
    }).join("");

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://app.example.com";

    const emailPayload = {
      from: "TSM Roofing <notifications@hub.tsmroofs.com>",
      to: [submitterProfile.email],
      subject: `Access Credentials Ready: ${newHireName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Access Credentials Ready</h1>
          </div>
          <div style="padding: 30px; background: #f8fafc;">
            <p style="font-size: 16px; color: #334155;">Hi ${submitterProfile.full_name || 'there'},</p>
            <p style="font-size: 16px; color: #334155;">The access credentials for <strong>${newHireName}</strong> have been set up and are ready for use.</p>
            
            <div style="margin: 24px 0;">
              <h3 style="color: #1e40af; margin-bottom: 16px;">Access Details</h3>
              ${credentialsHtml}
            </div>

            ${generalNotes ? `
            <div style="background: #e0f2fe; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #0369a1;">Additional Notes</h4>
              <p style="margin: 0; color: #0c4a6e; font-size: 14px;">${generalNotes}</p>
            </div>
            ` : ''}

            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> Please share these credentials securely with the new hire and advise them to change their passwords upon first login.
              </p>
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

    console.log("Credentials email sent successfully:", resText);

    return new Response(
      JSON.stringify({ success: true, sentTo: submitterProfile.email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-credentials-to-submitter function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
