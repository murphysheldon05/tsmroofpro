import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  User,
  Crown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { WhoToContactChart } from "@/components/directory/WhoToContactChart";

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
  role: "admin" | "manager" | "employee";
}

export default function UserDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const { user } = useAuth();
  const { data: departments } = useDepartments();

  // Fetch visible profiles (RLS will filter based on can_view_profile function)
  const { data: users, isLoading } = useQuery({
    queryKey: ["user-directory"],
    queryFn: async () => {
      // Fetch profiles that the current user can see (RLS enforced)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number, department_id, data_consent_given, avatar_url")
        .eq("is_approved", true)
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch roles for these users
      const userIds = profiles?.map((p) => p.id) || [];
      if (userIds.length === 0) return [];

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      const roleByUserId = new Map<string, "admin" | "manager" | "employee">(
        (roles ?? []).map((r) => [r.user_id, r.role])
      );

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUserId.get(p.id) ?? "employee",
      })) as UserWithRole[];
    },
  });

  // Fetch department managers to show team lead badges
  const { data: departmentManagers } = useQuery({
    queryKey: ["department-managers-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_managers")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return null;
    return departments?.find((d) => d.id === departmentId)?.name;
  };

  const isTeamLead = (userId: string) => {
    return departmentManagers?.some((dm) => dm.manager_id === userId && dm.is_team_lead);
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive";
    if (role === "manager") return "default";
    return "secondary";
  };

  // Filter users based on search and department
  const filteredUsers = users?.filter((u) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower);

    // Department filter
    const matchesDepartment =
      departmentFilter === "all" ||
      (departmentFilter === "none" && !u.department_id) ||
      u.department_id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  // Group users by department for display
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Who to Contact</h1>
              <p className="text-muted-foreground text-sm">
                Find the right person for your questions
              </p>
            </div>
          </div>
        </header>

        {/* Who to Contact Quick Reference */}
        <WhoToContactChart />

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="none">No Department</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* User Directory */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-24 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers?.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No colleagues found</h3>
            <p className="text-muted-foreground">
              {searchQuery || departmentFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "You can only view profiles of colleagues who have given data consent and are in your department."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDepartments.map((deptName) => (
              <div key={deptName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">{deptName}</h2>
                  <Badge variant="outline" className="ml-2">
                    {groupedUsers?.[deptName]?.length || 0}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedUsers?.[deptName]?.map((userProfile) => (
                    <Card
                      key={userProfile.id}
                      className={`overflow-hidden transition-all hover:shadow-lg ${
                        userProfile.id === user?.id ? "ring-2 ring-primary/50" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {userProfile.avatar_url ? (
                              <img
                                src={userProfile.avatar_url}
                                alt={userProfile.full_name || "User"}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">
                                {userProfile.full_name || "Unknown"}
                              </h3>
                              {isTeamLead(userProfile.id) && (
                                <Crown className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant={getRoleBadgeVariant(userProfile.role)} className="text-xs">
                                {userProfile.role === "admin"
                                  ? "Admin"
                                  : userProfile.role === "manager"
                                  ? "Manager"
                                  : "Employee"}
                              </Badge>
                              {userProfile.id === user?.id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          {userProfile.email && (
                            <a
                              href={`mailto:${userProfile.email}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{userProfile.email}</span>
                            </a>
                          )}
                          {userProfile.phone_number && (
                            <a
                              href={`tel:${userProfile.phone_number}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                              <span>{userProfile.phone_number}</span>
                            </a>
                          )}
                          {!userProfile.phone_number && !userProfile.email && (
                            <p className="text-sm text-muted-foreground italic">
                              No contact information available
                            </p>
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

        {/* Privacy notice */}
        <div className="text-center text-sm text-muted-foreground px-4 py-6">
          <p>
            You can only view profiles of colleagues who have consented to data sharing
            and are either in your department or departments you manage.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
