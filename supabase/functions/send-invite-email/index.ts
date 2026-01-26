import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  inviter_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviter_name }: InviteRequest = await req.json();

    console.log("Sending invite to:", email);

    // HARD LOCK: Always use tsmroofpro.com for ALL auth emails
    // Never use lovable.dev, lovable.app, or any other domain
    // The app route is /auth - user will create their own account
    const signupUrl = "https://tsmroofpro.com/auth";

    // Plain text version for deliverability
    const plainText = `You're Invited to Join TSM Hub

Hello!

${inviter_name ? `${inviter_name} has invited you` : "You've been invited"} to join TSM Hub, the central platform for TSM Roofing LLC.

Getting Started:
1. Click the link below to create your account
2. Fill out the signup form with your information
3. Wait for an admin to approve your account
4. Once approved, you'll receive an email to log in!

Create your account: ${signupUrl}

If you have any questions, please reach out to your manager or administrator.

© ${new Date().getFullYear()} TSM Roofing. All rights reserved.`;

    const emailResponse = await resend.emails.send({
      from: "TSM Hub <notifications@tsmroofpro.com>",
      reply_to: "sheldonmurphy@tsmroofs.com",
      to: [email],
      subject: "You're Invited to Join TSM Hub",
      text: plainText,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited! 🎉</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hello!
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${inviter_name ? `${inviter_name} has invited you` : "You've been invited"} to join TSM Hub, the central platform for TSM Roofing LLC.
            </p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px 0;">Getting Started:</p>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
                <li>Click the button below to create your account</li>
                <li>Fill out the signup form with your information</li>
                <li>Wait for an admin to approve your account</li>
                <li>Once approved, you'll receive an email to log in!</li>
              </ol>
            </div>
            
            <!-- Outlook-compatible table-based button -->
            <div style="text-align: center; margin: 30px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background-color: #111827; border: 2px solid #111827; border-radius: 8px;">
                    <a href="${signupUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">
                      Create My Account
                    </a>
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              Or copy this link: <a href="${signupUrl}" style="color: #3b82f6;">${signupUrl}</a>
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

    console.log("Invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invite email:", error);
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
