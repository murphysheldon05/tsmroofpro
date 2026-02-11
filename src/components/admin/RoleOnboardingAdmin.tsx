import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, GraduationCap, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export function RoleOnboardingAdmin() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all SOPs
  const { data: sops } = useQuery({
    queryKey: ["admin-role-sops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_onboarding_sops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all sections grouped by SOP
  const { data: allSections } = useQuery({
    queryKey: ["admin-role-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_onboarding_sections")
        .select("*")
        .order("section_number");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all users with roles
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["admin-onboarding-users"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, department, employee_status")
        .eq("employee_status", "active");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);
      return (profiles || []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) || "employee",
      }));
    },
  });

  // Fetch all acknowledgments
  const { data: allAcks } = useQuery({
    queryKey: ["admin-all-onboarding-acks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_onboarding_acknowledgments")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all completions
  const { data: allCompletions } = useQuery({
    queryKey: ["admin-all-onboarding-completions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_onboarding_completions")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const getSopForRole = (role: string) => sops?.find((s) => s.role === role && s.is_active);
  const getSectionsForSop = (sopId: string) => allSections?.filter((s) => s.sop_id === sopId) || [];
  const getUserAcks = (userId: string, sopId: string) =>
    allAcks?.filter((a) => a.user_id === userId && a.sop_id === sopId) || [];
  const getUserCompletion = (userId: string, sopId: string) =>
    allCompletions?.find((c) => c.user_id === userId && c.sop_id === sopId);

  const getUserStatus = (userId: string, role: string) => {
    const sop = getSopForRole(role);
    if (!sop) return { status: "no_sop", progress: 0, total: 0 };

    const completion = getUserCompletion(userId, sop.id);
    if (completion) return { status: "completed", progress: 0, total: 0, completion };

    const sections = getSectionsForSop(sop.id).filter((s) => s.is_acknowledgment_required);
    const acks = getUserAcks(userId, sop.id);
    const ackedIds = new Set(acks.map((a) => a.section_id));
    const done = sections.filter((s) => ackedIds.has(s.id)).length;

    if (done === 0) return { status: "not_started", progress: 0, total: sections.length };
    return { status: "in_progress", progress: done, total: sections.length };
  };

  const filteredUsers = (usersWithRoles || []).filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all") {
      const { status } = getUserStatus(u.id, u.role);
      if (statusFilter === "no_sop" && status !== "no_sop") return false;
      if (statusFilter === "not_started" && status !== "not_started") return false;
      if (statusFilter === "in_progress" && status !== "in_progress") return false;
      if (statusFilter === "completed" && status !== "completed") return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Role Onboarding SOPs</h2>
          <p className="text-sm text-muted-foreground">
            Track user progress on role-specific onboarding.
          </p>
        </div>
      </div>

      {/* Active SOPs summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sops?.filter((s) => s.is_active).map((sop) => {
          const sections = getSectionsForSop(sop.id);
          return (
            <Card key={sop.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{sop.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sop.role} • {sections.length} sections • {sop.version}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="sales_manager">Sales Manager</SelectItem>
            <SelectItem value="sales_rep">Sales Rep</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="no_sop">No SOP Assigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>SOP</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const userStatus = getUserStatus(u.id, u.role);
                const sop = getSopForRole(u.role);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sop ? sop.title : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {userStatus.status === "no_sop" ? (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      ) : userStatus.status === "completed" ? (
                        <span className="text-xs text-primary font-medium">Complete</span>
                      ) : (
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Progress value={userStatus.total > 0 ? (userStatus.progress / userStatus.total) * 100 : 0} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {userStatus.progress}/{userStatus.total}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {userStatus.status === "completed" && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </Badge>
                      )}
                      {userStatus.status === "in_progress" && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Clock className="w-3 h-3" /> In Progress
                        </Badge>
                      )}
                      {userStatus.status === "not_started" && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <AlertCircle className="w-3 h-3" /> Not Started
                        </Badge>
                      )}
                      {userStatus.status === "no_sop" && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {userStatus.status === "completed" && (userStatus as any).completion
                        ? (userStatus as any).completion.electronic_signature
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
