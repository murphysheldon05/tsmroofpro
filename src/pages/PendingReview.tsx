import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingReview, PendingItem, SlaStatus } from "@/hooks/usePendingReview";
import { useUpdateCommissionStatus } from "@/hooks/useCommissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  FileText,
  DollarSign,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Edit,
  MessageSquare,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const typeIcons = {
  commission: DollarSign,
  request: FileText,
  warranty: Shield,
};

const typeColors = {
  commission: "text-emerald-500",
  request: "text-blue-500",
  warranty: "text-primary",
};

const typeLabels = {
  commission: "Commission",
  request: "Request",
  warranty: "Warranty",
};

const actionLabels = {
  review: "Needs Review",
  revision: "Needs Revision",
  info_needed: "Info Requested",
};

const slaStyles: Record<SlaStatus, { label: string; className: string; icon: React.ElementType }> = {
  overdue: {
    label: "Overdue",
    className: "bg-destructive text-destructive-foreground",
    icon: AlertCircle,
  },
  due_today: {
    label: "Due Today",
    className: "bg-amber-500 text-white",
    icon: Clock,
  },
  due_tomorrow: {
    label: "Due Tomorrow",
    className: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
    icon: Clock,
  },
  on_track: {
    label: "On Track",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    icon: CheckCircle,
  },
};

function SlaBadge({ status }: { status: SlaStatus }) {
  const style = slaStyles[status];
  const Icon = style.icon;
  
  return (
    <Badge className={`text-xs gap-1 ${style.className}`}>
      <Icon className="w-3 h-3" />
      {style.label}
    </Badge>
  );
}

export default function PendingReview() {
  const { isAdmin, isManager } = useAuth();
  const { data, isLoading, refetch } = usePendingReview();
  const navigate = useNavigate();
  const updateCommissionStatus = useUpdateCommissionStatus();
  const isReviewer = isAdmin || isManager;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [slaFilter, setSlaFilter] = useState<string>("all");
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNavigate = (item: PendingItem) => {
    switch (item.type) {
      case "commission":
        navigate(`/commissions/${item.id}`);
        break;
      case "request":
        navigate(`/requests?id=${item.id}`);
        break;
      case "warranty":
        navigate(`/warranties?id=${item.id}`);
        break;
    }
  };

  const handleEdit = (item: PendingItem) => {
    if (item.type === "commission") {
      navigate(`/commissions/${item.id}?edit=true`);
    } else {
      handleNavigate(item);
    }
  };

  const handleApprove = async (item: PendingItem) => {
    if (item.type === "commission") {
      setIsSubmitting(true);
      try {
        await updateCommissionStatus.mutateAsync({
          id: item.id,
          status: "pending_review",
          approval_stage: "manager_approved",
          notes: "Approved via Pending Review page",
        });
        refetch();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleOpenReject = (item: PendingItem) => {
    setSelectedItem(item);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (selectedItem.type === "commission") {
        await updateCommissionStatus.mutateAsync({
          id: selectedItem.id,
          status: "revision_required",
          rejection_reason: rejectionReason,
        });
      }
      refetch();
      setRejectDialogOpen(false);
      setSelectedItem(null);
      setRejectionReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items
  const filteredItems = (data?.items || []).filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesSla = slaFilter === "all" || item.sla_status === slaFilter;
    return matchesSearch && matchesType && matchesSla;
  });

  const overdueCount = data?.items?.filter(i => i.sla_status === "overdue").length || 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isReviewer ? "Pending Review" : "Needs Your Action"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data?.counts?.total || 0} items • {overdueCount} overdue
              </p>
            </div>
          </div>
          
          {/* Category Count Badges */}
          <div className="flex flex-wrap gap-2">
            {data?.counts?.commissions ? (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="w-3 h-3" />
                {data.counts.commissions} Commission{data.counts.commissions !== 1 ? "s" : ""}
              </Badge>
            ) : null}
            {data?.counts?.requests ? (
              <Badge variant="outline" className="gap-1">
                <FileText className="w-3 h-3" />
                {data.counts.requests} Request{data.counts.requests !== 1 ? "s" : ""}
              </Badge>
            ) : null}
            {data?.counts?.warranties ? (
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                {data.counts.warranties} Warrant{data.counts.warranties !== 1 ? "ies" : "y"}
              </Badge>
            ) : null}
          </div>
        </header>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="commission">Commissions</SelectItem>
                    <SelectItem value="request">Requests</SelectItem>
                    <SelectItem value="warranty">Warranties</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={slaFilter} onValueChange={setSlaFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Clock className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="due_today">Due Today</SelectItem>
                    <SelectItem value="due_tomorrow">Due Tomorrow</SelectItem>
                    <SelectItem value="on_track">On Track</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">No items require your attention.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead>Title / Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Age</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const TypeIcon = typeIcons[item.type];
                      return (
                        <TableRow key={`${item.type}-${item.id}`} className="cursor-pointer hover:bg-muted/50">
                          <TableCell onClick={() => handleNavigate(item)}>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`w-4 h-4 ${typeColors[item.type]}`} />
                              <span className="text-xs font-medium">{typeLabels[item.type]}</span>
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleNavigate(item)}>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {item.subtitle}
                              </p>
                              {item.rejection_reason && (
                                <p className="text-xs text-destructive mt-1 truncate max-w-[200px]">
                                  Reason: {item.rejection_reason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleNavigate(item)}>
                            <Badge variant="secondary" className="text-xs">
                              {actionLabels[item.requires_action]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center" onClick={() => handleNavigate(item)}>
                            <span className="text-sm font-medium">{item.age_days}</span>
                            <span className="text-xs text-muted-foreground ml-1">days</span>
                          </TableCell>
                          <TableCell onClick={() => handleNavigate(item)}>
                            <SlaBadge status={item.sla_status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {isReviewer ? (
                                // Manager/Admin Actions
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleNavigate(item)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Review
                                  </Button>
                                  {item.type === "commission" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-emerald-600 hover:text-emerald-700"
                                        onClick={() => handleApprove(item)}
                                        disabled={isSubmitting}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleOpenReject(item)}
                                        disabled={isSubmitting}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </>
                              ) : (
                                // User Actions
                                <>
                                  {item.requires_action === "revision" && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Edit & Resubmit
                                    </Button>
                                  )}
                                  {item.requires_action === "info_needed" && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleNavigate(item)}
                                    >
                                      <MessageSquare className="w-4 h-4 mr-1" />
                                      Provide Info
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleNavigate(item)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Please provide a reason for returning this {selectedItem?.type} for revision.
              This will be visible to the submitter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for revision (required)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
