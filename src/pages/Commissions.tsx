import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  FileSpreadsheet, 
  Users, 
  Search, 
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { useCommissionSubmissions, useIsCommissionReviewer } from "@/hooks/useCommissions";
import { CommissionTracker } from "@/components/commissions/CommissionTracker";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useUserHoldsCheck } from "@/hooks/useComplianceHoldCheck";
import { HoldWarningBanner } from "@/components/compliance/HoldWarningBanner";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending_review: { label: "Pending Review", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  revision_required: { label: "Revision Required", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  denied: { label: "Denied", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  paid: { label: "Paid", variant: "outline", icon: <DollarSign className="h-3 w-3" /> },
};

export default function Commissions() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: submissions, isLoading } = useCommissionSubmissions();
  const { data: isReviewer } = useIsCommissionReviewer();
  const { data: userHolds } = useUserHoldsCheck();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canSubmit = isAdmin || isManager; // Sales reps, sales managers, production managers
  
  // Filter for commission-relevant holds
  const commissionHolds = userHolds?.filter(h => h.hold_type === "commission_hold") || [];

  const filteredSubmissions = submissions?.filter((submission) => {
    const matchesSearch = 
      submission.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.job_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.sales_rep_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.subcontractor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const summaryStats = {
    total: submissions?.length || 0,
    pending: submissions?.filter((s) => s.status === "pending_review").length || 0,
    approved: submissions?.filter((s) => s.status === "approved").length || 0,
    paid: submissions?.filter((s) => s.status === "paid").length || 0,
    totalOwed: submissions?.reduce((sum, s) => {
      if (s.status !== "paid" && s.status !== "denied") {
        return sum + (s.net_commission_owed || 0);
      }
      return sum;
    }, 0) || 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Hold Warning Banner */}
        <HoldWarningBanner holds={commissionHolds} context="commission" />

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Commission Management</h1>
            <p className="text-muted-foreground">
              Submit, track, and manage sales commissions
            </p>
          </div>
          
          {canSubmit && (
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate("/commissions/new")} 
                className="gap-2"
                disabled={commissionHolds.length > 0}
                title={commissionHolds.length > 0 ? "Blocked by active commission hold" : ""}
              >
                <Plus className="h-4 w-4" />
                New Commission
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/commissions/new?type=subcontractor")}
                className="gap-2"
                disabled={commissionHolds.length > 0}
                title={commissionHolds.length > 0 ? "Blocked by active commission hold" : ""}
              >
                <Users className="h-4 w-4" />
                Subcontractor
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{summaryStats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved for Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryStats.approved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Commission Owed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(summaryStats.totalOwed)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                All Commissions
              </TabsTrigger>
              {isReviewer && (
                <TabsTrigger value="tracker" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Commission Tracker
                </TabsTrigger>
              )}
            </TabsList>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by job, rep..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="revision_required">Revision Required</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Commission Submissions</CardTitle>
                <CardDescription>
                  View and manage all commission submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading commissions...
                  </div>
                ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Sales Rep / Sub</TableHead>
                        <TableHead>Job Type</TableHead>
                        <TableHead className="text-right">Contract</TableHead>
                        <TableHead className="text-right">Net Owed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map((submission) => {
                        const statusConfig = STATUS_CONFIG[submission.status];
                        return (
                          <TableRow 
                            key={submission.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/commissions/${submission.id}`)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{submission.job_name}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {submission.job_address}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {submission.submission_type === "subcontractor" ? (
                                <Badge variant="outline" className="gap-1">
                                  <Users className="h-3 w-3" />
                                  {submission.subcontractor_name}
                                </Badge>
                              ) : (
                                submission.sales_rep_name
                              )}
                            </TableCell>
                            <TableCell className="capitalize">{submission.job_type}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(submission.contract_amount)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(submission.net_commission_owed)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig?.variant} className="gap-1">
                                {statusConfig?.icon}
                                {statusConfig?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(submission.created_at), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No commissions found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all" 
                        ? "Try adjusting your filters"
                        : "Get started by submitting your first commission"
                      }
                    </p>
                    {canSubmit && !searchQuery && statusFilter === "all" && (
                      <Button onClick={() => navigate("/commissions/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Commission
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isReviewer && (
            <TabsContent value="tracker">
              <CommissionTracker submissions={submissions || []} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
