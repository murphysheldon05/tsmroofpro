import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Printer, Edit, Check, X, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { useCommissionDocument, useUpdateCommissionDocumentStatus } from "@/hooks/useCommissionDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { CommissionDocumentPrintView } from "@/components/commissions/CommissionDocumentPrintView";
import { formatPayDateShort, getEstimatedPayDate } from "@/lib/commissionPayDateCalculations";

export default function CommissionDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: document, isLoading } = useCommissionDocument(id);
  const updateStatusMutation = useUpdateCommissionDocumentStatus();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected' | 'manager_approved' | 'accounting_approved'>('approved');
  const [approvalComment, setApprovalComment] = useState("");

  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';
  const canApproveAsManager = isManagerOrAdmin && document?.status === 'submitted';
  const canApproveAsAccounting = isAdmin && document?.status === 'manager_approved';
  const canEdit = document?.status === 'draft';

  const handleApprovalAction = async () => {
    if (!id) return;
    await updateStatusMutation.mutateAsync({
      id,
      status: approvalAction,
      approval_comment: approvalComment,
    });
    setShowApprovalDialog(false);
    setApprovalComment("");
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
        <CommissionDocumentPrintView document={document} isAdmin={role === 'admin'} />
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
      paid: "outline",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      submitted: "Submitted",
      manager_approved: "Manager Approved",
      accounting_approved: "Accounting Approved",
      approved: "Approved",
      rejected: "Rejected",
      paid: "Paid",
    };
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-800 border-green-300',
      manager_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      accounting_approved: 'bg-green-100 text-green-800 border-green-300',
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
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
      // Show estimated pay date
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/commission-documents')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex gap-2">
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
          {canApproveAsManager && (
            <>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => { setApprovalAction('manager_approved'); setShowApprovalDialog(true); }}
              >
                <Check className="h-4 w-4 mr-2" />
                Manager Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setApprovalAction('rejected'); setShowApprovalDialog(true); }}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {canApproveAsAccounting && (
            <>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { setApprovalAction('accounting_approved'); setShowApprovalDialog(true); }}
              >
                <Check className="h-4 w-4 mr-2" />
                Accounting Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setApprovalAction('rejected'); setShowApprovalDialog(true); }}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

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

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'manager_approved' && 'Manager Approve Commission Document'}
              {approvalAction === 'accounting_approved' && 'Accounting Approve Commission Document'}
              {approvalAction === 'approved' && 'Approve Commission Document'}
              {approvalAction === 'rejected' && 'Reject Commission Document'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={approvalAction === 'rejected' ? 'Reason for rejection (required)...' : 'Approval comment (optional)'}
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
              disabled={updateStatusMutation.isPending || (approvalAction === 'rejected' && !approvalComment.trim())}
            >
              {approvalAction === 'manager_approved' && 'Manager Approve'}
              {approvalAction === 'accounting_approved' && 'Accounting Approve'}
              {approvalAction === 'approved' && 'Approve'}
              {approvalAction === 'rejected' && 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
