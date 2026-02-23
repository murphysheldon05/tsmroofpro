import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Loader2, 
  ArrowRight,
  User,
  UserCheck,
  Building2,
  FileText
} from "lucide-react";

type NotificationType = "manager_review" | "accounting_review" | "approved" | "rejected";

interface EmailLog {
  type: NotificationType;
  recipients: string[];
  timestamp: Date;
  success: boolean;
  error?: string;
}

export function CommissionWorkflowTester() {
  const [testTitle, setTestTitle] = useState("Test Commission - January 2026");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [selectedNotificationType, setSelectedNotificationType] = useState<NotificationType>("manager_review");
  const [isSending, setIsSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Fetch users for quick selection
  const { data: users } = useQuery({
    queryKey: ["admin-users-for-test"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch managers
  const { data: managers } = useQuery({
    queryKey: ["managers-for-test"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["manager", "admin"]);
      
      if (rolesError) throw rolesError;
      
      const managerIds = roles.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", managerIds)
        .order("full_name");
      
      if (profilesError) throw profilesError;
      return profiles;
    },
  });

  // Fetch accounting recipients
  const { data: accountingRecipients } = useQuery({
    queryKey: ["accounting-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("notification_type", "commission_accounting")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const handleUserSelect = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    if (user) {
      setSubmitterName(user.full_name || "");
      setSubmitterEmail(user.email || "");
    }
  };

  const handleManagerSelect = (managerId: string) => {
    const manager = managers?.find(m => m.id === managerId);
    if (manager) {
      setManagerName(manager.full_name || "");
      setManagerEmail(manager.email || "");
    }
  };

  const sendTestNotification = async () => {
    if (!submitterEmail || !submitterName) {
      toast.error("Please enter submitter information");
      return;
    }

    if (selectedNotificationType === "manager_review" && (!managerEmail || !managerName)) {
      toast.error("Please enter manager information for manager review notification");
      return;
    }

    setIsSending(true);

    try {
      const payload: any = {
        notification_type: selectedNotificationType,
        request_id: `test-${Date.now()}`,
        title: testTitle,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        has_attachment: false,
      };

      if (selectedNotificationType === "manager_review" || selectedNotificationType === "accounting_review") {
        payload.manager_name = managerName;
        payload.manager_email = managerEmail;
      }

      if (managerNotes) {
        payload.manager_notes = managerNotes;
      }

      const { data, error } = await supabase.functions.invoke("send-commission-notification", {
        body: payload,
      });

      if (error) throw error;

      const newLog: EmailLog = {
        type: selectedNotificationType,
        recipients: data.emails_sent || [],
        timestamp: new Date(),
        success: data.success,
      };

      setEmailLogs(prev => [newLog, ...prev]);
      toast.success(`Test email sent to ${data.emails_sent?.join(", ")}`);
    } catch (error: any) {
      const newLog: EmailLog = {
        type: selectedNotificationType,
        recipients: [],
        timestamp: new Date(),
        success: false,
        error: error.message,
      };
      setEmailLogs(prev => [newLog, ...prev]);
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const runFullWorkflow = async () => {
    if (!submitterEmail || !submitterName || !managerEmail || !managerName) {
      toast.error("Please fill in all submitter and manager fields for the full workflow test");
      return;
    }

    setIsSending(true);

    const steps: { type: NotificationType; delay: number }[] = [
      { type: "manager_review", delay: 0 },
      { type: "accounting_review", delay: 2000 },
      { type: "approved", delay: 4000 },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      
      try {
        const payload: any = {
          notification_type: step.type,
          request_id: `test-workflow-${Date.now()}`,
          title: testTitle,
          submitter_name: submitterName,
          submitter_email: submitterEmail,
          manager_name: managerName,
          manager_email: managerEmail,
          manager_notes: managerNotes || "Test workflow approval",
          has_attachment: false,
        };

        const { data, error } = await supabase.functions.invoke("send-commission-notification", {
          body: payload,
        });

        if (error) throw error;

        const newLog: EmailLog = {
          type: step.type,
          recipients: data.emails_sent || [],
          timestamp: new Date(),
          success: data.success,
        };

        setEmailLogs(prev => [newLog, ...prev]);
        toast.success(`Step ${step.type}: Sent to ${data.emails_sent?.join(", ")}`);
      } catch (error: any) {
        const newLog: EmailLog = {
          type: step.type,
          recipients: [],
          timestamp: new Date(),
          success: false,
          error: error.message,
        };
        setEmailLogs(prev => [newLog, ...prev]);
        toast.error(`Step ${step.type} failed: ${error.message}`);
      }
    }

    setIsSending(false);
    toast.success("Full workflow test completed!");
  };

  const getNotificationDescription = (type: NotificationType) => {
    switch (type) {
      case "manager_review":
        return "Employee submits commission → Manager receives review request + Submitter gets confirmation";
      case "accounting_review":
        return "Manager approves → Accounting receives processing request + Submitter gets update";
      case "approved":
        return "Accounting approves → Submitter gets final approval notification";
      case "rejected":
        return "Manager or Accounting rejects → Submitter gets rejection notification";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Commission Test Setup
            </CardTitle>
            <CardDescription>
              Configure test parameters for the commission workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Commission Title</Label>
              <Input
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Test Commission Form"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Submitter (Employee)
              </Label>
              <Select onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select from users..." />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Name"
                />
                <Input
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Manager
              </Label>
              <Select onValueChange={handleManagerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select from managers..." />
                </SelectTrigger>
                <SelectContent>
                  {managers?.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Name"
                />
                <Input
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Manager Notes (optional)</Label>
              <Textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Approval notes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Test Notification
            </CardTitle>
            <CardDescription>
              Test individual notification stages or run the full workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select
                value={selectedNotificationType}
                onValueChange={(v: NotificationType) => setSelectedNotificationType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager_review">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Step 1</Badge>
                      Compliance Review
                    </div>
                  </SelectItem>
                  <SelectItem value="accounting_review">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Step 2</Badge>
                      Accounting Review
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">Step 3</Badge>
                      Final Approval
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-500/10 text-red-500">Alt</Badge>
                      Rejection
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getNotificationDescription(selectedNotificationType)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="neon"
                onClick={sendTestNotification}
                disabled={isSending}
                className="flex-1"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Send Test Email
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={runFullWorkflow}
              disabled={isSending}
              className="w-full"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Run Full Workflow (3 Steps)
                </>
              )}
            </Button>

            {/* Accounting Recipients Info */}
            <Alert>
              <Building2 className="w-4 h-4" />
              <AlertDescription>
                <strong>Accounting Recipients:</strong>{" "}
                {accountingRecipients?.length ? (
                  accountingRecipients.map(r => r.recipient_email).join(", ")
                ) : (
                  <span className="text-amber-500">None configured</span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="flex flex-col items-center gap-1 min-w-[120px]">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Employee Submits</span>
              <Badge variant="outline" className="text-xs">Step 1</Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 min-w-[120px]">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Compliance Reviews</span>
              <Badge variant="outline" className="text-xs">Step 2</Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 min-w-[120px]">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-sm font-medium">Accounting Reviews</span>
              <Badge variant="outline" className="text-xs">Step 3</Badge>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 min-w-[120px]">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-sm font-medium">Approved</span>
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500">Complete</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs */}
      {emailLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Log ({emailLogs.length})
            </CardTitle>
            <CardDescription>
              Recent test emails sent from this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emailLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    log.success 
                      ? "bg-green-500/5 border-green-500/20" 
                      : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {log.type.replace("_", " ")}
                        </Badge>
                        <span className="text-sm">
                          {log.recipients.length > 0 
                            ? `→ ${log.recipients.join(", ")}` 
                            : log.error || "Failed"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEmailLogs([])}
              className="mt-3"
            >
              Clear Log
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
