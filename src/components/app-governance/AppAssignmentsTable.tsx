import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppAssignments, useCreateAppAssignment, useUpdateAppAssignment, useApplications } from "@/hooks/useAppGovernance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Search } from "lucide-react";

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

const permissionLabels: Record<string, string> = {
  top_tier_admin: "Top Tier Admin",
  admin: "Admin",
  standard_user: "Standard User",
  limited_user: "Limited User",
  none: "None",
};

const permissionColors: Record<string, string> = {
  top_tier_admin: "bg-red-500/20 text-red-400 border-red-500/30",
  admin: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  standard_user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  limited_user: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  none: "bg-muted text-muted-foreground",
};

export function AppAssignmentsTable() {
  const { data: assignments, isLoading } = useAppAssignments();
  const { data: applications } = useApplications();
  const createAssignment = useCreateAppAssignment();
  const updateAssignment = useUpdateAppAssignment();

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newAssignment, setNewAssignment] = useState({
    app_id: "",
    employee_id: "",
    assignment_role: "operator" as const,
    permission_level: "standard_user" as const,
    scope_notes: "",
    is_primary: false,
  });

  const handleCreate = async () => {
    if (!newAssignment.app_id || !newAssignment.employee_id) return;
    await createAssignment.mutateAsync(newAssignment);
    setNewAssignment({ app_id: "", employee_id: "", assignment_role: "operator", permission_level: "standard_user", scope_notes: "", is_primary: false });
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingAssignment) return;
    await updateAssignment.mutateAsync({
      id: editingAssignment.id,
      assignment_role: editingAssignment.assignment_role,
      permission_level: editingAssignment.permission_level,
      scope_notes: editingAssignment.scope_notes,
      is_primary: editingAssignment.is_primary,
    });
    setEditingAssignment(null);
  };

  const filteredAssignments = assignments?.filter(a => 
    a.applications?.app_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Assignment</DialogTitle>
              <DialogDescription>Assign an employee to an application</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application *</Label>
                <Select
                  value={newAssignment.app_id}
                  onValueChange={(v) => setNewAssignment({ ...newAssignment, app_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select application" /></SelectTrigger>
                  <SelectContent>
                    {applications?.filter(a => a.status === "active").map((app) => (
                      <SelectItem key={app.id} value={app.id}>{app.app_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select
                  value={newAssignment.employee_id}
                  onValueChange={(v) => setNewAssignment({ ...newAssignment, employee_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newAssignment.assignment_role}
                    onValueChange={(v: any) => setNewAssignment({ ...newAssignment, assignment_role: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Permission Level</Label>
                  <Select
                    value={newAssignment.permission_level}
                    onValueChange={(v: any) => setNewAssignment({ ...newAssignment, permission_level: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(permissionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newAssignment.is_primary}
                  onCheckedChange={(c) => setNewAssignment({ ...newAssignment, is_primary: !!c })}
                />
                <Label>Primary for this role</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newAssignment.app_id || !newAssignment.employee_id || createAssignment.isPending}>
                Add Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Permission</TableHead>
            <TableHead>Primary</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAssignments?.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell className="font-medium">{assignment.applications?.app_name}</TableCell>
              <TableCell>
                <div>
                  <div>{assignment.profiles?.full_name}</div>
                  <div className="text-sm text-muted-foreground">{assignment.profiles?.email}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{roleLabels[assignment.assignment_role] || assignment.assignment_role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={permissionColors[assignment.permission_level]}>
                  {permissionLabels[assignment.permission_level] || assignment.permission_level}
                </Badge>
              </TableCell>
              <TableCell>
                {assignment.is_primary && <Badge className="bg-primary/20 text-primary border-primary/30">Primary</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => setEditingAssignment(assignment)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          {editingAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editingAssignment.assignment_role}
                    onValueChange={(v) => setEditingAssignment({ ...editingAssignment, assignment_role: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Permission Level</Label>
                  <Select
                    value={editingAssignment.permission_level}
                    onValueChange={(v) => setEditingAssignment({ ...editingAssignment, permission_level: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(permissionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingAssignment.is_primary}
                  onCheckedChange={(c) => setEditingAssignment({ ...editingAssignment, is_primary: !!c })}
                />
                <Label>Primary for this role</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignment(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateAssignment.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
