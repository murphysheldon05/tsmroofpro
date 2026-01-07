import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Eye, EyeOff, Send } from "lucide-react";
import { useEmailTemplate, useUpdateEmailTemplate, useSendTestEmail } from "@/hooks/useEmailTemplates";

export function EmailTemplateEditor() {
  const { data: template, isLoading } = useEmailTemplate("user_invite");
  const updateTemplate = useUpdateEmailTemplate();
  const sendTestEmail = useSendTestEmail();
  const [showPreview, setShowPreview] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [formData, setFormData] = useState({
    subject: "",
    heading: "",
    intro_text: "",
    button_text: "",
    footer_text: "",
  });

  useEffect(() => {
    if (template) {
      setFormData({
        subject: template.subject,
        heading: template.heading,
        intro_text: template.intro_text,
        button_text: template.button_text,
        footer_text: template.footer_text || "",
      });
    }
  }, [template]);

  const handleSave = () => {
    updateTemplate.mutate({
      templateKey: "user_invite",
      updates: {
        subject: formData.subject,
        heading: formData.heading,
        intro_text: formData.intro_text,
        button_text: formData.button_text,
        footer_text: formData.footer_text || null,
      },
    });
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return;
    
    sendTestEmail.mutate(
      {
        recipientEmail: inviteEmail.trim(),
        templateKey: "user_invite",
      },
      {
        onSuccess: () => {
          setInviteEmail("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Invite Card */}
      <Card>
        <CardHeader>
          <CardTitle>Send Hub Invite</CardTitle>
          <CardDescription>
            Send an invitation email for someone to create their own account on the hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendInvite();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSendInvite}
              disabled={!inviteEmail.trim() || sendTestEmail.isPending}
            >
              {sendTestEmail.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Editor Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Invite Email Template</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Preview
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Customize the invitation email sent to new users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="You're invited to TSM Roofing Hub"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heading">Email Heading</Label>
            <Input
              id="heading"
              value={formData.heading}
              onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
              placeholder="Welcome to TSM Roofing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intro_text">Introduction Text</Label>
            <Textarea
              id="intro_text"
              value={formData.intro_text}
              onChange={(e) => setFormData({ ...formData, intro_text: e.target.value })}
              placeholder="You've been invited to join the TSM Roofing Employee Hub..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="button_text">Button Text</Label>
            <Input
              id="button_text"
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              placeholder="Create My Account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text</Label>
            <Textarea
              id="footer_text"
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="If you have any questions..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={updateTemplate.isPending}
            className="w-full"
          >
            {updateTemplate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
            <CardDescription>
              This is how the invitation email will appear to recipients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "30px", textAlign: "center" }}>
                  <h1 style={{ color: "white", margin: 0, fontSize: "24px" }}>{formData.heading || "Welcome"}</h1>
                </div>
                
                <div style={{ background: "#f8fafc", padding: "30px", border: "1px solid #e2e8f0", borderTop: "none" }}>
                  <p style={{ fontSize: "16px", marginBottom: "20px" }}>
                    {formData.intro_text || "You've been invited to join the hub."}
                  </p>
                  
                  <div style={{ background: "#e0f2fe", border: "1px solid #0ea5e9", borderRadius: "8px", padding: "15px", margin: "20px 0" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#0369a1" }}>
                      <strong>📧 Your Email:</strong> recipient@example.com
                    </p>
                  </div>
                  
                  <div style={{ textAlign: "center", margin: "30px 0" }}>
                    <span style={{ display: "inline-block", background: "#2563eb", color: "white", padding: "14px 30px", borderRadius: "8px", fontWeight: 600, fontSize: "16px" }}>
                      {formData.button_text || "Create My Account"}
                    </span>
                  </div>
                  
                  {formData.footer_text && (
                    <p style={{ fontSize: "14px", color: "#64748b", marginTop: "30px" }}>
                      {formData.footer_text}
                    </p>
                  )}
                </div>
                
                <div style={{ background: "#1e3a5f", padding: "20px", textAlign: "center" }}>
                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
                    © 2026 TSM Roofing. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
