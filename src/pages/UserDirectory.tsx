import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Search, Mail, Phone, Building2, User, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import { useMyManager } from "@/hooks/useTeamAssignments";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  department_id: string | null;
  data_consent_given: boolean;
  avatar_url: string | null;
}

interface UserWithRole extends UserProfile {
  role: "admin" | "manager" | "employee" | "sales_rep" | "sales_manager" | "accounting";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  sales_manager: "Sales Manager",
  sales_rep: "Sales Rep",
  accounting: "Accounting",
  employee: "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  manager: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  sales_manager: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  sales_rep: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  accounting: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  employee: "bg-muted text-muted-foreground",
};

function ManagerCard({ manager }: { manager: { id: string; full_name: string | null; email: string | null } | null }) {
  if (!manager) {
    return (
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="p-5 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No manager assigned. Contact Admin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Your Manager</p>
            <h3 className="font-bold text-lg text-foreground">{manager.full_name || "Unknown"}</h3>
            {manager.email && <p className="text-sm text-muted-foreground truncate">{manager.email}</p>}
          </div>
          <div className="flex gap-2">
            {manager.email && (
              <a href={`mailto:${manager.email}`} className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Mail className="w-4 h-4 text-primary" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { user } = useAuth();
  const { data: departments } = useDepartments();
  const { data: myManager } = useMyManager();

  const { data: users, isLoading } = useQuery({
    queryKey: ["user-directory"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number, department_id, data_consent_given, avatar_url")
        .eq("employee_status", "active")
        .order("full_name", { ascending: true });
      if (profilesError) throw profilesError;

      const userIds = profiles?.map((p) => p.id) || [];
      if (userIds.length === 0) return [];

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (rolesError) throw rolesError;

      const roleByUserId = new Map(
        (roles ?? []).map((r) => [r.user_id, r.role as string])
      );

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUserId.get(p.id) ?? "employee",
      })) as UserWithRole[];
    },
  });

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments?.find((d) => d.id === departmentId)?.name;
  };

  const filteredUsers = users?.filter((u) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || u.full_name?.toLowerCase().includes(searchLower) || u.email?.toLowerCase().includes(searchLower);
    const matchesDepartment = departmentFilter === "all" || (departmentFilter === "none" && !u.department_id) || u.department_id === departmentFilter;
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const groupedUsers = filteredUsers?.reduce((acc, u) => {
    const deptName = getDepartmentName(u.department_id) || "No Department";
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(u);
    return acc;
  }, {} as Record<string, UserWithRole[]>);

  const sortedDepartments = Object.keys(groupedUsers || {}).sort((a, b) => {
    if (a === "No Department") return 1;
    if (b === "No Department") return -1;
    return a.localeCompare(b);
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Company Directory</h1>
              <p className="text-muted-foreground text-sm">Find the right person for your questions</p>
            </div>
          </div>
        </header>

        {/* Your Manager Card */}
        <ManagerCard manager={myManager || null} />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="none">No Department</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[150px] rounded-xl"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Directory */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : filteredUsers?.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No colleagues found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDepartments.map((deptName) => (
              <div key={deptName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">{deptName}</h2>
                  <Badge variant="outline" className="ml-2">{groupedUsers?.[deptName]?.length || 0}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedUsers?.[deptName]?.map((userProfile) => (
                    <Card
                      key={userProfile.id}
                      className={`overflow-hidden transition-all hover:shadow-lg ${userProfile.id === user?.id ? "ring-2 ring-primary/50" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {userProfile.avatar_url ? (
                              <img src={userProfile.avatar_url} alt={userProfile.full_name || "User"} className="w-11 h-11 rounded-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{userProfile.full_name || "Unknown"}</h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${ROLE_COLORS[userProfile.role] || ""}`}>
                                {ROLE_LABELS[userProfile.role] || userProfile.role}
                              </Badge>
                              {userProfile.id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                          {userProfile.email && (
                            <a href={`mailto:${userProfile.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{userProfile.email}</span>
                            </a>
                          )}
                          {userProfile.phone_number && (
                            <a href={`tel:${userProfile.phone_number}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span>{userProfile.phone_number}</span>
                            </a>
                          )}
                          {!userProfile.phone_number && !userProfile.email && (
                            <p className="text-sm text-muted-foreground italic">No contact info available</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
