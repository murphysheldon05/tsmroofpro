import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { ArrowLeft, Printer, Edit, Check, X, FileText, Calendar, CheckCircle2, RotateCcw, SendHorizontal, Trash2, Loader2, Eye, EyeOff, Clock } from "lucide-react";
import { useCommissionDocument, useUpdateCommissionDocumentStatus, useDeleteCommissionDocument } from "@/hooks/useCommissionDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { CommissionDocumentSummary } from "@/components/commissions/CommissionDocumentSummary";
import { CommissionDocumentPrintView } from "@/components/commissions/CommissionDocumentPrintView";
import { CommissionTimeline } from "@/components/commissions/CommissionTimeline";
import { AdminOverrideButton } from "@/components/commissions/AdminOverrideButton";
import { LateBadge } from "@/components/commissions/LateBadge";
import { formatPayDateShort, getEstimatedPayDate, getCurrentDeadlineInfo, formatPayRunRange, formatTimestampMST } from "@/lib/commissionPayDateCalculations";
import { formatDisplayName } from "@/lib/displayName";
import { CommissionStatusStepper } from "@/components/commissions/CommissionStatusStepper";
import { supabase } from "@/integrations/supabase/client";

export default function CommissionDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, isAdmin, userDepartment } = useAuth();
  const { data: document, isLoading } = useCommissionDocument(id);
  const updateStatusMutation = useUpdateCommissionDocumentStatus();
  const deleteDocument = useDeleteCommissionDocument();

  // Auto-open edit mode for drafts when ?edit=true (e.g. from "Continue Draft" button)
  const editParam = searchParams.get("edit") === "true";
  const [isEditing, setIsEditing] = useState(editParam);
  const [showPrint, setShowPrint] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    'approved' | 'rejected' | 'manager_approved' | 'accounting_approved' | 'revision_required' | 'submitted' | 'paid'
  >('approved');
  const [approvalComment, setApprovalComment] = useState("");
  const [showFullForm, setShowFullForm] = useState(false);

  // Resolve actor names for the stepper
  const [managerName, setManagerName] = useState<string | null>(null);
  const [accountingName, setAccountingName] = useState<string | null>(null);
  const [paidByName, setPaidByName] = useState<string | null>(null);
  const [payRunRange, setPayRunRange] = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;
    const fetchNames = async () => {
      const ids = [document.manager_approved_by, document.accounting_approved_by, document.paid_by].filter(Boolean);
      if (ids.length === 0) return;
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      if (data) {
        const map = Object.fromEntries(data.map(p => [p.id, formatDisplayName(p.full_name, p.email)]));
        setManagerName(map[document.manager_approved_by!] || null);
        setAccountingName(map[document.accounting_approved_by!] || null);
        setPaidByName(map[document.paid_by!] || null);
      }
    };
    fetchNames();
  }, [document]);

  // Fetch pay run range for display
  useEffect(() => {
    if (!document?.pay_run_id) { setPayRunRange(null); return; }
    supabase
      .from("commission_pay_runs")
      .select("period_start, period_end")
      .eq("id", document.pay_run_id)
      .single()
      .then(({ data }) => {
        if (data?.period_start && data?.period_end) {
          setPayRunRange(formatPayRunRange(data.period_start, data.period_end));
        }
      });
  }, [document?.pay_run_id]);

  // --- Role-based action permissions ---
  const isAccountingUser = userDepartment === 'Accounting';
  
  // Admin can approve submitted docs (compliance review)
  const canApproveAsManager = isAdmin && 
    document?.status === 'submitted' && 
    document?.created_by !== user?.id;
  
  const isSelfSubmission = false;
  
  // Accounting can process manager_approved docs (Admin OR Accounting department)
  const canApproveAsAccounting = (isAdmin || isAccountingUser) && document?.status === 'manager_approved';
  
  // Accounting can mark as paid (Admin OR Accounting department)
  const canMarkAsPaid = (isAdmin || isAccountingUser) && document?.status === 'accounting_approved';
  
  // Creator can edit drafts and revision_required (rejected = denied, not editable)
  const canEdit = document?.created_by === user?.id && 
    (document?.status === 'draft' || document?.status === 'revision_required');
  
  // Creator can resubmit revision_required docs (rejected = denied, no resubmit)
  const canResubmit = document?.created_by === user?.id && 
    document?.status === 'revision_required';

  const handleApprovalAction = async () => {
    if (!id) return;
    
    if (approvalAction === 'revision_required') {
      await updateStatusMutation.mutateAsync({
        id,
        status: 'revision_required',
        revision_reason: approvalComment,
      });
    } else if (approvalAction === 'rejected') {
      await updateStatusMutation.mutateAsync({
        id,
        status: 'rejected',
        approval_comment: approvalComment,
        revision_reason: approvalComment,
      });
    } else {
      await updateStatusMutation.mutateAsync({
        id,
        status: approvalAction as any,
        approval_comment: approvalComment,
      });
    }
    setShowApprovalDialog(false);
    setApprovalComment("");
  };

  const handleResubmit = async () => {
    if (!id) return;
    await updateStatusMutation.mutateAsync({
      id,
      status: 'submitted',
    });
  };

  // For drafts with ?edit=true, open edit form immediately (Continue Draft flow)
  // Must be before any early returns to satisfy React rules-of-hooks
  useEffect(() => {
    if (document?.status === 'draft' && editParam) {
      setIsEditing(true);
    }
  }, [document?.status, editParam]);

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => window.print(), 100);
  };

  if (isLoading) {
    return <div className="container mx-auto py-6 text-center">Loading...</div>;
  }

  if (!document) {
    return (
        <div className="container mx-auto py-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Document not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(isAdmin ? '/commission-manager' : '/commissions')}>
            Back to List
          </Button>
        </div>
    );
  }

  if (showPrint) {
    return (
      <div>
        <div className="no-print fixed top-4 right-4 z-50">
          <Button variant="outline" onClick={() => setShowPrint(false)}>
            Close Print View
          </Button>
        </div>
        <CommissionDocumentPrintView document={document} isAdmin={isAdmin} />
      </div>
    );
  }

  if (isEditing) {
    return (
        <div className="container mx-auto py-6">
          <CommissionDocumentForm document={document} />
        </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      manager_approved: "default",
      accounting_approved: "outline",
      approved: "outline",
      rejected: "destructive",
      revision_required: "destructive",
      paid: "outline",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      submitted: "Pending — Awaiting Compliance Review",
      manager_approved: "Manager Approved — Awaiting Accounting",
      accounting_approved: "Approved — Payment Scheduled",
      approved: "Approved",
      rejected: "Denied",
      revision_required: "Revision Required",
      paid: "Paid",
    };
    const colors: Record<string, string> = {
      draft: 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500',
      approved: 'bg-green-100 text-green-800 border-green-300',
      manager_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      accounting_approved: 'bg-green-100 text-green-800 border-green-300',
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      revision_required: 'bg-amber-100 text-amber-800 border-amber-300',
      rejected: 'bg-red-200 text-red-900 border-red-400',
    };
    const wasRevised = (document?.revision_count ?? 0) > 0 && status !== "revision_required" && status !== "rejected";
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={variants[status] || "secondary"} className={colors[status] || ''}>
          {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
        {wasRevised && (
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px]">
            Revised
          </Badge>
        )}
        {status === "rejected" && (
          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-400 dark:border-red-700 text-[10px]">
            Final
          </Badge>
        )}
      </div>
    );
  };

  const getPayDateBadge = () => {
    if (!document) return null;
    const status = document.status;
    if (document.scheduled_pay_date && status !== 'draft' && status !== 'rejected') {
      const label = status === 'paid' ? 'Paid' :
        status === 'accounting_approved' ? 'Pay Run' :
        'Est. Pay Run';
      const color = status === 'paid' ? 'text-green-600' :
        status === 'accounting_approved' ? 'text-blue-600' :
        'text-muted-foreground';
      const icon = status === 'paid' ? <CheckCircle2 className="h-4 w-4" /> : <Calendar className="h-4 w-4" />;
      return (
        <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
          {icon}
          <span>{label}: {formatPayDateShort(document.scheduled_pay_date)}</span>
        </div>
      );
    }
    if (!document.scheduled_pay_date && (status === 'submitted' || status === 'manager_approved')) {
      const estimatedDate = getEstimatedPayDate();
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Est. {formatPayDateShort(estimatedDate)}</span>
        </div>
      );
    }
    return null;
  };

  const dialogTitle = {
    manager_approved: 'Manager Approve Commission',
    accounting_approved: 'Accounting Approve Commission',
    approved: 'Approve Commission',
    rejected: 'Deny Commission',
    revision_required: 'Reject',
    submitted: 'Send Back to Manager',
    paid: 'Mark as Paid',
  }[approvalAction] || 'Commission Action';

  const dialogButtonLabel = {
    manager_approved: 'Approve',
    accounting_approved: 'Approve for Payment',
    approved: 'Approve',
    rejected: 'Deny',
    revision_required: 'Reject',
    submitted: 'Send Back',
    paid: 'Confirm Paid',
  }[approvalAction] || 'Confirm';

  const requiresNotes = approvalAction === 'rejected' || approvalAction === 'revision_required';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={() => navigate(isAdmin ? '/commission-manager' : '/commissions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canResubmit && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleResubmit}
              disabled={updateStatusMutation.isPending}
            >
              <SendHorizontal className="h-4 w-4 mr-2" />
              Resubmit
            </Button>
          )}
          {canApproveAsManager && (
            <>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => { setApprovalAction('manager_approved'); setShowApprovalDialog(true); }}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => { setApprovalAction('revision_required'); setShowApprovalDialog(true); }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setApprovalAction('rejected'); setShowApprovalDialog(true); }}
              >
                <X className="h-4 w-4 mr-2" />
                Deny
              </Button>
            </>
          )}
          {isSelfSubmission && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 py-2">
              Self-submitted — requires Admin approval
            </Badge>
          )}
          {canApproveAsAccounting && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { setApprovalAction('accounting_approved'); setShowApprovalDialog(true); }}
              >
                <Check className="h-4 w-4 mr-2" />
                Accounting Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => { setApprovalAction('submitted'); setShowApprovalDialog(true); }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Send Back to Manager
              </Button>
            </>
          )}
          {canMarkAsPaid && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { setApprovalAction('paid' as any); setShowApprovalDialog(true); }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          {isAdmin && (
            <AdminOverrideButton
              commissionId={document.id}
              currentPayRunId={document.pay_run_id}
              isLateSubmission={document.is_late_submission}
              isLateRevision={document.is_late_revision}
            />
          )}
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">Delete Commission</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete this commission? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteDocument.mutate(id!, {
                        onSuccess: () => navigate(isAdmin ? '/commission-manager' : '/commissions'),
                      });
                    }}
                    disabled={deleteDocument.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                  >
                    {deleteDocument.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Permanently"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Status Timeline Stepper */}
      <Card>
        <CardContent className="pt-4 pb-2">
          <CommissionStatusStepper
            documentStatus={document.status}
            submittedAt={document.submitted_at}
            managerApprovedBy={managerName}
            managerApprovedAt={document.manager_approved_at}
            accountingApprovedBy={accountingName}
            accountingApprovedAt={document.accounting_approved_at}
            paidAt={document.paid_at}
            paidBy={paidByName}
            revisionReason={document.revision_reason}
            approvalComment={document.approval_comment}
            salesRep={document.sales_rep}
          />
        </CardContent>
      </Card>

      {/* Key Info: Pay Run, Install Date, Submitted, Late Badge */}
      {document.status !== 'draft' && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {payRunRange && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Pay Run:</span>
                  <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-xs">{payRunRange}</Badge>
                  <LateBadge isLateSubmission={document.is_late_submission} isLateRevision={document.is_late_revision} />
                </div>
              )}
              {document.install_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Install Date:</span>
                  <span className="font-medium">{new Date(document.install_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
              {document.submitted_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="font-medium">{formatTimestampMST(document.submitted_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Notice — editable, can be revised and resubmitted */}
      {document.status === 'revision_required' && document.revision_reason && (() => {
        const deadlines = getCurrentDeadlineInfo();
        return (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400">Revision Required</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">{document.revision_reason}</p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-2">
                    Resubmit by <strong>{deadlines.revisionDeadline}</strong> to keep the same-week pay run.
                    After that, the commission moves to the following week.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Denied Notice — permanent, cannot be edited or resubmitted */}
      {document.status === 'rejected' && (
        <Card className="border-red-400 bg-red-100 dark:bg-red-950/30 dark:border-red-700">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <X className="h-5 w-5 text-red-700 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-300">Commission Denied — Final</p>
                <p className="text-xs text-red-700/70 dark:text-red-400/60 mt-1">This commission has been permanently denied and cannot be revised or resubmitted.</p>
                {document.approval_comment && (
                  <p className="text-sm text-red-800 dark:text-red-300/80 mt-2">{document.approval_comment}</p>
                )}
                {document.revision_reason && !document.approval_comment && (
                  <p className="text-sm text-red-800 dark:text-red-300/80 mt-2">{document.revision_reason}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle>Commission Document: {document.job_name_id}</CardTitle>
            {getPayDateBadge()}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(document.status)}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowFullForm((v) => !v)}
            >
              {showFullForm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showFullForm ? "Summary" : "Full Form"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showFullForm ? (
            <CommissionDocumentForm document={document} readOnly />
          ) : (
            <CommissionDocumentSummary document={document} />
          )}
        </CardContent>
      </Card>

      {/* Commission Timeline (Audit Trail) */}
      {document.status !== 'draft' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <CommissionTimeline commissionId={document.id} />
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={requiresNotes ? 'Reason (required)...' : 'Comment (optional)'}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={approvalAction === 'rejected' ? 'destructive' : 'default'}
              className={approvalAction !== 'rejected' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={handleApprovalAction}
              disabled={updateStatusMutation.isPending || (requiresNotes && !approvalComment.trim())}
            >
              {dialogButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
