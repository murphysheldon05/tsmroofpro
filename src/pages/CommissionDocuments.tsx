import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Plus, Search, FileText, Eye, Download, FileSpreadsheet, 
  Filter, Calendar, DollarSign, TrendingUp, Users, BarChart3,
  CheckCircle, Clock, XCircle
} from "lucide-react";
import { useCommissionDocuments, type CommissionDocument } from "@/hooks/useCommissionDocuments";
import { formatCurrency } from "@/lib/commissionDocumentCalculations";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function CommissionDocuments() {
  const navigate = useNavigate();
  const { user, role, isAdmin, isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data: documents, isLoading } = useCommissionDocuments(statusFilter);

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
    };
    const icons: Record<string, React.ReactNode> = {
      draft: <FileText className="h-3 w-3" />,
      submitted: <Clock className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
    };
    return (
      <Badge 
        variant={variants[status] || "secondary"} 
        className={`gap-1 ${status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' : ''}`}
      >
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Export to CSV
  const exportToCSV = () => {
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
      ];
      
      const rows = filteredDocuments.map(doc => [
        `"${doc.job_name_id.replace(/"/g, '""')}"`,
        doc.job_date ? format(parseISO(doc.job_date), "yyyy-MM-dd") : "",
        `"${doc.sales_rep.replace(/"/g, '""')}"`,
        doc.status,
        doc.gross_contract_total.toFixed(2),
        doc.net_profit.toFixed(2),
        `${doc.commission_rate}%`,
        doc.rep_commission.toFixed(2),
        format(parseISO(doc.created_at), "yyyy-MM-dd"),
        doc.approved_at ? format(parseISO(doc.approved_at), "yyyy-MM-dd") : "",
      ]);

      // Add summary
      rows.push([]);
      rows.push(["SUMMARY"]);
      rows.push(["Total Records", stats.total.toString()]);
      rows.push(["Total Commission (Approved)", stats.totalCommission.toFixed(2)]);
      rows.push(["Total Net Profit (Approved)", stats.totalProfit.toFixed(2)]);

      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `commission-documents-${format(new Date(), "yyyy-MM-dd")}.csv`;
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

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Commission Documents Report", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      // Subtitle with date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Summary
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const summaryLines = [
        `Total Records: ${stats.total}`,
        `Pending: ${stats.pending}`,
        `Approved: ${stats.approved}`,
        `Total Commission (Approved): ${formatCurrency(stats.totalCommission)}`,
        `Total Net Profit (Approved): ${formatCurrency(stats.totalProfit)}`,
      ];
      
      summaryLines.forEach(line => {
        doc.text(line, 14, yPosition);
        yPosition += 5;
      });
      yPosition += 10;

      // Table header
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const headers = ["Job Name", "Sales Rep", "Status", "Net Profit", "Commission"];
      const colWidths = [50, 40, 30, 30, 30];
      let xPos = 14;
      
      headers.forEach((header, i) => {
        doc.text(header, xPos, yPosition);
        xPos += colWidths[i];
      });
      yPosition += 6;

      // Table rows
      doc.setFont("helvetica", "normal");
      filteredDocuments.slice(0, 30).forEach((item) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        xPos = 14;
        const rowData = [
          item.job_name_id.substring(0, 25),
          item.sales_rep.substring(0, 20),
          item.status,
          formatCurrency(item.net_profit),
          formatCurrency(item.rep_commission),
        ];
        
        rowData.forEach((cell, i) => {
          doc.text(cell, xPos, yPosition);
          xPos += colWidths[i];
        });
        yPosition += 5;
      });

      if (filteredDocuments.length > 30) {
        yPosition += 5;
        doc.text(`... and ${filteredDocuments.length - 30} more records`, 14, yPosition);
      }

      doc.save(`commission-documents-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Commission Documents</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "View and manage all commission documents" 
                : isManager 
                  ? "View commission documents for your team"
                  : "View your commission documents"}
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate('/commissions/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Approved Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalCommission)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Job Name or Sales Rep..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
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

                {/* Sales Rep Filter */}
                <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
                  <SelectTrigger className="w-[180px]">
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

              {/* Date Range Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">From:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 w-[140px] justify-start">
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
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">To:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 w-[140px] justify-start">
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
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
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
              <div className="overflow-x-auto">
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
