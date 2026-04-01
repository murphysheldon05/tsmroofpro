import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDisplayName } from "@/lib/displayName";

interface WorkflowAssignment {
  role_key: string;
  assigned_user_id: string | null;
}

export function WorkflowRoleAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [complianceReviewer, setComplianceReviewer] = useState<string>("none");
  const [accountingReviewer, setAccountingReviewer] = useState<string>("none");

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["workflow-role-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_role_assignments" as any)
        .select("role_key, assigned_user_id");
      if (error) throw error;
      return (data as unknown) as WorkflowAssignment[];
    },
  });

  const { data: adminUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-for-workflow"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminIds = (roles || []).map((r) => r.user_id);
      if (adminIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", adminIds)
        .eq("employee_status", "active");

      return (profiles || []).map((p) => ({
        id: p.id,
        name: formatDisplayName(p.full_name, p.email) || p.email || "Unknown",
      }));
    },
  });

  useEffect(() => {
    if (assignments) {
      const compliance = assignments.find((a) => a.role_key === "compliance_reviewer");
      const accounting = assignments.find((a) => a.role_key === "accounting_reviewer");
      setComplianceReviewer(compliance?.assigned_user_id || "none");
      setAccountingReviewer(accounting?.assigned_user_id || "none");
    }
  }, [assignments]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        {
          role_key: "compliance_reviewer",
          assigned_user_id: complianceReviewer === "none" ? null : complianceReviewer,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        {
          role_key: "accounting_reviewer",
          assigned_user_id: accountingReviewer === "none" ? null : accountingReviewer,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("workflow_role_assignments" as any)
          .update({
            assigned_user_id: update.assigned_user_id,
            updated_by: update.updated_by,
            updated_at: update.updated_at,
          })
          .eq("role_key", update.role_key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-role-assignments"] });
      toast.success("Workflow assignments saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const isLoading = assignmentsLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div>
            <CardTitle>Workflow Role Assignments</CardTitle>
            <CardDescription>
              Assign admin users to review commission submissions at each workflow step.
              Notification emails are sent to the assigned reviewer.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Compliance Reviewer</Label>
          <p className="text-xs text-muted-foreground">
            Receives email when a new commission is submitted. Reviews for compliance.
          </p>
          <Select value={complianceReviewer} onValueChange={setComplianceReviewer}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select reviewer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not assigned</SelectItem>
              {adminUsers?.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Accounting Reviewer</Label>
          <p className="text-xs text-muted-foreground">
            Receives email after compliance approval. Reviews for payment processing.
          </p>
          <Select value={accountingReviewer} onValueChange={setAccountingReviewer}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select reviewer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not assigned</SelectItem>
              {adminUsers?.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Assignments
        </Button>
      </CardContent>
    </Card>
  );
}
