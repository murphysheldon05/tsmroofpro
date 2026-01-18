import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/hooks/useDepartments";

interface EmployeesTableProps {
  onSelectEmployee: (id: string) => void;
}

export function EmployeesTable({ onSelectEmployee }: EmployeesTableProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments(name)
        `)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: departments } = useDepartments();

  // Get assignment counts per employee
  const { data: assignmentCounts } = useQuery({
    queryKey: ["assignment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_assignments")
        .select("employee_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((a) => {
        counts[a.employee_id] = (counts[a.employee_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch =
      (emp.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (emp.email || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === "all" || emp.department_id === departmentFilter;
    const matchesStatus = statusFilter === "all" || emp.employee_status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Apps</TableHead>
              <TableHead className="w-[80px]">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees?.map((emp) => (
                <TableRow 
                  key={emp.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectEmployee(emp.id)}
                >
                  <TableCell className="font-medium">{emp.full_name || "-"}</TableCell>
                  <TableCell>{emp.email || "-"}</TableCell>
                  <TableCell>{emp.departments?.name || "-"}</TableCell>
                  <TableCell>{emp.role_title || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        emp.employee_status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : emp.employee_status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                          : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                      }
                    >
                      {emp.employee_status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {assignmentCounts?.[emp.id] || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="w-4 h-4" />
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
