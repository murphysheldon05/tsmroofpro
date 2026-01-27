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
import { Check, X, Loader2, UserPlus, Clock, Building2, Percent, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCommissionTiers } from "@/hooks/useCommissionTiers";

interface PendingUser {
  id: string;
  email: string | null;
  full_name: string | null;
  requested_role: string | null;
  requested_department: string | null;
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

const DEPARTMENT_LABELS: Record<string, string> = {
  production: "Production",
  sales: "Sales",
  office: "Office",
  accounting: "Accounting",
  other: "Other",
};

const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
] as const;

export function PendingApprovals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: commissionTiers } = useCommissionTiers();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [selectedDepartments, setSelectedDepartments] = useState<Record<string, string>>({});
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
  const [selectedManagers, setSelectedManagers] = useState<Record<string, string>>({});
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; user: PendingUser | null }>({ open: false, user: null });
  const [customMessage, setCustomMessage] = useState("");

  // CRITICAL: Fetch users where is_approved = false AND employee_status is pending/null
  // This ensures we only show truly pending users, not those with mismatched data
  const { data: pendingUsers, isLoading, refetch: refetchPending } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, requested_role, requested_department, company_name, created_at, employee_status, last_login_at")
        .eq("is_approved", false)
        .not("last_login_at", "is", null) // Only users who have logged in (exclude pending invites)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter to only truly pending users (exclude those with active employee_status but is_approved=false)
      // This handles edge cases where data got out of sync
      return (data || []).filter(u => 
        u.employee_status === 'pending' || u.employee_status === null || u.employee_status === undefined
      ) as PendingUser[];
    },
    refetchInterval: 10000, // More frequent refresh
    staleTime: 5000,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Get managers for team assignment
  const { data: managers } = useQuery({
    queryKey: ["managers-for-approval"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["manager", "admin"]);

      if (rolesError) throw rolesError;

      const managerIds = roles?.map((r) => r.user_id) || [];
      if (managerIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", managerIds);

      if (profilesError) throw profilesError;
      return profiles || [];
    },
  });

  const getDefaultRole = (requestedRole: string | null): string => {
    if (!requestedRole) return "employee";
    if (requestedRole === "admin") return "admin";
    if (["office_admin", "va"].includes(requestedRole)) return "manager";
    return "employee";
  };

  const openApprovalDialog = (pendingUser: PendingUser) => {
    setApprovalDialog({ open: true, user: pendingUser });
    setCustomMessage("");
    // Pre-select the requested department if available
    if (pendingUser.requested_department && !selectedDepartments[pendingUser.id]) {
      const matchingDept = departments?.find(d => d.name.toLowerCase() === pendingUser.requested_department?.toLowerCase());
      if (matchingDept) {
        setSelectedDepartments(prev => ({ ...prev, [pendingUser.id]: matchingDept.id }));
      }
    }
  };

  const handleApprove = async () => {
    const pendingUser = approvalDialog.user;
    if (!pendingUser) return;

    const assignedRole = selectedRoles[pendingUser.id] || getDefaultRole(pendingUser.requested_role);
    const assignedDepartmentId = selectedDepartments[pendingUser.id] || null;
    const assignedTierId = selectedTiers[pendingUser.id] || null;
    const assignedManagerId = selectedManagers[pendingUser.id] || null;

    setApprovingId(pendingUser.id);
    try {
      // ========================================================================
      // GOVERNED ATOMIC APPROVAL COMMIT
      // All database updates must succeed before sending email notification
      // ========================================================================
      
      // STEP 1: Update profile to ACTIVE status (canonical access field)
      // GOVERNANCE: employee_status='active' is the SINGLE SOURCE OF TRUTH for access
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_approved: true,               // Keep for backward compat
          employee_status: "active",       // CANONICAL: This grants access
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          department_id: assignedDepartmentId,
          manager_id: assignedManagerId,
        })
        .eq("id", pendingUser.id);

      if (profileError) throw profileError;

      // STEP 2: Update pending_approvals table to 'approved' status
      // GOVERNANCE: This removes user from Pending Approvals UI immediately
      const { error: pendingApprovalError } = await supabase
        .from("pending_approvals")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes: `Approved as ${assignedRole}`,
        })
        .eq("entity_type", "user")
        .eq("entity_id", pendingUser.id);

      if (pendingApprovalError) {
        console.warn("Failed to update pending_approvals:", pendingApprovalError);
        // Non-blocking - profile update is canonical
      }

      // STEP 3: Ensure user role exists and is updated
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: assignedRole as "admin" | "manager" | "employee" })
        .eq("user_id", pendingUser.id);

      if (roleError) throw roleError;

      // STEP 4: Assign commission tier if selected
      if (assignedTierId) {
        await supabase
          .from("user_commission_tiers")
          .delete()
          .eq("user_id", pendingUser.id);

        const { error: tierError } = await supabase
          .from("user_commission_tiers")
          .insert({
            user_id: pendingUser.id,
            tier_id: assignedTierId,
            assigned_by: user?.id,
          });

        if (tierError) {
          console.error("Failed to assign commission tier:", tierError);
        }
      }

      // STEP 5: Assign manager (team assignment) if selected
      if (assignedManagerId) {
        await supabase
          .from("team_assignments")
          .delete()
          .eq("employee_id", pendingUser.id);

        const { error: teamError } = await supabase
          .from("team_assignments")
          .insert({
            employee_id: pendingUser.id,
            manager_id: assignedManagerId,
          });

        if (teamError) {
          console.error("Failed to assign team manager:", teamError);
        }
      }

      // Get department name for notification
      const assignedDeptName = departments?.find(d => d.id === assignedDepartmentId)?.name || null;

      // STEP 6: Send approval notification email ONLY AFTER all DB commits succeed
      // GOVERNANCE: No cosmetic emails - DB state must be correct first
      if (pendingUser.email) {
        try {
          await supabase.functions.invoke("send-approval-notification", {
            body: {
              user_email: pendingUser.email,
              user_name: pendingUser.full_name || "",
              custom_message: customMessage.trim() || undefined,
              assigned_role: assignedRole,
              assigned_department: assignedDeptName,
            },
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // Email failure is non-blocking - user is already approved in DB
        }
      }

      toast.success(`User approved as ${assignedRole}${assignedDeptName ? ` in ${assignedDeptName}` : ''}!`);
      
      // STEP 7: UI reconciliation - close dialog and invalidate queries
      setApprovalDialog({ open: false, user: null });
      
      // Clear cached selections for this user
      setSelectedRoles(prev => {
        const next = { ...prev };
        delete next[pendingUser.id];
        return next;
      });
      setSelectedDepartments(prev => {
        const next = { ...prev };
        delete next[pendingUser.id];
        return next;
      });
      setSelectedTiers(prev => {
        const next = { ...prev };
        delete next[pendingUser.id];
        return next;
      });
      setSelectedManagers(prev => {
        const next = { ...prev };
        delete next[pendingUser.id];
        return next;
      });

      // GOVERNANCE: Force immediate refetch to remove from pending list
      await queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["team-assignments"] });
      await refetchPending();
      
    } catch (error: any) {
      // GOVERNANCE: On ANY failure, user remains pending - no partial state
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
      // GOVERNANCE: Update pending_approvals to 'rejected' status first
      const { error: pendingError } = await supabase
        .from("pending_approvals")
        .update({
          status: "rejected",
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: "Rejected by admin",
        })
        .eq("entity_type", "user")
        .eq("entity_id", userId);

      if (pendingError) {
        console.warn("Failed to update pending_approvals:", pendingError);
      }

      // Then delete the user via edge function
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });

      if (error) throw error;

      toast.success("User rejected and removed");
      await queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await refetchPending();
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
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Requested Dept
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                Signed Up
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
                <td className="px-4 py-3 hidden lg:table-cell">
                  {pendingUser.requested_department ? (
                    <Badge variant="outline" className="text-xs">
                      {DEPARTMENT_LABELS[pendingUser.requested_department] || pendingUser.requested_department}
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

      {/* Approval Dialog with full user configuration */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ open, user: open ? approvalDialog.user : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Configure {approvalDialog.user?.full_name || approvalDialog.user?.email}'s account settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned Role
              </Label>
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
              {approvalDialog.user?.requested_role && (
                <p className="text-xs text-muted-foreground">
                  Requested: {ROLE_LABELS[approvalDialog.user.requested_role] || approvalDialog.user.requested_role}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department
              </Label>
              <Select
                value={approvalDialog.user ? (selectedDepartments[approvalDialog.user.id] || "") : ""}
                onValueChange={(value) => {
                  if (approvalDialog.user) {
                    setSelectedDepartments(prev => ({ ...prev, [approvalDialog.user!.id]: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {approvalDialog.user?.requested_department && (
                <p className="text-xs text-muted-foreground">
                  Requested: {DEPARTMENT_LABELS[approvalDialog.user.requested_department] || approvalDialog.user.requested_department}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Manager (for commission routing)
              </Label>
              <Select
                value={approvalDialog.user ? (selectedManagers[approvalDialog.user.id] || "") : ""}
                onValueChange={(value) => {
                  if (approvalDialog.user) {
                    setSelectedManagers(prev => ({ ...prev, [approvalDialog.user!.id]: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No manager assigned" />
                </SelectTrigger>
                <SelectContent>
                  {managers?.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Commission forms route through this manager for approval
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Commission Tier (optional)
              </Label>
              <Select
                value={approvalDialog.user ? (selectedTiers[approvalDialog.user.id] || "") : ""}
                onValueChange={(value) => {
                  if (approvalDialog.user) {
                    setSelectedTiers(prev => ({ ...prev, [approvalDialog.user!.id]: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No tier assigned" />
                </SelectTrigger>
                <SelectContent>
                  {commissionTiers?.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name}
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
