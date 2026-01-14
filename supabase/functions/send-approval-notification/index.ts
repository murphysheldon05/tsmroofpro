import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  user_email: string;
  user_name: string;
  custom_message?: string;
  assigned_role?: string;
  assigned_department?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Team Member",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_email, user_name, custom_message, assigned_role, assigned_department }: ApprovalNotificationRequest = await req.json();

    console.log("Sending approval notification to:", user_email, "role:", assigned_role, "dept:", assigned_department);

    const appUrl = Deno.env.get("APP_BASE_URL") || "https://hub.tsmroofs.com";
    const loginUrl = `${appUrl}/auth`;

    const roleDisplay = assigned_role ? ROLE_LABELS[assigned_role] || assigned_role : null;

    const emailResponse = await resend.emails.send({
      from: "TSM Hub <notifications@hub.tsmroofs.com>",
      to: [user_email],
      subject: "Your TSM Hub Account Has Been Approved!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Account Approved! 🎉</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi ${user_name || "there"},
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! Your TSM Hub account has been approved by an administrator. You now have full access to the platform.
            </p>
            
            ${(roleDisplay || assigned_department) ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Your Account Details:</p>
              <table style="width: 100%; border-collapse: collapse;">
                ${roleDisplay ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Role:</td>
                  <td style="padding: 4px 0; font-weight: 600; font-size: 14px;">${roleDisplay}</td>
                </tr>
                ` : ''}
                ${assigned_department ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Department:</td>
                  <td style="padding: 4px 0; font-weight: 600; font-size: 14px;">${assigned_department}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            ` : ''}
            
            ${custom_message ? `
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Message from the Admin:</p>
              <p style="font-size: 14px; color: #374151; margin: 0; white-space: pre-wrap;">${custom_message}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Log In to TSM Hub
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              Or copy this link: <a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you have any questions, please reach out to your manager or administrator.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} TSM Roofing. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Approval notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
