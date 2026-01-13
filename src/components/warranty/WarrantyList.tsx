import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  useWarranties,
  useDeleteWarranty,
  WarrantyRequest,
  WARRANTY_STATUSES,
  PRIORITY_LEVELS,
  ROOF_TYPES,
} from "@/hooks/useWarranties";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Trash2, Eye, Filter, X } from "lucide-react";
import { format, parseISO, isAfter, isBefore, differenceInDays } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WarrantyListProps {
  onEdit: (warranty: WarrantyRequest) => void;
  onView: (warranty: WarrantyRequest) => void;
}

export function WarrantyList({ onEdit, onView }: WarrantyListProps) {
  const { data: warranties = [], isLoading } = useWarranties();
  const deleteMutation = useDeleteWarranty();
  const { role } = useAuth();
  const canDelete = role === "admin";

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [roofTypeFilter, setRoofTypeFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Fetch production members for filter
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const profilesMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {
      map[p.id] = p.full_name || "Unknown";
    });
    return map;
  }, [profiles]);

  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (priorityFilter !== "all" && w.priority_level !== priorityFilter) return false;
      if (roofTypeFilter !== "all" && w.roof_type !== roofTypeFilter) return false;
      if (memberFilter !== "all" && w.assigned_production_member !== memberFilter) return false;
      
      if (dateFrom) {
        const fromDate = parseISO(dateFrom);
        const submitDate = parseISO(w.date_submitted);
        if (isBefore(submitDate, fromDate)) return false;
      }
      
      if (dateTo) {
        const toDate = parseISO(dateTo);
        const submitDate = parseISO(w.date_submitted);
        if (isAfter(submitDate, toDate)) return false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        const matches =
          w.customer_name.toLowerCase().includes(searchLower) ||
          w.job_address.toLowerCase().includes(searchLower) ||
          w.original_job_number.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      return true;
    });
  }, [warranties, statusFilter, priorityFilter, roofTypeFilter, memberFilter, dateFrom, dateTo, search]);

  const clearFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setRoofTypeFilter("all");
    setMemberFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = WARRANTY_STATUSES.find((s) => s.value === status);
    return <Badge className={statusConfig?.color || ""}>{statusConfig?.label || status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = PRIORITY_LEVELS.find((p) => p.value === priority);
    return <Badge className={priorityConfig?.color || ""}>{priorityConfig?.label || priority}</Badge>;
  };

  const isOverdue = (warranty: WarrantyRequest) => {
    if (warranty.status === "completed" || warranty.status === "denied") return false;
    const lastChange = parseISO(warranty.last_status_change_at);
    return differenceInDays(new Date(), lastChange) >= 7;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading warranties...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search customer, address, or job #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        {(statusFilter !== "all" || priorityFilter !== "all" || roofTypeFilter !== "all" || memberFilter !== "all" || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <label className="text-xs font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {WARRANTY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Priority</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_LEVELS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Roof Type</label>
            <Select value={roofTypeFilter} onValueChange={setRoofTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ROOF_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Production Member</label>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DatePickerField
            label="From Date"
            value={dateFrom}
            onChange={setDateFrom}
            className="space-y-1"
          />
          <DatePickerField
            label="To Date"
            value={dateTo}
            onChange={setDateTo}
            className="space-y-1"
          />
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredWarranties.length} of {warranties.length} warranties
      </p>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWarranties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No warranty requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredWarranties.map((warranty) => (
                <TableRow
                  key={warranty.id}
                  className={isOverdue(warranty) ? "bg-destructive/5" : ""}
                >
                  <TableCell className="font-medium">
                    {warranty.customer_name}
                    {isOverdue(warranty) && (
                      <Badge variant="destructive" className="ml-2 text-xs">OVERDUE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{warranty.job_address}</TableCell>
                  <TableCell>{warranty.original_job_number}</TableCell>
                  <TableCell>{getStatusBadge(warranty.status)}</TableCell>
                  <TableCell>{getPriorityBadge(warranty.priority_level)}</TableCell>
                  <TableCell>
                    {warranty.assigned_production_member
                      ? profilesMap[warranty.assigned_production_member] || "Unknown"
                      : <span className="text-muted-foreground">Unassigned</span>}
                  </TableCell>
                  <TableCell>{format(parseISO(warranty.date_submitted), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView(warranty)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(warranty)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(warranty.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warranty Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this warranty request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
