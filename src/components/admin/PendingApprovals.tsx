import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Loader2, UserPlus, Clock, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PendingUser {
  id: string;
  email: string | null;
  full_name: string | null;
  requested_role: string | null;
  company_name: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  office_admin: "Office Admin",
  va: "VA",
  sales: "Sales",
  production: "Production",
  subcontractor: "Subcontractor",
  vendor: "Vendor",
};

const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
] as const;

export function PendingApprovals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; user: PendingUser | null }>({ open: false, user: null });
  const [customMessage, setCustomMessage] = useState("");

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, requested_role, company_name, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingUser[];
    },
    refetchInterval: 30000,
  });

  const getDefaultRole = (requestedRole: string | null): string => {
    if (!requestedRole) return "employee";
    // Map requested roles to system roles
    if (requestedRole === "admin") return "admin";
    if (["office_admin", "va"].includes(requestedRole)) return "manager";
    return "employee";
  };

  const openApprovalDialog = (pendingUser: PendingUser) => {
    setApprovalDialog({ open: true, user: pendingUser });
    setCustomMessage("");
  };

  const handleApprove = async () => {
    const pendingUser = approvalDialog.user;
    if (!pendingUser) return;
    
    const assignedRole = selectedRoles[pendingUser.id] || getDefaultRole(pendingUser.requested_role);
    
    setApprovingId(pendingUser.id);
    try {
      // Update profile to approved
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", pendingUser.id);

      if (profileError) throw profileError;

      // Update user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: assignedRole as "admin" | "manager" | "employee" })
        .eq("user_id", pendingUser.id);

      if (roleError) throw roleError;

      // Send approval notification email
      if (pendingUser.email) {
        try {
          await supabase.functions.invoke("send-approval-notification", {
            body: {
              user_email: pendingUser.email,
              user_name: pendingUser.full_name || "",
              custom_message: customMessage.trim() || undefined,
            },
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
        }
      }

      toast.success(`User approved as ${assignedRole}!`);
      setApprovalDialog({ open: false, user: null });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error("Failed to approve user: " + error.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reject and delete ${userName || "this user"}? This cannot be undone.`)) {
      return;
    }

    setRejectingId(userId);
    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });

      if (error) throw error;

      toast.success("User rejected and removed");
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error("Failed to reject user: " + error.message);
    } finally {
      setRejectingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserPlus className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p>No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
          <Clock className="w-3 h-3" />
          {pendingUsers.length} Pending
        </Badge>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                User
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                Requested Role
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                Signed Up
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Assign Role
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map((pendingUser, index) => (
              <tr
                key={pendingUser.id}
                className={index < pendingUsers.length - 1 ? "border-b border-border/30" : ""}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {pendingUser.full_name || "—"}
                    </p>
                    {pendingUser.company_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {pendingUser.company_name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                  {pendingUser.email}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {pendingUser.requested_role ? (
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[pendingUser.requested_role] || pendingUser.requested_role}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-sm">
                  {new Date(pendingUser.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={selectedRoles[pendingUser.id] || getDefaultRole(pendingUser.requested_role)}
                    onValueChange={(value) => 
                      setSelectedRoles(prev => ({ ...prev, [pendingUser.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => openApprovalDialog(pendingUser)}
                      disabled={approvingId !== null || rejectingId === pendingUser.id}
                    >
                      {approvingId === pendingUser.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleReject(pendingUser.id, pendingUser.full_name || pendingUser.email || "")}
                      disabled={approvingId === pendingUser.id || rejectingId === pendingUser.id}
                    >
                      {rejectingId === pendingUser.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ open, user: open ? approvalDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Approve {approvalDialog.user?.full_name || approvalDialog.user?.email} for access to TSM Hub.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assigned Role</Label>
              <Select
                value={approvalDialog.user ? (selectedRoles[approvalDialog.user.id] || getDefaultRole(approvalDialog.user.requested_role)) : "employee"}
                onValueChange={(value) => {
                  if (approvalDialog.user) {
                    setSelectedRoles(prev => ({ ...prev, [approvalDialog.user!.id]: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customMessage">Welcome Message (Optional)</Label>
              <Textarea
                id="customMessage"
                placeholder="Add a personal message to include in the approval email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the approval notification email.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approvingId !== null}
              className="gap-1"
            >
              {approvingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
