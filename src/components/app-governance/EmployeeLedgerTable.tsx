import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { format } from "date-fns";

interface EmployeeLedgerTableProps {
  onSelectEmployee: (employeeId: string) => void;
}

export function EmployeeLedgerTable({ onSelectEmployee }: EmployeeLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role_title,
          employee_status,
          start_date,
          end_date,
          departments (name)
        `)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: assignmentCounts } = useQuery({
    queryKey: ["assignment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_assignments")
        .select("employee_id")
        .is("end_date", null);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(a => {
        counts[a.employee_id] = (counts[a.employee_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredEmployees = employees?.filter(e => 
    e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Apps Assigned</TableHead>
            <TableHead>Start Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmployees?.map((employee) => (
            <TableRow 
              key={employee.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectEmployee(employee.id)}
            >
              <TableCell>
                <div>
                  <div className="font-medium">{employee.full_name || "No name"}</div>
                  <div className="text-sm text-muted-foreground">{employee.email}</div>
                </div>
              </TableCell>
              <TableCell>
                {(employee.departments as any)?.name || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                {employee.role_title || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={employee.employee_status === "active" ? "default" : "secondary"}
                  className={employee.employee_status === "inactive" ? "bg-red-500/20 text-red-400" : ""}
                >
                  {employee.employee_status || "active"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{assignmentCounts?.[employee.id] || 0}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {employee.start_date 
                  ? format(new Date(employee.start_date), "MMM d, yyyy")
                  : "—"
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
