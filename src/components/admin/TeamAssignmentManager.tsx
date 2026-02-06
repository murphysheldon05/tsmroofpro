import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, UserMinus, Loader2, Award } from "lucide-react";
import {
  useTeamAssignments,
  useAssignEmployee,
  useRemoveAssignment,
} from "@/hooks/useTeamAssignments";
import {
  useCommissionTiers,
  useUserCommissionTier,
  useAssignUserTier,
  useRemoveUserTier,
} from "@/hooks/useCommissionTiers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "manager" | "employee";
}

function TeamMemberTierSelect({ 
  employeeId, 
  employeeName,
  currentUserId 
}: { 
  employeeId: string; 
  employeeName: string;
  currentUserId: string;
}) {
  const { data: tiers } = useCommissionTiers();
  const { data: userTier, isLoading } = useUserCommissionTier(employeeId);
  const assignTier = useAssignUserTier();
  const removeTier = useRemoveUserTier();

  const handleTierChange = async (tierId: string) => {
    if (tierId === "none") {
      await removeTier.mutateAsync(employeeId);
    } else {
      await assignTier.mutateAsync({
        userId: employeeId,
        tierId,
        assignedBy: currentUserId,
      });
    }
  };

  if (isLoading) {
    return <Loader2 className="w-3 h-3 animate-spin" />;
  }

  return (
    <Select 
      value={userTier?.tier_id || "none"} 
      onValueChange={handleTierChange}
      disabled={assignTier.isPending || removeTier.isPending}
    >
      <SelectTrigger className="w-[140px] h-7 text-xs">
        <SelectValue placeholder="Assign tier..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Tier</SelectItem>
        {tiers?.map((tier) => (
          <SelectItem key={tier.id} value={tier.id}>
            {tier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TeamAssignmentManager() {
  const { user } = useAuth();
  const { data: assignments, isLoading: isLoadingAssignments } = useTeamAssignments();
  const assignEmployee = useAssignEmployee();
  const removeAssignment = useRemoveAssignment();

  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedManager, setSelectedManager] = useState<string>("");

  // Fetch all users with roles
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users-for-teams"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleByUserId = new Map<string, "admin" | "manager" | "employee" | "ops_compliance">(
        (roles ?? []).map((r) => [r.user_id, r.role as "admin" | "manager" | "employee" | "ops_compliance"])
      );

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUserId.get(p.id) ?? "employee",
      })) as User[];
    },
  });

  const managers = users?.filter((u) => u.role === "manager") || [];
  const employees = users?.filter((u) => u.role === "employee") || [];
  
  // Get assigned employee IDs
  const assignedEmployeeIds = new Set(assignments?.map((a) => a.employee_id) || []);
  const unassignedEmployees = employees.filter((e) => !assignedEmployeeIds.has(e.id));

  const handleAssign = async () => {
    if (!selectedEmployee || !selectedManager) return;
    await assignEmployee.mutateAsync({
      employeeId: selectedEmployee,
      managerId: selectedManager,
    });
    setSelectedEmployee("");
    setSelectedManager("");
  };

  const handleRemove = async (employeeId: string) => {
    await removeAssignment.mutateAsync(employeeId);
  };

  if (isLoadingAssignments || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group assignments by manager
  const assignmentsByManager = new Map<string, typeof assignments>();
  assignments?.forEach((a) => {
    const existing = assignmentsByManager.get(a.manager_id) || [];
    assignmentsByManager.set(a.manager_id, [...existing, a]);
  });

  return (
    <div className="space-y-6">
      {/* Add New Assignment */}
      <div className="glass-card rounded-xl p-4 space-y-4">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Assign Employee to Manager
        </h3>
        <p className="text-sm text-muted-foreground">
          Employees assigned to a manager will have their commission forms routed to that manager for approval before going to admin.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select employee..." />
            </SelectTrigger>
            <SelectContent>
              {unassignedEmployees.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  All employees are assigned
                </div>
              ) : (
                unassignedEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name || e.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select value={selectedManager} onValueChange={setSelectedManager}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select manager..." />
            </SelectTrigger>
            <SelectContent>
              {managers.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No managers available
                </div>
              ) : (
                managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button
            onClick={handleAssign}
            disabled={!selectedEmployee || !selectedManager || assignEmployee.isPending}
          >
            {assignEmployee.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Assign"
            )}
          </Button>
        </div>
      </div>

      {/* Current Assignments by Manager */}
      {managers.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No managers in the system yet.</p>
          <p className="text-sm mt-1">Promote an employee to manager to start building teams.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Team Structure</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Award className="w-3 h-3" />
            Assign commission tiers to control which O&P and Profit Split options each team member can select.
          </p>
          
          {managers.map((manager) => {
            const teamMembers = assignmentsByManager.get(manager.id) || [];
            
            return (
              <div key={manager.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">Manager</Badge>
                  <span className="font-medium text-foreground">
                    {manager.full_name || manager.email}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""})
                  </span>
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-4">No team members assigned</p>
                ) : (
                  <div className="space-y-2 pl-4 border-l-2 border-border/50">
                    {teamMembers.map((assignment) => {
                      const employeeName = assignment.employee_profile?.full_name || 
                        assignment.employee_profile?.email || "Unknown";
                      
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg gap-2"
                        >
                          <span className="text-sm text-foreground flex-1">
                            {employeeName}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <TeamMemberTierSelect 
                              employeeId={assignment.employee_id}
                              employeeName={employeeName}
                              currentUserId={user?.id || ""}
                            />
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemove(assignment.employee_id)}
                              disabled={removeAssignment.isPending}
                            >
                              {removeAssignment.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserMinus className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned Employees */}
      {unassignedEmployees.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-medium text-foreground mb-3">Unassigned Employees</h3>
          <p className="text-sm text-muted-foreground mb-3">
            These employees don't have a manager. Their commission forms will go directly to admins.
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedEmployees.map((e) => (
              <Badge key={e.id} variant="outline" className="text-sm">
                {e.full_name || e.email}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
