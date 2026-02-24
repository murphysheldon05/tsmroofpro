import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Mail, Users, X } from "lucide-react";
import { useNotificationRouting, useUpdateNotificationRouting, useRoleAssignments, useUpdateRoleAssignment } from "@/hooks/useNotificationRouting";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "@/lib/displayName";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  warranty_submission: "Warranty Submission",
  commission_submission: "Commission Submission",
  commission_accounting: "Commission Accounting Review",
};

const ROLE_OPTIONS = ["Production", "Accounting", "Admin"];

export function NotificationRoutingManager() {
  const { data: routings, isLoading: routingsLoading } = useNotificationRouting();
  const { data: assignments, isLoading: assignmentsLoading } = useRoleAssignments();
  const updateRouting = useUpdateNotificationRouting();
  const updateAssignment = useUpdateRoleAssignment();

  // Fetch all users for the dropdown
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-profiles-for-routing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("full_name");
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const [editingRouting, setEditingRouting] = useState<Record<string, any>>({});
  const [editingAssignment, setEditingAssignment] = useState<Record<string, any>>({});

  // Create a map for quick user lookup
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users?.forEach((user) => {
      if (user.id) map.set(user.id, user);
    });
    return map;
  }, [users]);

  const handleRoutingChange = (id: string, field: string, value: any) => {
    setEditingRouting((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleAssignmentUserChange = (
    assignmentId: string,
    field: "assigned_user_id" | "backup_user_id",
    userId: string | null
  ) => {
    const user = userId ? userMap.get(userId) : null;
    const emailField = field === "assigned_user_id" ? "assigned_email" : "backup_email";
    
    setEditingAssignment((prev) => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: userId,
        [emailField]: user?.email || null,
      },
    }));
  };

  const clearAssignmentUser = (
    assignmentId: string,
    field: "assigned_user_id" | "backup_user_id"
  ) => {
    const emailField = field === "assigned_user_id" ? "assigned_email" : "backup_email";
    setEditingAssignment((prev) => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: null,
        [emailField]: null,
      },
    }));
  };

  const handleAssignmentChange = (id: string, field: string, value: any) => {
    setEditingAssignment((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveRouting = (id: string, original: any) => {
    const changes = editingRouting[id] || {};
    updateRouting.mutate({
      id,
      ...original,
      ...changes,
    });
    setEditingRouting((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const saveAssignment = (id: string, original: any) => {
    const changes = editingAssignment[id] || {};
    updateAssignment.mutate({
      id,
      ...original,
      ...changes,
    });
    setEditingAssignment((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const getRoutingValue = (id: string, field: string, original: any) => {
    return editingRouting[id]?.[field] ?? original;
  };

  const getAssignmentValue = (id: string, field: string, original: any) => {
    return editingAssignment[id]?.[field] ?? original;
  };

  const hasRoutingChanges = (id: string) => !!editingRouting[id];
  const hasAssignmentChanges = (id: string) => !!editingAssignment[id];

  // Helper to get user display name (title-cased)
  const getUserDisplayName = (userId: string | null) => {
    if (!userId) return null;
    const user = userMap.get(userId);
    return user ? formatDisplayName(user.full_name, user.email) || user.email || "Unknown User" : "Unknown User";
  };

  if (routingsLoading || assignmentsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Routing Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Notification Routing</CardTitle>
          </div>
          <CardDescription>
            Configure which role receives notifications for each event type. If no user is assigned to that role, the fallback email is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification Type</TableHead>
                <TableHead>Primary Role</TableHead>
                <TableHead>Fallback Email</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routings?.map((routing) => (
                <TableRow key={routing.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {NOTIFICATION_TYPE_LABELS[routing.notification_type] || routing.notification_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getRoutingValue(routing.id, "primary_role", routing.primary_role)}
                      onValueChange={(value) => handleRoutingChange(routing.id, "primary_role", value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="email"
                      value={getRoutingValue(routing.id, "fallback_email", routing.fallback_email)}
                      onChange={(e) => handleRoutingChange(routing.id, "fallback_email", e.target.value)}
                      className="w-[250px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={getRoutingValue(routing.id, "enabled", routing.enabled)}
                      onCheckedChange={(checked) => handleRoutingChange(routing.id, "enabled", checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => saveRouting(routing.id, routing)}
                      disabled={!hasRoutingChanges(routing.id) || updateRouting.isPending}
                    >
                      {updateRouting.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Assignments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Role Assignments</CardTitle>
          </div>
          <CardDescription>
            Assign users to notification roles. Select a user from the dropdown to auto-fill their email. The assigned user receives notifications; if empty, the backup is used; if both empty, the fallback email from routing is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Assigned User</TableHead>
                <TableHead>Backup User</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((assignment) => {
                const currentAssignedUserId = getAssignmentValue(assignment.id, "assigned_user_id", assignment.assigned_user_id);
                const currentBackupUserId = getAssignmentValue(assignment.id, "backup_user_id", assignment.backup_user_id);
                const currentAssignedEmail = getAssignmentValue(assignment.id, "assigned_email", assignment.assigned_email);
                const currentBackupEmail = getAssignmentValue(assignment.id, "backup_email", assignment.backup_email);

                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Badge>{assignment.role_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Select
                            value={currentAssignedUserId || "none"}
                            onValueChange={(value) => 
                              handleAssignmentUserChange(
                                assignment.id, 
                                "assigned_user_id", 
                                value === "none" ? null : value
                              )
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select user..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">None</span>
                              </SelectItem>
                              {users?.filter(u => u.email).map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {currentAssignedUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => clearAssignmentUser(assignment.id, "assigned_user_id")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {currentAssignedEmail && (
                          <span className="text-xs text-muted-foreground">{currentAssignedEmail}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Select
                            value={currentBackupUserId || "none"}
                            onValueChange={(value) => 
                              handleAssignmentUserChange(
                                assignment.id, 
                                "backup_user_id", 
                                value === "none" ? null : value
                              )
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select backup..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">None</span>
                              </SelectItem>
                              {users?.filter(u => u.email).map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {currentBackupUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => clearAssignmentUser(assignment.id, "backup_user_id")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {currentBackupEmail && (
                          <span className="text-xs text-muted-foreground">{currentBackupEmail}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={getAssignmentValue(assignment.id, "active", assignment.active)}
                        onCheckedChange={(checked) => handleAssignmentChange(assignment.id, "active", checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveAssignment(assignment.id, assignment)}
                        disabled={!hasAssignmentChanges(assignment.id) || updateAssignment.isPending}
                      >
                        {updateAssignment.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
