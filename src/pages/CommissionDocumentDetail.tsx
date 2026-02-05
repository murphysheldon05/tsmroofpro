import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Printer, Edit, Check, X, FileText, Calendar, CheckCircle2, UserCheck, MessageSquare, Eye } from "lucide-react";
import { useCommissionDocument, useUpdateCommissionDocumentStatus } from "@/hooks/useCommissionDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommissionDocumentForm } from "@/components/commissions/CommissionDocumentForm";
import { CommissionDocumentPrintView } from "@/components/commissions/CommissionDocumentPrintView";
import { formatPayDateShort, getEstimatedPayDate } from "@/lib/commissionPayDateCalculations";
import { formatCurrency } from "@/lib/commissionDocumentCalculations";
import { toast } from "sonner";

type ApprovalAction = 'approved' | 'rejected' | 'manager_approved' | 'accounting_approved' | 
  'revision_required' | 'review_requested' | 'review_completed' | 'paid';

export default function CommissionDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: document, isLoading, refetch } = useCommissionDocument(id);
  const updateStatusMutation = useUpdateCommissionDocumentStatus();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>('approved');
  const [approvalComment, setApprovalComment] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");

  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';
  const isAccounting = role === 'admin'; // Accounting actions are for admin-level users
  
  // Determine what actions are available based on status and role
  const canApproveAsManager = isManagerOrAdmin && document?.status === 'submitted';
  const canApproveAsAccounting = isAccounting && document?.status === 'manager_approved';
  const canMarkAsPaid = isAccounting && document?.status === 'accounting_approved';
  const canRequestReview = isAccounting && document?.status === 'manager_approved';
  const canCompleteReview = document?.status === 'review_requested' && 
    ((document as any)?.review_requested_to === user?.id || isAdmin);
  const canApproveAfterReview = isAccounting && document?.status === 'review_completed';
  const canEdit = document?.status === 'draft' || 
    (document?.status === 'revision_required' && document?.created_by === user?.id);

  // Fetch admins and managers for the "Request Review" dropdown
  const { data: reviewerOptions } = useQuery({
    queryKey: ["reviewer-options"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("employee_status", "active")
        .order("full_name");
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      return (profiles || [])
        .filter(p => {
          const userRole = roleMap.get(p.id);
          return (userRole === 'admin' || userRole === 'manager') && p.id !== user?.id;
        })
        .map(p => ({
          id: p.id,
          name: p.full_name || p.email || 'Unknown',
          role: roleMap.get(p.id) || 'unknown',
        }));
    },
    enabled: canRequestReview || false,
  });

  // Handle all approval actions
  const handleApprovalAction = async () => {
    if (!id || !document) return;

    try {
      // Handle "Request Review" — special case, updates review fields
      if (approvalAction === 'review_requested') {
        if (!selectedReviewer) {
          toast.error("Please select a reviewer");
          return;
        }
        const reviewer = reviewerOptions?.find(r => r.id === selectedReviewer);
        
        const { error } = await supabase
          .from('commission_documents')
          .update({
            status: 'review_requested',
            review_requested_by: user?.id,
            review_requested_at: new Date().toISOString(),
            review_requested_to: selectedReviewer,
            review_requested_to_name: reviewer?.name || null,
            review_notes: approvalComment || null,
          })
          .eq('id', id);
        
        if (error) throw error;

        // Send email notification to the selected reviewer
        const { data: reviewerProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', selectedReviewer)
          .single();

        if (reviewerProfile?.email) {
          await supabase.functions.invoke("send-commission-notification", {
            body: {
              notification_type: "status_change",
              commission_id: id,
              job_name: document.job_name_id,
              job_address: "",
              sales_rep_name: document.sales_rep,
              subcontractor_name: null,
              submission_type: "employee",
              contract_amount: document.gross_contract_total,
              net_commission_owed: document.rep_commission,
              submitter_email: reviewerProfile.email,
              status: "review_requested",
              previous_status: "manager_approved",
              notes: `Accounting has requested your review of this commission.${approvalComment ? `\n\nNotes: ${approvalComment}` : ''}`,
              changed_by_name: "Accounting",
            },
          });
        }

        // Create in-app notification
        await supabase.from('user_notifications').insert({
          user_id: selectedReviewer,
          notification_type: 'commission_review_requested',
          title: 'Review Requested',
          message: `Please review commission for ${document.job_name_id}`,
          entity_type: 'commission_document',
          entity_id: id,
        });

        toast.success(`Review requested from ${reviewer?.name}`);
        refetch();
        setShowApprovalDialog(false);
        setApprovalComment("");
        setSelectedReviewer("");
        return;
      }

      // Handle "Review Completed" — reviewer sends it back to accounting
      if (approvalAction === 'review_completed') {
        const docAny = document as any;
        const { error } = await supabase
          .from('commission_documents')
          .update({
            status: 'review_completed',
            review_completed_by: user?.id,
            review_completed_at: new Date().toISOString(),
            review_completed_notes: approvalComment || null,
          })
          .eq('id', id);
        
        if (error) throw error;

        // Notify accounting that the review is done
        if (docAny.review_requested_by) {
          const { data: accountingProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', docAny.review_requested_by)
            .single();

          if (accountingProfile?.email) {
            await supabase.functions.invoke("send-commission-notification", {
              body: {
                notification_type: "status_change",
                commission_id: id,
                job_name: document.job_name_id,
                job_address: "",
                sales_rep_name: document.sales_rep,
                subcontractor_name: null,
                submission_type: "employee",
                contract_amount: document.gross_contract_total,
                net_commission_owed: document.rep_commission,
                submitter_email: accountingProfile.email,
                status: "review_completed",
                previous_status: "review_requested",
                notes: `Review complete — ready for your final approval.${approvalComment ? `\n\nReviewer Notes: ${approvalComment}` : ''}`,
                changed_by_name: "Reviewer",
              },
            });
          }

          // Create in-app notification
          await supabase.from('user_notifications').insert({
            user_id: docAny.review_requested_by,
            notification_type: 'commission_review_completed',
            title: 'Review Completed',
            message: `Review complete for ${document.job_name_id} - ready for final approval`,
            entity_type: 'commission_document',
            entity_id: id,
          });
        }

        toast.success("Review completed — sent back to accounting");
        refetch();
        setShowApprovalDialog(false);
        setApprovalComment("");
        return;
      }

      // Handle standard status updates
      // review_completed and review_requested are handled above
      if ((approvalAction as string) === 'review_completed' || (approvalAction as string) === 'review_requested') {
        return;
      }
      await updateStatusMutation.mutateAsync({
        id,
        status: approvalAction as any,
        approval_comment: approvalComment || undefined,
        revision_reason: approvalAction === 'revision_required' ? approvalComment : undefined,
      });

    } catch (error: any) {
      console.error("Approval action failed:", error);
      toast.error(error.message || "Action failed");
      return;
    }

    setShowApprovalDialog(false);
    setApprovalComment("");
    setSelectedReviewer("");
    refetch();
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
          <Button variant="outline" onClick={() => setShowPrint(false)}>Close Print View</Button>
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
      draft: "secondary", submitted: "default", manager_approved: "default",
      accounting_approved: "outline", approved: "outline", rejected: "destructive",
      paid: "outline", revision_required: "destructive",
      review_requested: "default", review_completed: "default",
    };
    const labels: Record<string, string> = {
      draft: "Draft", submitted: "Submitted", manager_approved: "Manager Approved",
      accounting_approved: "Accounting Approved", approved: "Approved",
      rejected: "Rejected", paid: "Paid", revision_required: "Revision Required",
      review_requested: "Review Requested", review_completed: "Review Completed",
    };
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-800 border-green-300',
      manager_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      accounting_approved: 'bg-green-100 text-green-800 border-green-300',
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      review_requested: 'bg-purple-100 text-purple-800 border-purple-300',
      review_completed: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    };
    return (
      <Badge variant={variants[status] || "secondary"} className={colors[status] || ''}>
        {labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
          <Calendar className="h-4 w-4" /><span>Est. {formatPayDateShort(estimatedDate)}</span>
        </div>
      );
    }
    if (status === 'accounting_approved' && document.scheduled_pay_date) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
          <Calendar className="h-4 w-4" /><span>📅 {formatPayDateShort(document.scheduled_pay_date)}</span>
        </div>
      );
    }
    if (status === 'paid' && document.scheduled_pay_date) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <CheckCircle2 className="h-4 w-4" /><span>✅ Paid {formatPayDateShort(document.scheduled_pay_date)}</span>
        </div>
      );
    }
    return null;
  };

  // Dialog content changes based on action
  const getDialogTitle = () => {
    switch (approvalAction) {
      case 'manager_approved': return 'Manager Approve Commission';
      case 'accounting_approved': return 'Accounting Approve & Schedule Payment';
      case 'paid': return 'Mark Commission as Paid';
      case 'rejected': return 'Reject Commission';
      case 'revision_required': return 'Request Revision';
      case 'review_requested': return 'Request Review from Admin/Manager';
      case 'review_completed': return 'Complete Review';
      default: return 'Update Commission Status';
    }
  };

  const getDialogDescription = () => {
    switch (approvalAction) {
      case 'review_requested': return 'Select an admin or manager to review this commission. It will come back to accounting for final approval after their review.';
      case 'review_completed': return 'Your review notes will be sent to accounting. The commission will return to accounting for final approval and payment.';
      case 'revision_required': return 'The sales rep will receive an email with your revision notes and can resubmit.';
      case 'paid': return `This will send a celebratory notification to ${document.sales_rep} letting them know their commission of ${formatCurrency(document.rep_commission)} has been paid!`;
      default: return undefined;
    }
  };

  const docAny = document as any;

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-4 sm:space-y-6">
      {/* Header — responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/commission-documents')} className="self-start">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Action buttons — scroll horizontally on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0">
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="shrink-0">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}

          {/* Manager Actions */}
          {canApproveAsManager && (
            <>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0"
                onClick={() => { setApprovalAction('manager_approved'); setShowApprovalDialog(true); }}>
                <Check className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
              <Button size="sm" variant="outline" className="shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => { setApprovalAction('revision_required'); setShowApprovalDialog(true); }}>
                <MessageSquare className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Revision</span>
              </Button>
              <Button size="sm" variant="destructive" className="shrink-0"
                onClick={() => { setApprovalAction('rejected'); setShowApprovalDialog(true); }}>
                <X className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            </>
          )}

          {/* Accounting Actions */}
          {canApproveAsAccounting && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0"
                onClick={() => { setApprovalAction('accounting_approved'); setShowApprovalDialog(true); }}>
                <Check className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
              <Button size="sm" variant="outline" className="shrink-0 text-purple-600 border-purple-300 hover:bg-purple-50"
                onClick={() => { setApprovalAction('review_requested'); setShowApprovalDialog(true); }}>
                <Eye className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Request Review</span>
              </Button>
              <Button size="sm" variant="outline" className="shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => { setApprovalAction('revision_required'); setShowApprovalDialog(true); }}>
                <MessageSquare className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Revision</span>
              </Button>
              <Button size="sm" variant="destructive" className="shrink-0"
                onClick={() => { setApprovalAction('rejected'); setShowApprovalDialog(true); }}>
                <X className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            </>
          )}

          {/* Reviewer Actions */}
          {canCompleteReview && (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
              onClick={() => { setApprovalAction('review_completed'); setShowApprovalDialog(true); }}>
              <UserCheck className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Complete Review</span>
            </Button>
          )}

          {/* Post-review accounting approval */}
          {canApproveAfterReview && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0"
              onClick={() => { setApprovalAction('accounting_approved'); setShowApprovalDialog(true); }}>
              <Check className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Final Approve</span>
            </Button>
          )}

          {/* Mark as Paid */}
          {canMarkAsPaid && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              onClick={() => { setApprovalAction('paid'); setShowApprovalDialog(true); }}>
              <CheckCircle2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Mark Paid</span>
            </Button>
          )}
        </div>
      </div>

      {/* Review Request Banner */}
      {document.status === 'review_requested' && docAny.review_requested_to_name && (
        <Alert className="border-purple-300 bg-purple-50">
          <Eye className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            <strong>Review requested</strong> from {docAny.review_requested_to_name}
            {docAny.review_notes && <span className="block mt-1 text-sm">Notes: {docAny.review_notes}</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Review Completed Banner */}
      {document.status === 'review_completed' && docAny.review_completed_notes && (
        <Alert className="border-indigo-300 bg-indigo-50">
          <UserCheck className="h-4 w-4 text-indigo-600" />
          <AlertDescription className="text-indigo-800">
            <strong>Review completed</strong> — ready for accounting final approval
            <span className="block mt-1 text-sm">Reviewer notes: {docAny.review_completed_notes}</span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg sm:text-xl">Commission: {document.job_name_id}</CardTitle>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            {getDialogDescription() && (
              <DialogDescription>{getDialogDescription()}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {/* Reviewer selector — only for "Request Review" action */}
            {approvalAction === 'review_requested' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Reviewer</label>
                <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                  <SelectTrigger><SelectValue placeholder="Choose an admin or manager..." /></SelectTrigger>
                  <SelectContent>
                    {reviewerOptions?.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} <span className="text-muted-foreground ml-1">({r.role})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Textarea
              placeholder={
                approvalAction === 'rejected' ? 'Reason for rejection (required)...' :
                approvalAction === 'revision_required' ? 'Describe what needs to be revised (required)...' :
                approvalAction === 'review_requested' ? 'Notes for the reviewer (optional)...' :
                approvalAction === 'review_completed' ? 'Your review findings and recommendation...' :
                'Comment (optional)...'
              }
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowApprovalDialog(false); setApprovalComment(""); setSelectedReviewer(""); }}>
              Cancel
            </Button>
            <Button
              variant={approvalAction === 'rejected' ? 'destructive' : 'default'}
              className={
                approvalAction === 'review_requested' ? 'bg-purple-600 hover:bg-purple-700' :
                approvalAction === 'review_completed' ? 'bg-indigo-600 hover:bg-indigo-700' :
                approvalAction === 'revision_required' ? 'bg-amber-600 hover:bg-amber-700' :
                approvalAction === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' :
                approvalAction !== 'rejected' ? 'bg-green-600 hover:bg-green-700' : ''
              }
              onClick={handleApprovalAction}
              disabled={
                updateStatusMutation.isPending || 
                (approvalAction === 'rejected' && !approvalComment.trim()) ||
                (approvalAction === 'revision_required' && !approvalComment.trim()) ||
                (approvalAction === 'review_requested' && !selectedReviewer)
              }
            >
              {approvalAction === 'manager_approved' && 'Approve'}
              {approvalAction === 'accounting_approved' && 'Approve & Schedule Payment'}
              {approvalAction === 'paid' && 'Confirm Paid'}
              {approvalAction === 'rejected' && 'Reject'}
              {approvalAction === 'revision_required' && 'Send Back for Revision'}
              {approvalAction === 'review_requested' && 'Send Review Request'}
              {approvalAction === 'review_completed' && 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}