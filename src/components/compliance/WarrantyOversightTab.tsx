import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, AlertTriangle, Clock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

export function WarrantyOversightTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: warranties, isLoading } = useQuery({
    queryKey: ["compliance-warranty-oversight"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranty_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let items = warranties || [];
    if (statusFilter !== "all") items = items.filter(w => w.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(w =>
        w.customer_name?.toLowerCase().includes(q) ||
        w.job_address?.toLowerCase().includes(q) ||
        w.warranty_type?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [warranties, statusFilter, searchQuery]);

  const overdue14 = useMemo(() => {
    return (warranties || []).filter(w => {
      if (w.status === "completed" || w.status === "cancelled" || w.status === "closed") return false;
      return differenceInDays(new Date(), new Date(w.created_at)) > 14;
    }).length;
  }, [warranties]);

  const overdue30 = useMemo(() => {
    return (warranties || []).filter(w => {
      if (w.status === "completed" || w.status === "cancelled" || w.status === "closed") return false;
      return differenceInDays(new Date(), new Date(w.created_at)) > 30;
    }).length;
  }, [warranties]);

  const exportCSV = () => {
    const headers = ["Customer", "Address", "Status", "Type", "Created", "Age (days)"];
    const rows = filtered.map(w => [
      w.customer_name || "N/A",
      w.job_address || "N/A",
      w.status,
      w.warranty_type || "standard",
      format(parseISO(w.created_at), "yyyy-MM-dd"),
      differenceInDays(new Date(), new Date(w.created_at)),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `warranty-oversight-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported warranty oversight report");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{warranties?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total Warranties</p>
          </CardContent>
        </Card>
        <Card className={overdue14 > 0 ? "border-amber-300" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{overdue14}</p>
            <p className="text-xs text-muted-foreground">Open 14+ Days</p>
          </CardContent>
        </Card>
        <Card className={overdue30 > 0 ? "border-red-300" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{overdue30}</p>
            <p className="text-xs text-muted-foreground">Open 30+ Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {(warranties || []).filter(w => w.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search warranties..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No warranties found</TableCell></TableRow>
              ) : (
                filtered.slice(0, 50).map(w => {
                  const ageDays = differenceInDays(new Date(), new Date(w.created_at));
                  const isOverdue14 = ageDays > 14 && w.status !== "completed" && w.status !== "cancelled";
                  const isOverdue30 = ageDays > 30 && w.status !== "completed" && w.status !== "cancelled";
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.customer_name || "N/A"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{w.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{w.warranty_type || "standard"}</Badge></TableCell>
                      <TableCell className="text-sm">{ageDays}d</TableCell>
                      <TableCell>
                        {isOverdue30 ? (
                          <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />30d+</Badge>
                        ) : isOverdue14 ? (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 gap-1"><Clock className="h-3 w-3" />14d+</Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}