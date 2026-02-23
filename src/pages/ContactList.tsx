import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Search, Mail, Phone, Building2, User, Crown, Truck, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import { useMyManager } from "@/hooks/useTeamAssignments";
import { useVendors } from "@/hooks/useVendors";
import { useProspects } from "@/hooks/useProspects";
import { Skeleton } from "@/components/ui/skeleton";
import { VENDOR_TYPES } from "@/lib/directoryConstants";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  department_id: string | null;
  avatar_url: string | null;
}

interface UserWithRole extends UserProfile {
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", manager: "Manager", sales_manager: "Sales Manager",
  sales_rep: "Sales Rep", accounting: "Accounting", employee: "Employee",
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
          {manager.email && (
            <a href={`mailto:${manager.email}`} className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Mail className="w-4 h-4 text-primary" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContactList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [vendorSearch, setVendorSearch] = useState("");
  const [prospectSearch, setProspectSearch] = useState("");
  const { user } = useAuth();
  const { data: departments } = useDepartments();
  const { data: myManager } = useMyManager();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const { data: prospects = [], isLoading: prospectsLoading } = useProspects();

  const { data: users, isLoading: usersLoading } = useQuery({
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
      const roleByUserId = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleByUserId.get(p.id) ?? "employee",
      })) as UserWithRole[];
    },
  });

  const getDepartmentName = (departmentId: string | null) =>
    departments?.find((d) => d.id === departmentId)?.name ?? null;

  const filteredUsers = users?.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchDept = departmentFilter === "all" || (departmentFilter === "none" && !u.department_id) || u.department_id === departmentFilter;
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchDept && matchRole;
  });

  const groupedUsers = filteredUsers?.reduce((acc, u) => {
    const deptName = getDepartmentName(u.department_id) || "No Department";
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(u);
    return acc;
  }, {} as Record<string, UserWithRole[]>);

  const sortedDepts = Object.keys(groupedUsers || {}).sort((a, b) => {
    if (a === "No Department") return 1;
    if (b === "No Department") return -1;
    return a.localeCompare(b);
  });

  const filteredVendors = vendorSearch
    ? vendors.filter(
        (v) =>
          v.vendor_name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
          v.primary_contact_name?.toLowerCase().includes(vendorSearch.toLowerCase())
      )
    : vendors;
  const filteredProspects = prospectSearch
    ? prospects.filter(
        (p) =>
          p.company_name?.toLowerCase().includes(prospectSearch.toLowerCase()) ||
          p.contact_name?.toLowerCase().includes(prospectSearch.toLowerCase())
      )
    : prospects;

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contact List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vendors, suppliers, and business contacts</p>
        </div>

        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 flex-wrap h-auto">
            <TabsTrigger value="company" className="gap-2 rounded-xl">
              <Users className="h-4 w-4" />
              Company Directory
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2 rounded-xl">
              <Truck className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="prospects" className="gap-2 rounded-xl">
              <UserPlus className="h-4 w-4" />
              Prospects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 mt-0">
            <ManagerCard manager={myManager || null} />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl" />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments?.map((dept) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px] rounded-xl"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {usersLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : !filteredUsers?.length ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No colleagues found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDepts.map((deptName) => (
                  <div key={deptName} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-lg font-semibold text-foreground">{deptName}</h2>
                      <Badge variant="outline">{groupedUsers?.[deptName]?.length || 0}</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupedUsers?.[deptName]?.map((u) => (
                        <Card key={u.id} className={u.id === user?.id ? "ring-2 ring-primary/50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name || "User"} className="w-11 h-11 rounded-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">{u.full_name || "Unknown"}</h3>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] || ""}`}>{ROLE_LABELS[u.role] || u.role}</Badge>
                                  {u.id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                              {u.email && <a href={`mailto:${u.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Mail className="w-4 h-4 flex-shrink-0" /><span className="truncate">{u.email}</span></a>}
                              {u.phone_number && <a href={`tel:${u.phone_number}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="w-4 h-4 flex-shrink-0" /><span>{u.phone_number}</span></a>}
                              {!u.phone_number && !u.email && <p className="text-sm text-muted-foreground italic">No contact info</p>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4 mt-0">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search vendors..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="pl-10 rounded-xl" />
            </div>
            {vendorsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-16">
                <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No vendors found</h3>
                <p className="text-muted-foreground">Vendors and suppliers will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVendors.map((v) => (
                  <Card key={v.id}>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground truncate">{v.vendor_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{v.primary_contact_name}</p>
                      <Badge variant="outline" className="text-xs">{VENDOR_TYPES.find((t) => t.value === v.vendor_type)?.label || v.vendor_type}</Badge>
                      <div className="pt-2 border-t border-border/30 space-y-1">
                        {v.phone && <a href={`tel:${v.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="w-3.5 h-3.5" />{v.phone}</a>}
                        {v.email && <a href={`mailto:${v.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground truncate"><Mail className="w-3.5 h-3.5" />{v.email}</a>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prospects" className="space-y-4 mt-0">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search prospects..." value={prospectSearch} onChange={(e) => setProspectSearch(e.target.value)} className="pl-10 rounded-xl" />
            </div>
            {prospectsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
            ) : filteredProspects.length === 0 ? (
              <div className="text-center py-16">
                <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No prospects found</h3>
                <p className="text-muted-foreground">Prospects will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProspects.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground truncate">{p.company_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{p.contact_name}</p>
                      <Badge variant="outline" className="text-xs capitalize">{p.prospect_type}</Badge>
                      <div className="pt-2 border-t border-border/30 space-y-1">
                        {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone className="w-3.5 h-3.5" />{p.phone}</a>}
                        {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground truncate"><Mail className="w-3.5 h-3.5" />{p.email}</a>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
