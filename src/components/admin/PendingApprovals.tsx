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
import { formatDisplayName } from "@/lib/displayName";
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
  { value: "employee", label: "Employee", description: "Base access — view data, submit forms, access training" },
  { value: "sales_rep", label: "Sales Rep", description: "Submit commissions, request draws, sales leaderboard" },
  { value: "sales_manager", label: "Sales Manager", description: "Approve commissions, manage team, override on deals" },
  { value: "manager", label: "Manager", description: "Department oversight, manage schedules & vendors" },
  { value: "admin", label: "Admin", description: "Full system access — all pages, settings, user management" },
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

  // CANONICAL: Query pending_approvals table as the SINGLE SOURCE OF TRUTH
  // for users awaiting approval. This ensures consistency with the approval lifecycle.
  const { data: pendingUsers, isLoading, refetch: refetchPending } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      // STEP 1: Get pending user approvals from canonical pending_approvals table
      const { data: pendingApprovals, error: paError } = await supabase
        .from("pending_approvals")
        .select("entity_id, submitted_at, notes")
        .eq("entity_type", "user")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

      if (paError) throw paError;
      if (!pendingApprovals || pendingApprovals.length === 0) return [];

      // STEP 2: Get profile details for these pending users
      const userIds = pendingApprovals.map(pa => pa.entity_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, requested_role, requested_department, company_name, created_at")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Merge data - use pending_approval submission time for ordering
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return pendingApprovals
        .map(pa => {
          const profile = profileMap.get(pa.entity_id);
          if (!profile) return null;
          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            requested_role: profile.requested_role,
            requested_department: profile.requested_department,
            company_name: profile.company_name,
            created_at: profile.created_at,
          } as PendingUser;
        })
        .filter(Boolean) as PendingUser[];
    },
    refetchInterval: 10000,
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
      // GOVERNED ATOMIC APPROVAL COMMIT (Server-Side Edge Function)
      // All database updates happen atomically on the server.
      // Email is only sent AFTER all DB changes succeed.
      // ========================================================================
      const { data, error } = await supabase.functions.invoke("approve-user", {
        body: {
          user_id: pendingUser.id,
          assigned_role: assignedRole,
          assigned_department_id: assignedDepartmentId,
          assigned_tier_id: assignedTierId,
          assigned_manager_id: assignedManagerId,
          custom_message: customMessage.trim() || undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Approval failed");

      // Get department name for toast message
      const assignedDeptName = departments?.find(d => d.id === assignedDepartmentId)?.name || null;

      toast.success(`User approved as ${assignedRole}${assignedDeptName ? ` in ${assignedDeptName}` : ''}!`);
      
      // Close dialog and clear selections
      setApprovalDialog({ open: false, user: null });
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
                      {formatDisplayName(pendingUser.full_name, pendingUser.email) || "—"}
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
                      onClick={() => handleReject(pendingUser.id, formatDisplayName(pendingUser.full_name, pendingUser.email) || pendingUser.email || "")}
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
              Configure {formatDisplayName(approvalDialog.user?.full_name, approvalDialog.user?.email) || approvalDialog.user?.email}'s account settings.
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
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {role.description}</span>
                      </div>
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
                      {formatDisplayName(manager.full_name, manager.email) || manager.email}
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
