import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Plus,
  Users,
  Trash2,
  Edit,
  Loader2,
  Shield,
  Mail,
  CheckCircle,
  Clock,
  Bell,
  Route,
  Building2,
  Percent,
  UserPlus,
  AlertTriangle,
  Wrench,
  FolderOpen,
  FileText,
  DollarSign,
  Trophy,
} from "lucide-react";
import { UserPermissionsEditor } from "@/components/admin/UserPermissionsEditor";
import { PendingApprovals } from "@/components/admin/PendingApprovals";
import { PendingInvites } from "@/components/admin/PendingInvites";
import { useDepartments } from "@/hooks/useDepartments";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationSettingsManager } from "@/components/admin/NotificationSettingsManager";
import { NotificationRoutingManager } from "@/components/admin/NotificationRoutingManager";
import { CommissionTierManager } from "@/components/admin/CommissionTierManager";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { SOPManager } from "@/components/admin/SOPManager";
import { ToolsManager } from "@/components/admin/ToolsManager";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { useCommissionTiers } from "@/hooks/useCommissionTiers";
import { useAdminAuditLog, AUDIT_ACTIONS, OBJECT_TYPES } from "@/hooks/useAdminAuditLog";
import { DrawSettingsManager } from "@/components/admin/DrawSettingsManager";
import { OverrideReportPanel } from "@/components/admin/OverrideReportPanel";
import { LeaderboardSettingsPanel } from "@/components/admin/LeaderboardSettingsPanel";
import { PlaybookCompletionStatus } from "@/components/admin/PlaybookCompletionStatus";
import { BookOpen } from "lucide-react";

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: departments } = useDepartments();
  const { data: commissionTiers } = useCommissionTiers();
  const { logAction } = useAdminAuditLog();

  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserPermissions, setEditingUserPermissions] = useState<any | null>(null);

  const [inviteData, setInviteData] = useState({
    email: "",
  });

  const [editUserData, setEditUserData] = useState({
    full_name: "",
    email: "",
    department_id: "" as string | null,
    commission_tier_id: "" as string | null,
    manager_id: "" as string | null,
  });

  // Fetch user commission tier assignment
  const { data: userTierAssignments } = useQuery({
    queryKey: ["user-commission-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_commission_tiers")
        .select("user_id, tier_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch team assignments
  const { data: teamAssignments } = useQuery({
    queryKey: ["team-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_assignments")
        .select("employee_id, manager_id");
      if (error) throw error;
      return data;
    },
  });

  // Get managers for team assignment
  const { data: managers } = useQuery({
    queryKey: ["managers-for-teams"],
    queryFn: async () => {
      // Get users with manager or admin roles
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

  const {
    data: users,
    isFetching: isUsersFetching,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // GOVERNANCE: Fetch only active users (employee_status is canonical)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("employee_status", "active")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleByUserId = new Map<string, string>(
        (roles ?? []).map((r) => [r.user_id, r.role as string])
      );

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUserId.get(p.id) ?? "employee",
      }));
    },
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const handleSendInvite = async () => {
    if (!inviteData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteData.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingInvite(true);
    try {
      // Use new send-invite function that stores in pending_invites table
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: inviteData.email.trim(),
          full_name: inviteData.email.split("@")[0], // Use email prefix as temp name
        },
      });

      if (error) {
        const errorData = error.message ? JSON.parse(error.message) : error;
        if (errorData?.code === "already_registered") {
          toast.error("This user already has an active account. They can sign in directly.");
        } else {
          throw new Error(errorData?.error || error.message);
        }
        return;
      }

      // Audit log
      logAction.mutate({
        action_type: AUDIT_ACTIONS.INVITE_SENT,
        object_type: OBJECT_TYPES.USER,
        object_id: inviteData.email,
        new_value: { email: inviteData.email.trim() },
        notes: `Invite sent to ${inviteData.email.trim()}`,
      });

      toast.success("Invite sent! User will appear in Pending Invites.");
      setIsInvitingUser(false);
      setInviteData({ email: "" });
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    } catch (error: any) {
      toast.error("Failed to send invite: " + error.message);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    // Get old role for audit log
    const oldRole = users?.find((u) => u.id === userId)?.role;
    
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update role");
    } else {
      // Audit log
      logAction.mutate({
        action_type: AUDIT_ACTIONS.ROLE_CHANGED,
        object_type: OBJECT_TYPES.USER,
        object_id: userId,
        previous_value: { role: oldRole },
        new_value: { role: newRole },
      });
      
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });

      if (error) throw error;

      // Audit log
      logAction.mutate({
        action_type: AUDIT_ACTIONS.USER_DELETED,
        object_type: OBJECT_TYPES.USER,
        object_id: userId,
        previous_value: { name: userName },
        new_value: null,
      });

      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const handleSaveUserSettings = async (userId: string) => {
    try {
      // Get current values for audit log
      const previousUser = users?.find((u) => u.id === userId);
      const previousTier = getUserTier(userId);
      const previousManager = getUserManager(userId);
      
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editUserData.full_name.trim(),
          department_id: editUserData.department_id || null,
          manager_id: editUserData.manager_id || null,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update commission tier assignment
      if (editUserData.commission_tier_id) {
        // Delete existing assignment
        await supabase
          .from("user_commission_tiers")
          .delete()
          .eq("user_id", userId);

        // Insert new assignment
        const { error: tierError } = await supabase
          .from("user_commission_tiers")
          .insert({
            user_id: userId,
            tier_id: editUserData.commission_tier_id,
          });

        if (tierError) throw tierError;
      } else {
        // Remove tier assignment if none selected
        await supabase
          .from("user_commission_tiers")
          .delete()
          .eq("user_id", userId);
      }

      // Update team assignment (manager relationship)
      if (editUserData.manager_id) {
        // Delete existing assignment
        await supabase
          .from("team_assignments")
          .delete()
          .eq("employee_id", userId);

        // Insert new assignment
        const { error: teamError } = await supabase
          .from("team_assignments")
          .insert({
            employee_id: userId,
            manager_id: editUserData.manager_id,
          });

        if (teamError) throw teamError;
      } else {
        // Remove team assignment if none selected
        await supabase
          .from("team_assignments")
          .delete()
          .eq("employee_id", userId);
      }

      // Audit log for department change
      if (previousUser?.department_id !== editUserData.department_id) {
        logAction.mutate({
          action_type: AUDIT_ACTIONS.DEPARTMENT_CHANGED,
          object_type: OBJECT_TYPES.USER,
          object_id: userId,
          previous_value: { department_id: previousUser?.department_id },
          new_value: { department_id: editUserData.department_id },
        });
      }

      // Audit log for manager change
      if (previousManager !== editUserData.manager_id) {
        logAction.mutate({
          action_type: AUDIT_ACTIONS.MANAGER_CHANGED,
          object_type: OBJECT_TYPES.USER,
          object_id: userId,
          previous_value: { manager_id: previousManager },
          new_value: { manager_id: editUserData.manager_id },
        });
      }

      // Audit log for commission tier change
      if (previousTier !== editUserData.commission_tier_id) {
        logAction.mutate({
          action_type: AUDIT_ACTIONS.COMMISSION_TIER_CHANGED,
          object_type: OBJECT_TYPES.USER,
          object_id: userId,
          previous_value: { tier_id: previousTier },
          new_value: { tier_id: editUserData.commission_tier_id },
        });
      }

      toast.success("User settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-commission-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["team-assignments"] });
      setEditingUser(null);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const getUserTier = (userId: string) => {
    const assignment = userTierAssignments?.find((a) => a.user_id === userId);
    return assignment?.tier_id || null;
  };

  const getUserManager = (userId: string) => {
    const assignment = teamAssignments?.find((a) => a.employee_id === userId);
    return assignment?.manager_id || null;
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">
                Centralized system configuration — all editing authority lives here
              </p>
            </div>
          </div>
        </header>

        {/* Admin Panel Tabs - Centralized Control Plane */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="tiers" className="gap-2">
              <Percent className="w-4 h-4" />
              Commission Tiers
            </TabsTrigger>
            <TabsTrigger value="sops" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Playbooks
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Playbook Categories
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Wrench className="w-4 h-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="routing" className="gap-2">
              <Route className="w-4 h-4" />
              Routing
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="draws" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Draw Settings
            </TabsTrigger>
            <TabsTrigger value="overrides" className="gap-2">
              <Percent className="w-4 h-4" />
              Overrides
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="playbook-status" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Playbook Status
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Pending Invites Section - Users invited but haven't logged in */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Pending Invites</h2>
              <PendingInvites />
            </div>

            {/* Pending Approvals Section */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Pending Approvals</h2>
              <PendingApprovals />
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">
                Active Users ({users?.length || 0})
              </h2>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchUsers()}
                  disabled={isUsersFetching}
                >
                  {isUsersFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                </Button>

                {/* Invite by Email - ONLY allowed user creation method */}
                <Dialog open={isInvitingUser} onOpenChange={setIsInvitingUser}>
                  <DialogTrigger asChild>
                    <Button variant="neon">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite by Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        Send an invite email. The user will create their own account at the signup page and appear in Pending Approvals once they register.
                      </p>
                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          value={inviteData.email}
                          onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                          placeholder="user@example.com"
                        />
                      </div>
                      <Button
                        onClick={handleSendInvite}
                        className="w-full"
                        disabled={isSendingInvite}
                      >
                        {isSendingInvite ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invite Email
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden xl:table-cell">
                      Manager
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden 2xl:table-cell">
                      Commission Tier
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                {users?.map((user, index) => {
                    const userTierId = getUserTier(user.id);
                    const tierName = commissionTiers?.find((t) => t.id === userTierId)?.name;
                    const deptName = departments?.find((d) => d.id === user.department_id)?.name;
                    const userManagerId = getUserManager(user.id);
                    const managerName = managers?.find((m) => m.id === userManagerId)?.full_name;
                    const isSalesWithoutManager = user.role === "employee" && deptName?.toLowerCase() === "sales" && !userManagerId;

                    return (
                      <tr
                        key={user.id}
                        className={
                          index < (users?.length || 0) - 1
                            ? "border-b border-border/30"
                            : ""
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {user.full_name || "—"}
                            </p>
                            {isSalesWithoutManager && (
                              <Badge variant="destructive" className="text-xs">No Manager</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {deptName ? (
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="w-3 h-3" />
                              {deptName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {managerName ? (
                            <Badge variant="outline" className="gap-1">
                              <Users className="w-3 h-3" />
                              {managerName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden 2xl:table-cell">
                          {tierName ? (
                            <Badge variant="secondary" className="gap-1">
                              <Percent className="w-3 h-3" />
                              {tierName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            key={`${user.id}-${user.role}`}
                            defaultValue={user.role || "employee"}
                            onValueChange={(v) => handleUpdateUserRole(user.id, v)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">
                                <span className="font-medium">Employee</span>
                              </SelectItem>
                              <SelectItem value="sales_rep">
                                <span className="font-medium">Sales Rep</span>
                              </SelectItem>
                              <SelectItem value="sales_manager">
                                <span className="font-medium">Sales Manager</span>
                              </SelectItem>
                              <SelectItem value="manager">
                                <span className="font-medium">Manager</span>
                              </SelectItem>
                              <SelectItem value="accounting">
                                <span className="font-medium">Accounting</span>
                              </SelectItem>
                              <SelectItem value="admin">
                                <span className="font-medium">Admin</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Permissions button - only show for employees */}
                            {user.role === "employee" && (
                              <Dialog
                                open={editingUserPermissions?.id === user.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setEditingUserPermissions(user);
                                  } else {
                                    setEditingUserPermissions(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Permissions">
                                    <Shield className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Edit Permissions - {user.full_name || user.email}</DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    <UserPermissionsEditor
                                      userId={user.id}
                                      userRole={user.role || "employee"}
                                      onClose={() => setEditingUserPermissions(null)}
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            {/* Reset Password */}
                            <ResetPasswordDialog
                              userId={user.id}
                              userName={user.full_name || ""}
                              userEmail={user.email || ""}
                            />
                            {/* Edit User - Full configuration */}
                            <Dialog
                              open={editingUser?.id === user.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setEditingUser(user);
                                  setEditUserData({
                                    full_name: user.full_name || "",
                                    email: user.email || "",
                                    department_id: user.department_id || null,
                                    commission_tier_id: getUserTier(user.id),
                                    manager_id: getUserManager(user.id),
                                  });
                                } else {
                                  setEditingUser(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit User Settings</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                      value={editUserData.full_name}
                                      onChange={(e) => setEditUserData({ ...editUserData, full_name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      type="email"
                                      value={editUserData.email}
                                      disabled
                                      className="opacity-50"
                                    />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select
                                      value={editUserData.department_id || "none"}
                                      onValueChange={(v) => setEditUserData({ ...editUserData, department_id: v === "none" ? null : v })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="No department" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No department</SelectItem>
                                        {departments?.map((dept) => (
                                          <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Manager</Label>
                                    <Select
                                      value={editUserData.manager_id || "none"}
                                      onValueChange={(v) => setEditUserData({ ...editUserData, manager_id: v === "none" ? null : v })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="No manager assigned" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No manager assigned</SelectItem>
                                        {managers?.filter((m) => m.id !== user.id).map((manager) => (
                                          <SelectItem key={manager.id} value={manager.id}>
                                            {manager.full_name || manager.email}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Commission forms route to this manager for approval</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Commission Tier</Label>
                                    <Select
                                      value={editUserData.commission_tier_id || "none"}
                                      onValueChange={(v) => setEditUserData({ ...editUserData, commission_tier_id: v === "none" ? null : v })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="No tier assigned" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No tier assigned</SelectItem>
                                        {commissionTiers?.map((tier) => (
                                          <SelectItem key={tier.id} value={tier.id}>
                                            {tier.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    onClick={() => handleSaveUserSettings(user.id)}
                                    className="w-full"
                                  >
                                    Save Changes
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUser(user.id, user.full_name || user.email || "this user")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!users || users.length === 0) && (
                <div className="p-8 text-center text-muted-foreground">
                  No active users yet. Invite someone to get started.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Commission Tiers Tab - ADMIN ONLY */}
          <TabsContent value="tiers" className="space-y-4">
            <CommissionTierManager />
          </TabsContent>

          {/* SOPs Management Tab - ADMIN ONLY */}
          <TabsContent value="sops" className="space-y-4">
            <SOPManager />
          </TabsContent>

          {/* SOP Categories Tab - ADMIN ONLY */}
          <TabsContent value="categories" className="space-y-4">
            <CategoryManager />
          </TabsContent>

          {/* Tools Tab - ADMIN ONLY */}
          <TabsContent value="tools" className="space-y-4">
            <ToolsManager />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettingsManager />
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing" className="space-y-4">
            <NotificationRoutingManager />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <AuditLogViewer />
          </TabsContent>

          {/* Draw Settings Tab */}
          <TabsContent value="draws" className="space-y-4">
            <DrawSettingsManager />
          </TabsContent>

          {/* Overrides Tab */}
          <TabsContent value="overrides" className="space-y-4">
            <OverrideReportPanel />
          </TabsContent>

          {/* Leaderboard Settings Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <LeaderboardSettingsPanel />
          </TabsContent>

          {/* Playbook Completion Status Tab */}
          <TabsContent value="playbook-status" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Playbook Completion Status</h2>
            <p className="text-sm text-muted-foreground">
              Track which users have completed the Master Playbook acknowledgment requirement.
            </p>
            <PlaybookCompletionStatus />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
