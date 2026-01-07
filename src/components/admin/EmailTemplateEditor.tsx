import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Eye, EyeOff, Send, Mail, UserCheck } from "lucide-react";
import { useEmailTemplate, useUpdateEmailTemplate, useSendTestEmail } from "@/hooks/useEmailTemplates";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EmailTemplateEditor() {
  const { user } = useAuth();
  const { data: template, isLoading } = useEmailTemplate("user_invite");
  const updateTemplate = useUpdateEmailTemplate();
  const sendTestEmail = useSendTestEmail();
  const [showPreview, setShowPreview] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingToSelf, setIsSendingToSelf] = useState(false);

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

  const handleSendTestEmail = () => {
    if (!testEmailAddress.trim()) return;
    
    sendTestEmail.mutate(
      {
        recipientEmail: testEmailAddress.trim(),
        templateKey: "user_invite",
      },
      {
        onSuccess: () => {
          setTestEmailDialogOpen(false);
          setTestEmailAddress("");
        },
      }
    );
  };

  const handleSendTestToSelf = () => {
    if (!user?.email) return;
    
    setIsSendingToSelf(true);
    sendTestEmail.mutate(
      {
        recipientEmail: user.email,
        templateKey: "user_invite",
      },
      {
        onSettled: () => {
          setIsSendingToSelf(false);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>User Invite Email Template</span>
            <div className="flex items-center gap-2">
              {user?.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestToSelf}
                  disabled={isSendingToSelf}
                >
                  {isSendingToSelf ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Send Me a Test
                    </>
                  )}
                </Button>
              )}
              <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Send Test Email
                    </DialogTitle>
                    <DialogDescription>
                      Send a preview of the current email template to yourself. The email will contain sample data to show how it will look.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-email">Your Email Address</Label>
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSendTestEmail();
                          }
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Note: Make sure to save your template changes before sending a test email to see the latest version.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTestEmailDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={!testEmailAddress.trim() || sendTestEmail.isPending}
                    >
                      {sendTestEmail.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
            </div>
          </CardTitle>
          <CardDescription>
            Customize the email sent to new users when they are invited to the portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Welcome to TSM Roofing Portal - Your Account Details"
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
              placeholder="Your account has been created..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="button_text">Login Button Text</Label>
            <Input
              id="button_text"
              value={formData.button_text}
              onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              placeholder="Login to Portal"
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
              This is how the email will appear to users. Credentials and role will be dynamically filled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              {/* Email Preview */}
              <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "30px", textAlign: "center" }}>
                  <h1 style={{ color: "white", margin: 0, fontSize: "24px" }}>{formData.heading || "Welcome"}</h1>
                </div>
                
                <div style={{ background: "#f8fafc", padding: "30px", border: "1px solid #e2e8f0", borderTop: "none" }}>
                  <p style={{ fontSize: "16px", marginBottom: "20px" }}>Hello <strong>John Doe</strong>,</p>
                  
                  <p style={{ fontSize: "16px", marginBottom: "20px" }}>
                    {formData.intro_text || "Your account has been created."}
                  </p>
                  
                  <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px", margin: "20px 0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: "8px 0", color: "#64748b", fontSize: "14px" }}>Email:</td>
                          <td style={{ padding: "8px 0", fontWeight: 600, fontSize: "14px" }}>john.doe@example.com</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "8px 0", color: "#64748b", fontSize: "14px" }}>Temporary Password:</td>
                          <td style={{ padding: "8px 0", fontWeight: 600, fontSize: "14px", fontFamily: "monospace", background: "#fef3c7", borderRadius: "4px" }}>••••••••</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "8px 0", color: "#64748b", fontSize: "14px" }}>Role:</td>
                          <td style={{ padding: "8px 0", fontWeight: 600, fontSize: "14px" }}>Employee</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "8px", padding: "15px", margin: "20px 0" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#92400e" }}>
                      <strong>⚠️ Important:</strong> For security, you will be prompted to change your password on your first login.
                    </p>
                  </div>
                  
                  <div style={{ textAlign: "center", margin: "30px 0" }}>
                    <span style={{ display: "inline-block", background: "#2563eb", color: "white", padding: "14px 30px", borderRadius: "8px", fontWeight: 600, fontSize: "16px" }}>
                      {formData.button_text || "Login to Portal"}
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
