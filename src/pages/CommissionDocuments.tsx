import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, FileText, Eye, Download, FileSpreadsheet, 
  Filter, Calendar, DollarSign, TrendingUp, 
  CheckCircle, Clock, XCircle, X, Wallet, CalendarCheck, Pencil
} from "lucide-react";
import { useCommissionDocuments, type CommissionDocument } from "@/hooks/useCommissionDocuments";
import { formatCurrency } from "@/lib/commissionDocumentCalculations";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfYear } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { commissionDocumentsSteps } from "@/components/tutorial/tutorialSteps";
import { useDraws } from "@/hooks/useDraws";

export default function CommissionDocuments() {
  const navigate = useNavigate();
  const { user, role, isAdmin, isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [paidSearchQuery, setPaidSearchQuery] = useState("");

  const { data: documents, isLoading } = useCommissionDocuments(statusFilter);
  const { data: draws } = useDraws();
  // Fetch team assignments for managers to see only their assigned reps
  const { data: teamAssignments } = useQuery({
    queryKey: ["team-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, manager_id")
        .eq("manager_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isManager && !isAdmin,
  });

  // Get unique sales reps from documents for filter dropdown
  const uniqueSalesReps = useMemo(() => {
    if (!documents) return [];
    const reps = new Map<string, string>();
    documents.forEach(doc => {
      if (doc.sales_rep && !reps.has(doc.sales_rep)) {
        reps.set(doc.sales_rep, doc.sales_rep_id || doc.sales_rep);
      }
    });
    return Array.from(reps.entries()).map(([name, id]) => ({ name, id }));
  }, [documents]);

  // Apply role-based filtering
  const roleFilteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    // Admin/Accounting: Full visibility
    if (isAdmin) return documents;
    
    // Manager: Only see their assigned reps
    if (isManager && teamAssignments) {
      const assignedRepIds = new Set(teamAssignments.map(t => t.id));
      return documents.filter(doc => 
        doc.created_by === user?.id || 
        (doc.sales_rep_id && assignedRepIds.has(doc.sales_rep_id))
      );
    }
    
    // Sales Rep: Only see their own records
    return documents.filter(doc => doc.created_by === user?.id);
  }, [documents, isAdmin, isManager, teamAssignments, user?.id]);

  // Apply additional filters
  const filteredDocuments = useMemo(() => {
    return roleFilteredDocuments.filter(doc => {
      // Search filter
      const matchesSearch = 
        doc.job_name_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sales_rep.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Sales rep filter
      const matchesSalesRep = salesRepFilter === "all" || doc.sales_rep === salesRepFilter;
      
      // Date range filter
      let matchesDateRange = true;
      if (dateFrom || dateTo) {
        const docDate = parseISO(doc.job_date);
        if (dateFrom && dateTo) {
          matchesDateRange = isWithinInterval(docDate, { 
            start: startOfDay(dateFrom), 
            end: endOfDay(dateTo) 
          });
        } else if (dateFrom) {
          matchesDateRange = docDate >= startOfDay(dateFrom);
        } else if (dateTo) {
          matchesDateRange = docDate <= endOfDay(dateTo);
        }
      }
      
      return matchesSearch && matchesSalesRep && matchesDateRange;
    });
  }, [roleFilteredDocuments, searchQuery, salesRepFilter, dateFrom, dateTo]);

  // Paid documents (accounting_approved or paid status)
  const paidDocuments = useMemo(() => {
    return roleFilteredDocuments.filter(doc => 
      doc.status === 'paid' || doc.status === 'accounting_approved'
    ).filter(doc => 
      !paidSearchQuery || 
      doc.job_name_id.toLowerCase().includes(paidSearchQuery.toLowerCase()) ||
      doc.sales_rep.toLowerCase().includes(paidSearchQuery.toLowerCase())
    );
  }, [roleFilteredDocuments, paidSearchQuery]);

  // Paid documents statistics
  const paidStats = useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    
    const totalCount = paidDocuments.length;
    const totalCommission = paidDocuments.reduce((sum, d) => sum + (d.rep_commission || 0), 0);
    
    const ytdDocs = paidDocuments.filter(doc => {
      const paidDate = doc.paid_at || doc.accounting_approved_at;
      if (!paidDate) return false;
      return parseISO(paidDate) >= yearStart;
    });
    const ytdEarnings = ytdDocs.reduce((sum, d) => sum + (d.rep_commission || 0), 0);
    
    return { totalCount, totalCommission, ytdEarnings };
  }, [paidDocuments]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = filteredDocuments.length;
    const pending = filteredDocuments.filter(d => d.status === 'submitted').length;
    const approved = filteredDocuments.filter(d => d.status === 'approved').length;
    const totalCommission = filteredDocuments
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + (d.rep_commission || 0), 0);
    const totalProfit = filteredDocuments
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + (d.net_profit || 0), 0);
    
    return { total, pending, approved, totalCommission, totalProfit };
  }, [filteredDocuments]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      approved: "outline",
      rejected: "destructive",
      paid: "outline",
      accounting_approved: "outline",
      manager_approved: "default",
    };
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
      draft: 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500',
      approved: 'bg-green-100 text-green-800 border-green-300',
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      accounting_approved: 'bg-green-100 text-green-800 border-green-300',
      manager_approved: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return (
      <Badge 
        variant={variants[status] || "secondary"} 
        className={`gap-1 ${colors[status] || ''}`}
      >
        {icons[status]}
        <span className="hidden sm:inline">{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </Badge>
    );
  };

  // Export to CSV — includes draw activity
  const exportToCSV = (docs: CommissionDocument[], filename: string) => {
    try {
      const headers = [
        "Job Name / ID",
        "Job Date",
        "Sales Rep",
        "Status",
        "Gross Contract",
        "Net Profit",
        "Commission Rate",
        "Rep Commission",
        "Date Submitted",
        "Date Approved",
        "Paid Date",
      ];
      
      const rows = docs.map(doc => [
        `"${doc.job_name_id.replace(/"/g, '""')}"`,
        doc.job_date ? format(parseISO(doc.job_date), "MM/dd/yyyy") : "",
        `"${doc.sales_rep.replace(/"/g, '""')}"`,
        doc.status,
        doc.gross_contract_total.toFixed(2),
        doc.net_profit.toFixed(2),
        `${doc.commission_rate}%`,
        doc.rep_commission.toFixed(2),
        format(parseISO(doc.created_at), "MM/dd/yyyy"),
        doc.approved_at ? format(parseISO(doc.approved_at), "MM/dd/yyyy") : "",
        doc.paid_at ? format(parseISO(doc.paid_at), "MM/dd/yyyy") : "",
      ]);

      // Add summary
      const totalCommission = docs.reduce((sum, d) => sum + (d.rep_commission || 0), 0);
      rows.push([]);
      rows.push(["SUMMARY"]);
      rows.push(["Total Records", docs.length.toString()]);
      rows.push(["Total Commission", `$${totalCommission.toFixed(2)}`]);

      // Add draw activity section
      if (draws && draws.length > 0) {
        rows.push([]);
        rows.push(["DRAW ACTIVITY"]);
        rows.push(["Status", "Amount", "Remaining Balance", "Requested", "Approved"]);
        draws.forEach(d => {
          rows.push([
            d.status,
            (d.amount || 0).toFixed(2),
            (d.remaining_balance || 0).toFixed(2),
            d.requested_at ? format(parseISO(d.requested_at), "MM/dd/yyyy") : "",
            d.approved_at ? format(parseISO(d.approved_at), "MM/dd/yyyy") : "",
          ]);
        });
      }

      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    }
  };

  // Export to PDF — TSM branding + draw activity
  const exportToPDF = (docs: CommissionDocument[], title: string, filename: string) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // TSM Roof Pro branding
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("TSM Roof Pro", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      // Title
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text(title, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 6;

      // Date
      pdf.setFontSize(10);
      pdf.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 12;

      // Summary section
      const totalSubmitted = docs.length;
      const totalApproved = docs.filter(d => ['approved', 'accounting_approved', 'paid'].includes(d.status)).length;
      const totalPaid = docs.filter(d => d.status === 'paid').length;
      const totalCommission = docs.reduce((sum, d) => sum + (d.rep_commission || 0), 0);
      const totalDrawBalance = draws?.reduce((sum, d) => sum + (d.remaining_balance || 0), 0) || 0;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Summary", 14, yPosition);
      yPosition += 7;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const summaryLines = [
        `Total Submitted: ${totalSubmitted}`,
        `Total Approved: ${totalApproved}`,
        `Total Paid: ${totalPaid}`,
        `Total Commission: ${formatCurrency(totalCommission)}`,
        `Outstanding Draw Balance: ${formatCurrency(totalDrawBalance)}`,
      ];
      
      summaryLines.forEach(line => {
        pdf.text(line, 14, yPosition);
        yPosition += 5;
      });
      yPosition += 8;

      // Table header
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      const headers = ["Job Name", "Sales Rep", "Status", "Commission", "Date"];
      const colWidths = [50, 40, 30, 30, 30];
      let xPos = 14;
      
      headers.forEach((header, i) => {
        pdf.text(header, xPos, yPosition);
        xPos += colWidths[i];
      });
      yPosition += 6;

      // Table rows
      pdf.setFont("helvetica", "normal");
      docs.slice(0, 40).forEach((item) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        
        xPos = 14;
        const paidDate = item.paid_at || item.accounting_approved_at;
        const rowData = [
          item.job_name_id.substring(0, 25),
          item.sales_rep.substring(0, 20),
          item.status.replace(/_/g, ' '),
          formatCurrency(item.rep_commission),
          paidDate ? format(parseISO(paidDate), 'MM/dd/yyyy') : '-',
        ];
        
        rowData.forEach((cell, i) => {
          pdf.text(cell, xPos, yPosition);
          xPos += colWidths[i];
        });
        yPosition += 5;
      });

      if (docs.length > 40) {
        yPosition += 5;
        pdf.text(`... and ${docs.length - 40} more records`, 14, yPosition);
      }

      // Draw activity section
      if (draws && draws.length > 0) {
        if (yPosition > 240) { pdf.addPage(); yPosition = 20; }
        yPosition += 10;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text("Draw Activity", 14, yPosition);
        yPosition += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        draws.forEach(d => {
          if (yPosition > 270) { pdf.addPage(); yPosition = 20; }
          pdf.text(
            `${d.status.toUpperCase()} — Amount: ${formatCurrency(d.amount)} | Balance: ${formatCurrency(d.remaining_balance)}`,
            14, yPosition
          );
          yPosition += 5;
        });
      }

      pdf.save(`${filename}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSalesRepFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || salesRepFilter !== "all" || dateFrom || dateTo;
  const activeFilterCount = [
    statusFilter !== "all",
    salesRepFilter !== "all",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  // Mobile card component for documents
  const DocumentCard = ({ doc }: { doc: CommissionDocument }) => (
    <div className="w-full text-left p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all">
      <button
        onClick={() => navigate(doc.status === 'draft' ? `/commission-documents/${doc.id}?edit=true` : `/commission-documents/${doc.id}`)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-medium text-foreground truncate flex-1">{doc.job_name_id}</div>
          {getStatusBadge(doc.status)}
        </div>
        <div className="text-sm text-muted-foreground mb-2">{doc.sales_rep}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Gross:</span>
            <span className="ml-1 font-mono">{formatCurrency(doc.gross_contract_total)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Commission:</span>
            <span className="ml-1 font-mono font-semibold text-green-600">{formatCurrency(doc.rep_commission)}</span>
          </div>
        </div>
        {doc.job_date && (
          <div className="text-xs text-muted-foreground mt-2">
            {format(parseISO(doc.job_date), 'MMM d, yyyy')}
          </div>
        )}
      </button>
      {doc.status === 'draft' && doc.created_by === user?.id && (
        <Button
          size="sm"
          className="mt-3 w-full gap-2"
          onClick={(e) => { e.stopPropagation(); navigate(`/commission-documents/${doc.id}?edit=true`); }}
        >
          Continue Draft
        </Button>
      )}
    </div>
  );

  // Paid document card for mobile
  const PaidDocumentCard = ({ doc }: { doc: CommissionDocument }) => {
    const paidDate = doc.paid_at || doc.accounting_approved_at;
    return (
      <button
        onClick={() => navigate(`/commission-documents/${doc.id}`)}
        className="w-full text-left p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-medium text-foreground truncate flex-1">{doc.job_name_id}</div>
          {getStatusBadge(doc.status)}
        </div>
        <div className="text-sm text-muted-foreground mb-2">{doc.sales_rep}</div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Commission:</span>
            <span className="ml-1 font-mono font-semibold text-emerald-600">{formatCurrency(doc.rep_commission)}</span>
          </div>
          {paidDate && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" />
              {format(parseISO(paidDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </button>
    );
  };

  // Filter content for both mobile sheet and desktop
  const FilterContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`space-y-4 ${isMobile ? '' : 'flex flex-col sm:flex-row gap-4'}`}>
      {/* Status Filter */}
      <div className="space-y-1" data-tutorial="cd-status-filter">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Rep Filter */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Sales Rep</label>
        <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sales Rep" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Reps</SelectItem>
            {uniqueSalesReps.map(rep => (
              <SelectItem key={rep.name} value={rep.name}>
                {rep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">From Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Calendar className="h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">To Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Calendar className="h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "End Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {hasActiveFilters && (
        <div className={isMobile ? 'pt-2' : 'flex items-end'}>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Commission Documents</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin 
                ? "View and manage all commission documents" 
                : isManager 
                  ? "View commission documents for your team"
                  : "View your commission documents"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate('/commissions/new')} data-tutorial="cd-new-document">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Document</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All Documents
            </TabsTrigger>
            <TabsTrigger value="paid" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Paid Commissions
            </TabsTrigger>
          </TabsList>

          {/* All Documents Tab */}
          <TabsContent value="all" className="space-y-4">
            {/* Summary Cards - Mobile: 2x2 grid, Desktop: 4 columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">Total Docs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">Pending</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pending}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">Net Profit</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">Commission</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-lg sm:text-2xl font-bold text-primary">{formatCurrency(stats.totalCommission)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col gap-3">
                  {/* Search + Filter Button (Mobile) */}
                  <div className="flex gap-2">
                     <div className="relative flex-1" data-tutorial="cd-search">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Mobile Filter Button */}
                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="sm:hidden relative">
                          <Filter className="h-4 w-4" />
                          {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                              {activeFilterCount}
                            </span>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
                        <SheetHeader className="mb-4">
                          <SheetTitle>Filters</SheetTitle>
                        </SheetHeader>
                        <FilterContent isMobile />
                      </SheetContent>
                    </Sheet>

                    {/* Export dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" data-tutorial="cd-export">
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportToCSV(filteredDocuments, 'commission-documents')} className="gap-2 cursor-pointer">
                          <FileSpreadsheet className="h-4 w-4" />
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportToPDF(filteredDocuments, 'Commission Documents Report', 'commission-documents')} className="gap-2 cursor-pointer">
                          <FileText className="h-4 w-4" />
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Desktop Filters - Hidden on Mobile */}
                  <div className="hidden sm:block">
                    <FilterContent />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredDocuments?.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No commission documents found</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Clear filters
                      </Button>
                    )}
                    {!hasActiveFilters && (
                      <Button variant="outline" className="mt-4" onClick={() => navigate('/commissions/new')}>
                        Create your first document
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                      {filteredDocuments?.map((doc) => (
                        <DocumentCard key={doc.id} doc={doc} />
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto" data-tutorial="cd-documents-table">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Job Name & ID</TableHead>
                            <TableHead>Job Date</TableHead>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead className="text-right">Gross Contract</TableHead>
                            <TableHead className="text-right">Net Profit</TableHead>
                            <TableHead className="text-right">Rep Commission</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDocuments?.map((doc) => (
                            <TableRow 
                              key={doc.id} 
                              className="cursor-pointer hover:bg-muted/50" 
                              onClick={() => navigate(`/commission-documents/${doc.id}`)}
                            >
                              <TableCell className="font-medium">{doc.job_name_id}</TableCell>
                              <TableCell>{doc.job_date ? format(parseISO(doc.job_date), 'MM/dd/yyyy') : '-'}</TableCell>
                              <TableCell>{doc.sales_rep}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(doc.gross_contract_total)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(doc.net_profit)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold text-green-600">
                                {formatCurrency(doc.rep_commission)}
                              </TableCell>
                              <TableCell>{getStatusBadge(doc.status)}</TableCell>
                              <TableCell className="text-right">
                                {doc.status === 'draft' && doc.created_by === user?.id ? (
                                  <Button 
                                    size="sm" 
                                    className="gap-1.5"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      navigate(`/commission-documents/${doc.id}?edit=true`); 
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Continue Draft
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      navigate(`/commission-documents/${doc.id}`); 
                                    }}
                                  >
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paid Commissions Tab */}
          <TabsContent value="paid" className="space-y-4">
            {/* Paid Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">Total Paid</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-xl sm:text-2xl font-bold">{paidStats.totalCount}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">Total Earned</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600">{formatCurrency(paidStats.totalCommission)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-1 pt-3 px-3 sm:pb-2 sm:pt-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">YTD Earnings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-4">
                  <div className="text-lg sm:text-2xl font-bold text-primary">{formatCurrency(paidStats.ytdEarnings)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Export for Paid Tab */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search paid commissions..."
                      value={paidSearchQuery}
                      onChange={(e) => setPaidSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Export dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportToCSV(paidDocuments, 'paid-commissions')} className="gap-2 cursor-pointer">
                        <FileSpreadsheet className="h-4 w-4" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToPDF(paidDocuments, 'Paid Commissions Report', 'paid-commissions')} className="gap-2 cursor-pointer">
                        <FileText className="h-4 w-4" />
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : paidDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No paid commissions found</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                      {paidDocuments.map((doc) => (
                        <PaidDocumentCard key={doc.id} doc={doc} />
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Job Name & ID</TableHead>
                            <TableHead>Job Date</TableHead>
                            <TableHead>Sales Rep</TableHead>
                            <TableHead className="text-right">Rep Commission</TableHead>
                            <TableHead>Paid Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paidDocuments.map((doc) => {
                            const paidDate = doc.paid_at || doc.accounting_approved_at;
                            return (
                              <TableRow 
                                key={doc.id} 
                                className="cursor-pointer hover:bg-muted/50" 
                                onClick={() => navigate(`/commission-documents/${doc.id}`)}
                              >
                                <TableCell className="font-medium">{doc.job_name_id}</TableCell>
                                <TableCell>{doc.job_date ? format(parseISO(doc.job_date), 'MM/dd/yyyy') : '-'}</TableCell>
                                <TableCell>{doc.sales_rep}</TableCell>
                                <TableCell className="text-right font-mono font-semibold text-emerald-600">
                                  {formatCurrency(doc.rep_commission)}
                                </TableCell>
                                <TableCell>
                                  {paidDate ? format(parseISO(paidDate), 'MMM d, yyyy') : '-'}
                                </TableCell>
                                <TableCell>{getStatusBadge(doc.status)}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      navigate(`/commission-documents/${doc.id}`); 
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <GuidedTour pageName="commission-documents" pageTitle="Commission Documents" steps={commissionDocumentsSteps} />
    </AppLayout>
  );
}
