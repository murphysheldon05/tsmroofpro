import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  FileText,
  History,
  Loader2
} from "lucide-react";
import { CommissionWorksheet } from "@/components/commissions/CommissionWorksheet";
import { 
  useCommissionSubmission, 
  useCommissionStatusLog,
  useUpdateCommissionStatus,
  useIsCommissionReviewer
} from "@/hooks/useCommissions";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }> = {
  pending_review: { label: "Pending Review", variant: "secondary", icon: <Clock className="h-4 w-4" />, color: "text-amber-600" },
  revision_required: { label: "Revision Required", variant: "destructive", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600" },
  approved_for_payment: { label: "Approved for Payment", variant: "default", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
  paid: { label: "Paid", variant: "outline", icon: <DollarSign className="h-4 w-4" />, color: "text-blue-600" },
  on_hold: { label: "On Hold", variant: "secondary", icon: <XCircle className="h-4 w-4" />, color: "text-gray-600" },
};

export default function CommissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: submission, isLoading } = useCommissionSubmission(id!);
  const { data: statusLog } = useCommissionStatusLog(id!);
  const { data: isReviewer } = useIsCommissionReviewer();
  const updateStatus = useUpdateCommissionStatus();
  
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!submission) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Commission not found</h2>
          <Button onClick={() => navigate("/commissions")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Commissions
          </Button>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[submission.status];
  const canApprove = isReviewer && submission.status === "pending_review";
  const canReject = isReviewer && submission.status === "pending_review";
  const canMarkPaid = isReviewer && submission.status === "approved_for_payment";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const handleApprove = async () => {
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "approved_for_payment",
      notes: reviewerNotes || "Approved for payment",
    });
  };

  const handleReject = async () => {
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "revision_required",
      rejection_reason: rejectionReason,
    });
    setRejectionReason("");
  };

  const handleMarkPaid = async () => {
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "paid",
      notes: "Marked as paid",
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/commissions")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{submission.job_name}</h1>
                <Badge variant={statusConfig?.variant} className="gap-1">
                  {statusConfig?.icon}
                  {statusConfig?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">{submission.job_address}</p>
            </div>
          </div>
        </div>

        {/* Reviewer Actions */}
        {isReviewer && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reviewer Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reviewer Notes</Label>
                <Textarea
                  placeholder="Add notes about this submission..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                {canApprove && (
                  <Button 
                    onClick={handleApprove}
                    disabled={updateStatus.isPending}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve for Payment
                  </Button>
                )}
                
                {canReject && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <XCircle className="h-4 w-4" />
                        Request Revision
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Request Revision</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a reason for requesting revision. This will be sent to the submitter.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Textarea
                          placeholder="Enter reason for revision..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleReject}
                          disabled={!rejectionReason.trim()}
                        >
                          Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {canMarkPaid && (
                  <Button 
                    onClick={handleMarkPaid}
                    disabled={updateStatus.isPending}
                    variant="outline"
                    className="gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Mark as Paid
                  </Button>
                )}
              </div>

              {submission.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Revision Required:</p>
                  <p className="text-sm text-destructive/80">{submission.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Job Name</dt>
                <dd className="font-medium">{submission.job_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Job Address</dt>
                <dd className="font-medium">{submission.job_address}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">AccuLynx Job ID</dt>
                <dd className="font-medium">{submission.acculynx_job_id || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Job Type</dt>
                <dd className="font-medium capitalize">{submission.job_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Roof Type</dt>
                <dd className="font-medium capitalize">{submission.roof_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contract Date</dt>
                <dd className="font-medium">{format(new Date(submission.contract_date), "MMM d, yyyy")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Install Completion</dt>
                <dd className="font-medium">
                  {submission.install_completion_date 
                    ? format(new Date(submission.install_completion_date), "MMM d, yyyy")
                    : "Pending"
                  }
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Sales Rep / Subcontractor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {submission.submission_type === "subcontractor" 
                ? "Subcontractor Information" 
                : "Sales Rep Information"
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {submission.submission_type === "subcontractor" ? (
                <>
                  <div>
                    <dt className="text-muted-foreground">Subcontractor Name</dt>
                    <dd className="font-medium">{submission.subcontractor_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Commission Type</dt>
                    <dd className="font-medium">
                      {submission.is_flat_fee ? "Flat Fee" : "Percentage"}
                    </dd>
                  </div>
                  {submission.is_flat_fee && (
                    <div>
                      <dt className="text-muted-foreground">Flat Fee Amount</dt>
                      <dd className="font-medium">{formatCurrency(submission.flat_fee_amount || 0)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-muted-foreground">Sales Rep</dt>
                    <dd className="font-medium">{submission.sales_rep_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="font-medium capitalize">{submission.rep_role}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Commission Tier</dt>
                    <dd className="font-medium">
                      {submission.commission_tier === "custom" 
                        ? `Custom (${submission.custom_commission_percentage}%)`
                        : submission.commission_tier?.replace(/_/g, " / ")
                      }
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Commission Worksheet (Read-only) */}
        <CommissionWorksheet
          data={{
            contract_amount: submission.contract_amount,
            supplements_approved: submission.supplements_approved,
            commission_percentage: submission.commission_percentage,
            advances_paid: submission.advances_paid,
            is_flat_fee: submission.is_flat_fee,
            flat_fee_amount: submission.flat_fee_amount || undefined,
          }}
          onChange={() => {}}
          readOnly={true}
        />

        {/* Status History */}
        {statusLog && statusLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {log.previous_status 
                          ? `${STATUS_CONFIG[log.previous_status]?.label || log.previous_status} → `
                          : ""
                        }
                        {STATUS_CONFIG[log.new_status]?.label || log.new_status}
                      </p>
                      {log.notes && (
                        <p className="text-muted-foreground">{log.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
