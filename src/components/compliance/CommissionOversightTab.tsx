import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Search, Flag, AlertTriangle, Clock, Download, Eye, ShieldAlert, AlertCircle, FileText 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { formatDisplayName } from "@/lib/displayName";
import { useAuth } from "@/contexts/AuthContext";

export function CommissionOversightTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [flagNotes, setFlagNotes] = useState("");

  // Fetch all commissions for oversight
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["compliance-commission-oversight"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch commission documents too
  const { data: commissionDocs } = useQuery({
    queryKey: ["compliance-commission-docs-oversight"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let items = commissions || [];
    if (statusFilter !== "all") {
      items = items.filter(c => c.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c =>
        c.job_name?.toLowerCase().includes(q) ||
        c.sales_rep_name?.toLowerCase().includes(q) ||
        c.job_address?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [commissions, statusFilter, searchQuery]);

  // Flag indicators
  const stalePending = useMemo(() => {
    return (commissions || []).filter(c => {
      if (c.status !== "pending_review") return false;
      return differenceInHours(new Date(), new Date(c.created_at)) > 48;
    }).length;
  }, [commissions]);

  const multiDenied = useMemo(() => {
    return (commissions || []).filter(c => (c.revision_count || 0) > 1).length;
  }, [commissions]);

  const handleFlag = async () => {
    if (!selectedCommission || !flagNotes.trim()) return;
    try {
      await supabase.from("compliance_audit_log").insert({
        action: "commission_flagged",
        actor_user_id: user?.id,
        target_type: "commission",
        target_id: selectedCommission.id,
        metadata: { notes: flagNotes, job_name: selectedCommission.job_name },
      });
      toast.success("Commission flagged for compliance review");
      setFlagModalOpen(false);
      setFlagNotes("");
      setSelectedCommission(null);
    } catch (e: any) {
      toast.error("Failed to flag commission: " + e.message);
    }
  };

  const exportCSV = () => {
    const headers = ["Job Name", "Rep", "Status", "Amount", "Created", "Revision Count"];
    const rows = filtered.map(c => [
      c.job_name,
      formatDisplayName(c.sales_rep_name) || "N/A",
      c.status,
      (c.net_commission_owed || 0).toFixed(2),
      format(parseISO(c.created_at), "yyyy-MM-dd"),
      c.revision_count || 0,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-oversight-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported commission oversight report");
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{commissions?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total Commissions</p>
          </CardContent>
        </Card>
        <Card className={stalePending > 0 ? "border-amber-300" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stalePending}</p>
            <p className="text-xs text-muted-foreground">Pending 48h+</p>
          </CardContent>
        </Card>
        <Card className={multiDenied > 0 ? "border-red-300" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{multiDenied}</p>
            <p className="text-xs text-muted-foreground">Multi-Revision</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{commissionDocs?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Doc Worksheets</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs, reps..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No commissions found</TableCell></TableRow>
              ) : (
                filtered.slice(0, 50).map(c => {
                  const isStale = c.status === "pending_review" && differenceInHours(new Date(), new Date(c.created_at)) > 48;
                  const isMultiRevision = (c.revision_count || 0) > 1;
                  const wasRejected = c.was_rejected === true;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{c.job_name}</TableCell>
                      <TableCell className="text-sm">{formatDisplayName(c.sales_rep_name) || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "denied" ? "destructive" : c.status === "paid" ? "outline" : "secondary"} className="text-xs">
                          {c.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(c.net_commission_owed || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {wasRejected && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-400"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                          {isStale && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />48h+</Badge>}
                          {isMultiRevision && <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300"><AlertTriangle className="h-3 w-3 mr-1" />Rev×{c.revision_count}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedCommission(c); setFlagModalOpen(true); }}>
                          <Flag className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {commissionDocs && commissionDocs.filter((d: any) => ["submitted", "manager_approved"].includes(d.status)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Commission Documents — Pending Review
            </CardTitle>
            <CardDescription>
              Employee commission worksheets awaiting compliance or accounting review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionDocs
                  .filter((d: any) => ["submitted", "manager_approved"].includes(d.status))
                  .slice(0, 25)
                  .map((d: any) => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/commission-documents/${d.id}`)}>
                      <TableCell className="font-medium">{d.job_name_id}</TableCell>
                      <TableCell>{d.sales_rep}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{d.status?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(d.rep_commission || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/commission-documents/${d.id}`); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Flag Modal */}
      <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Flag Commission for Compliance
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Flagging: <strong>{selectedCommission?.job_name}</strong>
          </p>
          <Textarea
            placeholder="Describe the compliance concern..."
            value={flagNotes}
            onChange={e => setFlagNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagModalOpen(false)}>Cancel</Button>
            <Button onClick={handleFlag} disabled={!flagNotes.trim()} className="bg-amber-600 hover:bg-amber-700">
              Flag for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}