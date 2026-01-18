import { useState, useMemo } from "react";
import { useAppAssignments, useCreateAppAssignment, useUpdateAppAssignment } from "@/hooks/useAppAssignments";
import { useApplications } from "@/hooks/useApplications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Search, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const assignmentRoles = ["business_owner", "system_admin", "onboarding_owner", "access_monitor", "it_triage_owner", "operator", "profile_owner", "external_vendor"];
const permissionLevels = ["top_tier_admin", "admin", "standard_user", "limited_user", "none"];

const roleLabels: Record<string, string> = {
  business_owner: "Business Owner",
  system_admin: "System Admin",
  onboarding_owner: "Onboarding Owner",
  access_monitor: "Access Monitor",
  it_triage_owner: "IT Triage Owner",
  operator: "Operator",
  profile_owner: "Profile Owner",
  external_vendor: "External Vendor",
};

const roleColors: Record<string, string> = {
  business_owner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  system_admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  onboarding_owner: "bg-green-500/20 text-green-400 border-green-500/30",
  it_triage_owner: "bg-red-500/20 text-red-400 border-red-500/30",
  operator: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface AssignmentFormData {
  app_id: string;
  employee_id: string;
  assignment_role: string;
  permission_level: string;
  is_primary: boolean;
  scope_notes: string;
}

const defaultFormData: AssignmentFormData = {
  app_id: "",
  employee_id: "",
  assignment_role: "operator",
  permission_level: "standard_user",
  is_primary: false,
  scope_notes: "",
};

export function AppAssignmentsTable() {
  const { data: assignments, isLoading } = useAppAssignments();
  const { data: applications } = useApplications();
  const createAssignment = useCreateAppAssignment();
  const updateAssignment = useUpdateAppAssignment();

  const { data: employees } = useQuery({
    queryKey: ["employees-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>(defaultFormData);

  // Validation: check for missing primary roles per app
  const validationWarnings = useMemo(() => {
    if (!assignments || !applications) return [];
    
    const warnings: string[] = [];
    const keyRoles = ["business_owner", "system_admin", "it_triage_owner"];
    
    applications.filter(app => app.status === "active").forEach((app) => {
      const appAssignments = assignments.filter((a) => a.app_id === app.id);
      keyRoles.forEach((role) => {
        const primaryForRole = appAssignments.find(
          (a) => a.assignment_role === role && a.is_primary
        );
        if (!primaryForRole) {
          warnings.push(`${app.app_name} is missing a primary ${roleLabels[role]}`);
        }
      });
    });
    
    return warnings;
  }, [assignments, applications]);

  const filteredAssignments = assignments?.filter((a) => {
    const employeeName = a.profiles?.full_name || "";
    const appName = a.applications?.app_name || "";
    const matchesSearch =
      employeeName.toLowerCase().includes(search.toLowerCase()) ||
      appName.toLowerCase().includes(search.toLowerCase());
    const matchesApp = appFilter === "all" || a.app_id === appFilter;
    const matchesRole = roleFilter === "all" || a.assignment_role === roleFilter;
    return matchesSearch && matchesApp && matchesRole;
  });

  const handleSubmit = () => {
    if (editingId) {
      updateAssignment.mutate({ id: editingId, ...formData } as any, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingId(null);
          setFormData(defaultFormData);
        },
      });
    } else {
      createAssignment.mutate(formData as any, {
        onSuccess: () => {
          setDialogOpen(false);
          setFormData(defaultFormData);
        },
      });
    }
  };

  const openEdit = (assignment: any) => {
    setEditingId(assignment.id);
    setFormData({
      app_id: assignment.app_id,
      employee_id: assignment.employee_id,
      assignment_role: assignment.assignment_role,
      permission_level: assignment.permission_level,
      is_primary: assignment.is_primary,
      scope_notes: assignment.scope_notes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {validationWarnings.length > 0 && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <AlertDescription>
            <strong>Validation Warnings:</strong>
            <ul className="list-disc ml-4 mt-1">
              {validationWarnings.slice(0, 5).map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
              {validationWarnings.length > 5 && (
                <li className="text-sm">...and {validationWarnings.length - 5} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee or app..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by App" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {applications?.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.app_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {assignmentRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Application *</Label>
                <Select
                  value={formData.app_id}
                  onValueChange={(v) => setFormData({ ...formData, app_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an app" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications?.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.app_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employee *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name || emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={formData.assignment_role}
                    onValueChange={(v) => setFormData({ ...formData, assignment_role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Permission Level</Label>
                  <Select
                    value={formData.permission_level}
                    onValueChange={(v) => setFormData({ ...formData, permission_level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {permissionLevels.map((level) => (
                        <SelectItem key={level} value={level} className="capitalize">
                          {level.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(c) => setFormData({ ...formData, is_primary: !!c })}
                />
                <Label htmlFor="is_primary">Primary for this role</Label>
              </div>
              <div>
                <Label>Scope Notes</Label>
                <Textarea
                  value={formData.scope_notes}
                  onChange={(e) => setFormData({ ...formData, scope_notes: e.target.value })}
                  placeholder="e.g., Production only, no sales reps, payments only..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.app_id || !formData.employee_id || createAssignment.isPending || updateAssignment.isPending}
              >
                {editingId ? "Save Changes" : "Add Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments?.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.profiles?.full_name || assignment.profiles?.email || "-"}
                  </TableCell>
                  <TableCell>{assignment.applications?.app_name || "-"}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[assignment.assignment_role] || "bg-gray-500/20"}>
                      {roleLabels[assignment.assignment_role] || assignment.assignment_role}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {assignment.permission_level.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    {assignment.is_primary && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(assignment)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
