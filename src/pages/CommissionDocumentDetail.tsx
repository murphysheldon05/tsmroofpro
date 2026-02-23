import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Printer, Edit, Check, X, FileText, Calendar, CheckCircle2, RotateCcw, SendHorizonal } from "lucide-react";
import { useCommissionDocument, useUpdateCommissionDocumentStatus } from "@/hooks/useCommissionDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { CommissionDocumentPrintView } from "@/components/commissions/CommissionDocumentPrintView";
import { formatPayDateShort, getEstimatedPayDate } from "@/lib/commissionPayDateCalculations";
import { formatDisplayName } from "@/lib/displayName";
import { CommissionStatusStepper } from "@/components/commissions/CommissionStatusStepper";
import { supabase } from "@/integrations/supabase/client";

export default function CommissionDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role, isAdmin, userDepartment } = useAuth();
  const { data: document, isLoading } = useCommissionDocument(id);
  const updateStatusMutation = useUpdateCommissionDocumentStatus();

  const [isEditing, setIsEditing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    'approved' | 'rejected' | 'manager_approved' | 'accounting_approved' | 'revision_required' | 'submitted' | 'paid'
  >('approved');
  const [approvalComment, setApprovalComment] = useState("");

  // Resolve actor names for the stepper
  const [managerName, setManagerName] = useState<string | null>(null);
  const [accountingName, setAccountingName] = useState<string | null>(null);
  const [paidByName, setPaidByName] = useState<string | null>(null);

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

  // --- Role-based action permissions ---
  const isSalesManager = role === 'sales_manager';
  const isAccountingUser = userDepartment === 'Accounting';
  
  // Manager can approve submitted docs (but NOT their own)
  const canApproveAsManager = (isAdmin || isSalesManager) && 
    document?.status === 'submitted' && 
    document?.created_by !== user?.id; // Self-commission prevention
  
  // Self-submitted by a sales manager → needs admin approval
  const isSelfSubmission = isSalesManager && document?.created_by === user?.id && document?.status === 'submitted';
  
  // Accounting can process manager_approved docs (Admin OR Accounting department)
  const canApproveAsAccounting = (isAdmin || isAccountingUser) && document?.status === 'manager_approved';
  
  // Accounting can mark as paid (Admin OR Accounting department)
  const canMarkAsPaid = (isAdmin || isAccountingUser) && document?.status === 'accounting_approved';
  
  // Creator can edit drafts, revision_required, and rejected docs
  const canEdit = document?.created_by === user?.id && 
    (document?.status === 'draft' || document?.status === 'revision_required' || document?.status === 'rejected');
  
  // Creator can resubmit revision_required or rejected docs
  const canResubmit = document?.created_by === user?.id && 
    (document?.status === 'revision_required' || document?.status === 'rejected');

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
        <Button variant="outline" className="mt-4" onClick={() => navigate('/commission-documents')}>
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
      revision_required: "Rejected",
      paid: "Paid",
    };
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-800 border-green-300',
      manager_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      accounting_approved: 'bg-green-100 text-green-800 border-green-300',
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      revision_required: 'bg-amber-100 text-amber-800 border-amber-300',
    };
    return (
      <Badge variant={variants[status] || "secondary"} className={colors[status] || ''}>
        {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPayDateBadge = () => {
    if (!document) return null;
    const status = document.status;
    if (status === 'manager_approved') {
      const estimatedDate = getEstimatedPayDate();
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Est. {formatPayDateShort(estimatedDate)}</span>
        </div>
      );
    }
    if (status === 'accounting_approved' && document.scheduled_pay_date) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <Calendar className="h-4 w-4" />
          <span>📅 {formatPayDateShort(document.scheduled_pay_date)}</span>
        </div>
      );
    }
    if (status === 'paid' && document.scheduled_pay_date) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>✅ Paid {formatPayDateShort(document.scheduled_pay_date)}</span>
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
        <Button variant="ghost" onClick={() => navigate('/commission-documents')}>
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
              <SendHorizonal className="h-4 w-4 mr-2" />
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

      {/* Revision Notice */}
      {document.status === 'revision_required' && document.revision_reason && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-400">Rejected</p>
                <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">{document.revision_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Denied Notice */}
      {document.status === 'rejected' && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <X className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-400">Commission Denied</p>
                {document.approval_comment && (
                  <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">{document.approval_comment}</p>
                )}
                {document.revision_reason && (
                  <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">{document.revision_reason}</p>
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
          {getStatusBadge(document.status)}
        </CardHeader>
        <CardContent>
          <CommissionDocumentForm document={document} readOnly />
        </CardContent>
      </Card>

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
