import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Mail, Users } from "lucide-react";
import { useNotificationRouting, useUpdateNotificationRouting, useRoleAssignments, useUpdateRoleAssignment } from "@/hooks/useNotificationRouting";

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

  const [editingRouting, setEditingRouting] = useState<Record<string, any>>({});
  const [editingAssignment, setEditingAssignment] = useState<Record<string, any>>({});

  const handleRoutingChange = (id: string, field: string, value: any) => {
    setEditingRouting((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
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

  if (routingsLoading || assignmentsLoading) {
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
            Assign users to notification roles. The assigned email receives notifications; if empty, the backup is used; if both empty, the fallback email from routing is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Email</TableHead>
                <TableHead>Backup Email</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Badge>{assignment.role_name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="email"
                      placeholder="primary@example.com"
                      value={getAssignmentValue(assignment.id, "assigned_email", assignment.assigned_email || "")}
                      onChange={(e) => handleAssignmentChange(assignment.id, "assigned_email", e.target.value || null)}
                      className="w-[220px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="email"
                      placeholder="backup@example.com"
                      value={getAssignmentValue(assignment.id, "backup_email", assignment.backup_email || "")}
                      onChange={(e) => handleAssignmentChange(assignment.id, "backup_email", e.target.value || null)}
                      className="w-[220px]"
                    />
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
