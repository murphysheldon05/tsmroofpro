import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Building2,
  UserPlus,
  X,
  Crown,
} from "lucide-react";
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useDepartmentManagers,
  useAssignDepartmentManager,
  useRemoveDepartmentManager,
  type Department,
} from "@/hooks/useDepartments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DepartmentManager() {
  const { data: departments, isLoading } = useDepartments();
  const { data: departmentManagers } = useDepartmentManagers();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const assignManager = useAssignDepartmentManager();
  const removeManager = useRemoveDepartmentManager();

  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [assigningManagerTo, setAssigningManagerTo] = useState<string | null>(null);

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
    sort_order: 0,
  });

  const [editDepartmentData, setEditDepartmentData] = useState({
    name: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  // Fetch managers for assignment
  const { data: managers } = useQuery({
    queryKey: ["managers-for-department"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["manager", "admin"]);

      if (error) throw error;

      const userIds = roles?.map((r) => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      return profiles?.map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role,
      }));
    },
  });

  const handleCreateDepartment = async () => {
    if (!newDepartment.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    await createDepartment.mutateAsync({
      name: newDepartment.name.trim(),
      description: newDepartment.description.trim() || null,
      sort_order: newDepartment.sort_order,
    });

    setNewDepartment({ name: "", description: "", sort_order: 0 });
    setIsAddingDepartment(false);
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !editDepartmentData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    await updateDepartment.mutateAsync({
      id: editingDepartment.id,
      name: editDepartmentData.name.trim(),
      description: editDepartmentData.description.trim() || null,
      sort_order: editDepartmentData.sort_order,
      is_active: editDepartmentData.is_active,
    });

    setEditingDepartment(null);
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" department?`)) {
      return;
    }
    await deleteDepartment.mutateAsync(id);
  };

  const startEditing = (dept: Department) => {
    setEditingDepartment(dept);
    setEditDepartmentData({
      name: dept.name,
      description: dept.description || "",
      sort_order: dept.sort_order,
      is_active: dept.is_active,
    });
  };

  const getManagersForDepartment = (departmentId: string) => {
    return departmentManagers?.filter((dm) => dm.department_id === departmentId) || [];
  };

  const getManagerName = (managerId: string) => {
    const manager = managers?.find((m) => m.id === managerId);
    return manager?.full_name || manager?.email || "Unknown";
  };

  const handleAssignManager = async (managerId: string, isTeamLead: boolean) => {
    if (!assigningManagerTo) return;

    await assignManager.mutateAsync({
      departmentId: assigningManagerTo,
      managerId,
      isTeamLead,
    });

    setAssigningManagerTo(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">
          Departments ({departments?.length || 0})
        </h2>
        <Dialog open={isAddingDepartment} onOpenChange={setIsAddingDepartment}>
          <DialogTrigger asChild>
            <Button variant="neon">
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newDepartment.name}
                  onChange={(e) =>
                    setNewDepartment({ ...newDepartment, name: e.target.value })
                  }
                  placeholder="e.g., Sales, Production"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newDepartment.description}
                  onChange={(e) =>
                    setNewDepartment({
                      ...newDepartment,
                      description: e.target.value,
                    })
                  }
                  placeholder="Department description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={newDepartment.sort_order}
                  onChange={(e) =>
                    setNewDepartment({
                      ...newDepartment,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingDepartment(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateDepartment}
                  disabled={createDepartment.isPending}
                >
                  Create Department
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Department List */}
      <div className="space-y-4">
        {departments?.map((dept) => {
          const deptManagers = getManagersForDepartment(dept.id);

          return (
            <div
              key={dept.id}
              className="glass-card rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {dept.name}
                      {!dept.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </h3>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground">
                        {dept.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(dept)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Department Managers */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Department Managers
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssigningManagerTo(dept.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deptManagers.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      No managers assigned
                    </span>
                  ) : (
                    deptManagers.map((dm) => (
                      <Badge
                        key={dm.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {dm.is_team_lead && (
                          <Crown className="w-3 h-3 text-amber-500" />
                        )}
                        {getManagerName(dm.manager_id)}
                        <button
                          onClick={() => removeManager.mutate(dm.id)}
                          className="ml-1 p-0.5 hover:bg-muted rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {departments?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No departments yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Edit Department Dialog */}
      <Dialog
        open={!!editingDepartment}
        onOpenChange={(open) => !open && setEditingDepartment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editDepartmentData.name}
                onChange={(e) =>
                  setEditDepartmentData({
                    ...editDepartmentData,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDepartmentData.description}
                onChange={(e) =>
                  setEditDepartmentData({
                    ...editDepartmentData,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editDepartmentData.sort_order}
                  onChange={(e) =>
                    setEditDepartmentData({
                      ...editDepartmentData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editDepartmentData.is_active ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setEditDepartmentData({
                      ...editDepartmentData,
                      is_active: v === "active",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingDepartment(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDepartment}
                disabled={updateDepartment.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Manager Dialog */}
      <Dialog
        open={!!assigningManagerTo}
        onOpenChange={(open) => !open && setAssigningManagerTo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manager to Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Select a manager to assign to this department. Team leads have
              additional responsibilities for their department members.
            </p>
            <div className="space-y-2">
              {managers
                ?.filter((m) => {
                  const existingAssignment = departmentManagers?.find(
                    (dm) =>
                      dm.department_id === assigningManagerTo &&
                      dm.manager_id === m.id
                  );
                  return !existingAssignment;
                })
                .map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">
                        {manager.full_name || manager.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {manager.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignManager(manager.id, false)}
                      >
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAssignManager(manager.id, true)}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Team Lead
                      </Button>
                    </div>
                  </div>
                ))}
              {managers?.filter((m) => {
                const existingAssignment = departmentManagers?.find(
                  (dm) =>
                    dm.department_id === assigningManagerTo &&
                    dm.manager_id === m.id
                );
                return !existingAssignment;
              }).length === 0 && (
                <p className="text-center py-4 text-muted-foreground">
                  All managers are already assigned to this department.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
