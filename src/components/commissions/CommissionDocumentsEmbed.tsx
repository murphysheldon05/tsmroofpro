import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileText, Eye, Clock, CheckCircle, XCircle, Wallet, DollarSign, TrendingUp, Pencil } from "lucide-react";
import { useCommissionDocuments, type CommissionDocument } from "@/hooks/useCommissionDocuments";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function CommissionDocumentsEmbed() {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: documents, isLoading } = useCommissionDocuments("all");

  const filtered = useMemo(() => {
    let docs = documents || [];
    // Non-admin/manager: only own docs
    if (!isAdmin && !isManager) {
      docs = docs.filter((d) => d.created_by === user?.id);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.job_name_id.toLowerCase().includes(q) ||
          d.sales_rep.toLowerCase().includes(q)
      );
    }
    return docs;
  }, [documents, searchQuery, isAdmin, isManager, user?.id]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((d) => d.status === "submitted").length,
    totalCommission: filtered
      .filter((d) => d.status === "approved" || d.status === "paid" || d.status === "accounting_approved")
      .reduce((s, d) => s + (d.rep_commission || 0), 0),
  }), [filtered]);

  const getStatusBadge = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      draft: <FileText className="h-3 w-3" />,
      submitted: <Clock className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
      paid: <Wallet className="h-3 w-3" />,
      accounting_approved: <CheckCircle className="h-3 w-3" />,
      manager_approved: <CheckCircle className="h-3 w-3" />,
    };
    const colors: Record<string, string> = {
      approved: "bg-green-100 text-green-800 border-green-300",
      paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
      accounting_approved: "bg-green-100 text-green-800 border-green-300",
      manager_approved: "bg-blue-100 text-blue-800 border-blue-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      submitted: "bg-amber-100 text-amber-800 border-amber-300",
      draft: "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500",
    };
    return (
      <Badge variant="outline" className={`gap-1 ${colors[status] || ""}`}>
        {icons[status]}
        <span className="hidden sm:inline">{status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Total Docs</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Pending</div>
            <div className="text-xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">Commission</div>
            <div className="text-lg font-bold text-primary">{formatCurrency(stats.totalCommission)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button size="sm" onClick={() => navigate("/commission-documents/new")} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No commission documents found</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="w-full text-left p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-all"
              >
                <button
                  onClick={() => navigate(doc.status === 'draft' ? `/commission-documents/${doc.id}?edit=true` : `/commission-documents/${doc.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium truncate flex-1">{doc.job_name_id}</div>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">{doc.sales_rep}</div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="font-mono text-green-600">{formatCurrency(doc.rep_commission)}</span>
                    <span className="text-xs text-muted-foreground">{doc.job_date ? format(parseISO(doc.job_date), "MMM d, yyyy") : "—"}</span>
                  </div>
                </button>
                {doc.status === 'draft' && doc.created_by === user?.id && (
                  <Button
                    size="sm"
                    className="mt-3 w-full gap-2"
                    onClick={() => navigate(`/commission-documents/${doc.id}?edit=true`)}
                  >
                    <Pencil className="h-4 w-4" />
                    Continue Draft
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Job Name & ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(doc.status === 'draft' ? `/commission-documents/${doc.id}?edit=true` : `/commission-documents/${doc.id}`)}>
                    <TableCell className="font-medium">{doc.job_name_id}</TableCell>
                    <TableCell>{doc.job_date ? format(parseISO(doc.job_date), "MM/dd/yyyy") : "—"}</TableCell>
                    <TableCell>{doc.sales_rep}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">{formatCurrency(doc.rep_commission)}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-right">
                      {doc.status === 'draft' && doc.created_by === user?.id ? (
                        <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); navigate(`/commission-documents/${doc.id}?edit=true`); }}>
                          <Pencil className="h-4 w-4" />
                          Continue Draft
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/commission-documents/${doc.id}`); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
