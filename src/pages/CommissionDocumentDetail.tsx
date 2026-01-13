import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Printer, Edit, Check, X, FileText } from "lucide-react";
import { useCommissionDocument, useUpdateCommissionDocumentStatus } from "@/hooks/useCommissionDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { CommissionDocumentPrintView } from "@/components/commissions/CommissionDocumentPrintView";

export default function CommissionDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: document, isLoading } = useCommissionDocument(id);
  const updateStatusMutation = useUpdateCommissionDocumentStatus();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');
  const [approvalComment, setApprovalComment] = useState("");

  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const canApprove = isManagerOrAdmin && document?.status === 'submitted';
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
      approved: "outline",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className={status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' : ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
          {canApprove && (
            <>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { setApprovalAction('approved'); setShowApprovalDialog(true); }}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
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
          <CardTitle>Commission Document: {document.job_name_id}</CardTitle>
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
              {approvalAction === 'approved' ? 'Approve' : 'Reject'} Commission Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={approvalAction === 'approved' ? 'Approval comment (optional)' : 'Reason for rejection...'}
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
              variant={approvalAction === 'approved' ? 'default' : 'destructive'}
              onClick={handleApprovalAction}
              disabled={updateStatusMutation.isPending}
            >
              {approvalAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
