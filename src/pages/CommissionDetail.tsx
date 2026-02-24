import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
  History,
  Loader2,
  UserCheck,
  Calculator,
  Send,
  Edit,
  Ban,
  Trash2,
  RotateCcw,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { formatDisplayName } from "@/lib/displayName";
import { cn } from "@/lib/utils";
import { CommissionWorksheet } from "@/components/commissions/CommissionWorksheet";
import { CommissionStatusTimeline } from "@/components/commissions/CommissionStatusTimeline";
import { CommissionEditForm } from "@/components/commissions/CommissionEditForm";
import { DrawCloseOutForm } from "@/components/commissions/DrawCloseOutForm";
import { OverrideDetailSection } from "@/components/commissions/OverrideDetailSection";
import {
  useCommissionSubmission,
  useCommissionStatusLog,
  useUpdateCommissionStatus,
  useIsCommissionReviewer,
  useCanProcessPayouts,
  useDeleteCommission,
  useRevertCommission,
} from "@/hooks/useCommissions";
import { slugifyRep } from "@/hooks/useCommissionEntries";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatPayDateShort } from "@/lib/commissionPayDateCalculations";
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
  rejected: { label: "Rejected", variant: "destructive", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600" },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
  denied: { label: "Denied", variant: "destructive", icon: <XCircle className="h-4 w-4" />, color: "text-red-800" },
  paid: { label: "Paid", variant: "outline", icon: <DollarSign className="h-4 w-4" />, color: "text-blue-600" },
};

// Approval stage labels: Phase 2 = Compliance Review (Manny Madrid / Sheldon backup), Phase 3 = Accounting (Courtney)
const APPROVAL_STAGE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending_manager: { label: "Awaiting Compliance Review", icon: <UserCheck className="h-4 w-4" />, color: "text-amber-600" },
  pending_accounting: { label: "Compliance Approved — Awaiting Accounting", icon: <Calculator className="h-4 w-4" />, color: "text-blue-600" },
  pending_admin: { label: "Awaiting Admin Review (Sheldon/Manny)", icon: <UserCheck className="h-4 w-4" />, color: "text-purple-600" },
  completed: { label: "Fully Approved", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
};

export default function CommissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role } = useAuth();
  const { data: submission, isLoading, refetch } = useCommissionSubmission(id!);
  const { data: statusLog } = useCommissionStatusLog(id!);
  const { data: isReviewer } = useIsCommissionReviewer();
  const { data: canPayout } = useCanProcessPayouts();
  const updateStatus = useUpdateCommissionStatus();
  const deleteCommission = useDeleteCommission();
  const revertCommission = useRevertCommission();

  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  
  // Support ?edit=true URL param to auto-open edit mode
  const editParam = searchParams.get("edit") === "true";
  const [isEditing, setIsEditing] = useState(editParam);
  const [isClosingOut, setIsClosingOut] = useState(false);

  const isAdmin = role === "admin";
  
  // Check if the current user is the submitter and can edit
  const isSubmitter = submission && user && submission.submitted_by === user.id;
  const canEdit = isSubmitter && (submission?.status === "rejected" || submission?.status === "denied");
  // Draw-to-final: rep can close out a paid draw to submit final commission
  const canCloseOutDraw = isSubmitter && !!submission?.is_draw && submission?.status === "paid" && !(submission as { draw_closed_out?: boolean }).draw_closed_out;

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
  const approvalStageConfig = submission.approval_stage ? APPROVAL_STAGE_CONFIG[submission.approval_stage] : null;

  // Changed fields from previous submission (for compliance: highlight what rep revised on resubmit)
  const changedFields = useMemo(() => {
    const snap = submission.previous_submission_snapshot as Record<string, unknown> | null | undefined;
    if (!snap || typeof snap !== "object") return new Set<string>();
    const set = new Set<string>();
    const keys = [
      "job_name", "job_address", "acculynx_job_id", "job_type", "roof_type", "contract_date", "install_completion_date",
      "sales_rep_name", "rep_role", "commission_tier", "custom_commission_percentage", "subcontractor_name",
      "is_flat_fee", "flat_fee_amount", "contract_amount", "supplements_approved", "commission_percentage",
      "advances_paid", "net_commission_owed", "commission_requested", "total_job_revenue", "gross_commission",
    ];
    keys.forEach((key) => {
      const prev = snap[key];
      const cur = (submission as Record<string, unknown>)[key];
      const prevVal = prev === null || prev === undefined ? "" : String(prev);
      const curVal = cur === null || cur === undefined ? "" : String(cur);
      if (prevVal !== curVal) set.add(key);
    });
    return set;
  }, [submission]);
  const showChangeHighlights = (isReviewer || isAdmin) && changedFields.size > 0;
  const highlightClass = "bg-yellow-200/90 dark:bg-yellow-900/40 border-l-4 border-yellow-500 pl-2 -ml-2 rounded-r";

  // Determine available actions based on approval stage
  const isPendingManager = submission.status === "pending_review" && submission.approval_stage === "pending_manager";
  const isPendingAccounting = submission.status === "pending_review" && submission.approval_stage === "pending_accounting";
  const isPendingAdmin = submission.status === "pending_review" && submission.approval_stage === "pending_admin";
  const isApproved = submission.status === "approved";
  const isDenied = submission.status === "denied";

  // Phase 2 (Compliance Review): only Compliance Officer (Manny) or Admin (Sheldon) can action — managers removed from chain
  const canDoComplianceReview = (role === "admin" || role === "ops_compliance") && isPendingManager;
  // Accounting can approve if pending_accounting stage (Courtney; reviewers in commission_reviewers)
  const canAccountingApprove = isReviewer && isPendingAccounting;
  // Admin can approve if pending_admin stage (manager submissions only)
  const canAdminApprove = isAdmin && isPendingAdmin;
  // Can request revision at any pending stage (except denied): Compliance, Accounting, or Admin
  const canRequestRevision = (canDoComplianceReview || canAccountingApprove || canAdminApprove);
  // Can deny at any pending stage: same roles
  const canDeny = (canDoComplianceReview || canAccountingApprove || canAdminApprove);
  // Can mark paid only if approved and has payout permission; once marked paid, only admin can revert
  const canMarkPaid = canPayout && isApproved;
  // Admin-only: revert to previous phase (e.g. paid → approved, or approved → pending accounting)
  const canRevert = isAdmin && (submission.status === "paid" || (submission.status === "approved" && submission.approval_stage === "completed") || (submission.status === "pending_review" && submission.approval_stage === "pending_accounting"));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const handleComplianceApprove = async () => {
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "pending_review",
      approval_stage: "pending_accounting", // Compliance Review complete — forward to Accounting (Courtney)
      notes: reviewerNotes || "Compliance approved - forwarded to accounting",
    });
    setReviewerNotes("");
  };

  const handleAccountingApprove = async () => {
    // Accounting is always the final step — approves for payment
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "approved",
      approval_stage: "completed",
      notes: reviewerNotes || "🎉 Approved - ready for payout",
    });
    setReviewerNotes("");
  };

  const handleAdminApprove = async () => {
    // Admin/Sheldon approves manager submissions → routes to accounting for final review & mark paid
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "pending_review",
      approval_stage: "pending_accounting",
      notes: reviewerNotes || "Admin approved - sent to accounting for final review & payment",
    });
    setReviewerNotes("");
  };

  const handleRequestRevision = async () => {
    if (!rejectionReason.trim()) return;
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "rejected",
      rejection_reason: rejectionReason,
    });
    setRejectionReason("");
  };

  const handleDeny = async () => {
    if (!rejectionReason.trim() || !user?.id) return;
    // Deny commission - this will lock the job number
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "denied",
      approval_stage: "completed",
      rejection_reason: rejectionReason,
    });

    // Lock job number if exists
    if (submission.acculynx_job_id && submission.acculynx_job_id.length === 4) {
      try {
        await supabase.from("denied_job_numbers").insert({
          job_number: submission.acculynx_job_id,
          commission_id: submission.id,
          denied_by: user.id,
          denial_reason: rejectionReason,
        });
      } catch (e) {
        // Ignore duplicate key errors
      }
    }
    setRejectionReason("");
  };

  const handleMarkPaid = async () => {
    await updateStatus.mutateAsync({
      id: submission.id,
      status: "paid",
      notes: "Marked as paid",
    });
  };

  // Handle closing edit mode
  const handleCloseEdit = () => {
    setIsEditing(false);
    // Clear edit param from URL
    if (searchParams.has("edit")) {
      searchParams.delete("edit");
      setSearchParams(searchParams);
    }
  };

  // Handle successful edit
  const handleEditSuccess = () => {
    handleCloseEdit();
    refetch();
  };

  // If closing out a draw, show the close-out form
  if (isClosingOut && submission) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setIsClosingOut(false); refetch(); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Close Out Job — Request Final Commission</h1>
              <p className="text-muted-foreground">{submission.job_name}</p>
            </div>
          </div>
          
          <DrawCloseOutForm
            submission={submission}
            onSuccess={() => { setIsClosingOut(false); refetch(); }}
            onCancel={() => { setIsClosingOut(false); refetch(); }}
          />
        </div>
      </AppLayout>
    );
  }

  // If editing, show the edit form
  if (isEditing && submission) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleCloseEdit}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Commission</h1>
              <p className="text-muted-foreground">{submission.job_name}</p>
            </div>
          </div>
          
          <CommissionEditForm
            submission={submission}
            onSuccess={handleEditSuccess}
            onCancel={handleCloseEdit}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/commissions")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{submission.job_name}</h1>
                <Badge variant={statusConfig?.variant} className="gap-1">
                  {statusConfig?.icon}
                  {statusConfig?.label}
                </Badge>
                {submission.is_draw && (
                  (submission as { draw_closed_out?: boolean }).draw_closed_out ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                      <CheckCircle2 className="h-4 w-4" />
                      Final Commission
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                      <DollarSign className="h-4 w-4" />
                      Draw
                    </Badge>
                  )
                )}
                {submission.was_rejected && (
                  <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                    <AlertCircle className="h-4 w-4" />
                    Rejected
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{submission.job_address}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {submission.status === "paid" && submission.sales_rep_name && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const isOwnSubmission = user && submission.submitted_by === user.id;
                  if (isOwnSubmission) {
                    navigate("/my-commissions");
                  } else {
                    navigate(`/commission-tracker/${slugifyRep(submission.sales_rep_name!)}`);
                  }
                }}
              >
                <BarChart3 className="h-4 w-4" />
                View in Tracker
              </Button>
            )}
            {canCloseOutDraw && (
              <Button onClick={() => setIsClosingOut(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Close Out & Request Final Commission
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit & Resubmit
              </Button>
            )}
          </div>
        </div>

        {/* Pay Run / Scheduled Pay Date — visible to rep so they know which week they'll be paid */}
        {submission.scheduled_pay_date && (
          <Card className="border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-800/50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Scheduled pay run:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatPayDateShort(submission.scheduled_pay_date)}
                </span>
                <span className="text-muted-foreground text-xs">
                  (assigned at submission based on Tuesday 3:00 PM MST cutoff)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Timeline */}
        <CommissionStatusTimeline
          status={submission.status}
          approvalStage={submission.approval_stage}
          isManagerSubmission={submission.is_manager_submission || false}
        />

        {/* Rejected Alert for Submitters */}
        {isSubmitter && submission.status === "rejected" && submission.rejection_reason && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-400">Your commission for {submission.job_name} was rejected.</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
                    {submission.rejection_reason}
                  </p>
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    size="sm" 
                    className="mt-3 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Edit className="h-4 w-4" />
                    Edit & Resubmit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Denied Alert for Submitters */}
        {isSubmitter && submission.status === "denied" && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-800 dark:text-red-400">Commission Denied</p>
                  {submission.rejection_reason && (
                    <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">
                      {submission.rejection_reason}
                    </p>
                  )}
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    size="sm" 
                    className="mt-3 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Edit className="h-4 w-4" />
                    Edit & Resubmit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Stage Indicator */}
        {submission.status === "pending_review" && approvalStageConfig && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-background ${approvalStageConfig.color}`}>
                  {approvalStageConfig.icon}
                </div>
                <div>
                  <p className="font-medium">{approvalStageConfig.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {submission.approval_stage === "pending_manager" 
                      ? "This commission needs compliance review before going to accounting."
                      : "Compliance has approved. Waiting for accounting to review and approve."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviewer Actions */}
        {isReviewer && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Reviewer Actions
              </CardTitle>
              <CardDescription>
                {isPendingManager && "This commission is awaiting compliance review (Compliance Officer or Admin)."}
                {isPendingAccounting && "Compliance approved. Please review and approve for accounting."}
                {isPendingAdmin && "Awaiting admin approval for this manager submission."}
                {isApproved && "This commission is approved and ready for payout."}
                {submission.status === "paid" && "This commission has been paid."}
                {submission.status === "rejected" && "This commission has been rejected and requires resubmission from the submitter."}
                {isDenied && "This commission has been denied. The job number is permanently locked."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(canDoComplianceReview || canAccountingApprove || canAdminApprove) && (
                <div className="space-y-2">
                  <Label>Reviewer Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add notes about this submission..."
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {/* Compliance Review Approve (Phase 2): Compliance Officer or Admin only — managers not in chain */}
                {canDoComplianceReview && (
                  <Button 
                    onClick={handleComplianceApprove}
                    disabled={updateStatus.isPending}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Approve & Send to Accounting
                  </Button>
                )}
                
                {/* Accounting Approve Button */}
                {canAccountingApprove && (
                  <Button 
                    onClick={handleAccountingApprove}
                    disabled={updateStatus.isPending}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve for Payment
                  </Button>
                )}
                
                {/* Admin Approve Button (for manager submissions) */}
                {canAdminApprove && (
                  <Button 
                    onClick={handleAdminApprove}
                    disabled={updateStatus.isPending}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve & Send to Accounting
                  </Button>
                )}
                
                {/* Reject: send back to submitter (status = rejected) */}
                {canRequestRevision && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                        <AlertCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Commission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a reason for rejecting. This will be sent to the submitter so they can resubmit.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4 space-y-2">
                        <Textarea
                          placeholder="Enter reason for rejection (required)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                          className={!rejectionReason.trim() ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
                        />
                        {!rejectionReason.trim() && (
                          <p className="text-sm text-destructive">Please provide a reason for sending this back.</p>
                        )}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleRequestRevision}
                          disabled={!rejectionReason.trim() || updateStatus.isPending}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {/* Deny Button */}
                {canDeny && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Ban className="h-4 w-4" />
                        Deny Commission
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">Deny Commission</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong className="text-destructive">Warning:</strong> Denying a commission will permanently lock the job number. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4 space-y-2">
                        <Textarea
                          placeholder="Enter denial reason (required)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                          className={!rejectionReason.trim() ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}
                        />
                        {!rejectionReason.trim() && (
                          <p className="text-sm text-destructive">Please provide a reason for denial.</p>
                        )}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeny}
                          disabled={!rejectionReason.trim() || updateStatus.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirm Denial
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {/* Mark as Paid Button */}
                {canMarkPaid && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="gap-2 bg-green-600 hover:bg-green-700">
                        <DollarSign className="h-4 w-4" />
                        Mark as Paid
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark Commission as Paid</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-2">
                            <p>
                              This will mark the commission of {formatCurrency(submission.net_commission_owed)} as paid. 
                              The submitter will be notified.
                            </p>
                            {submission.override_amount && submission.override_amount > 0 && (
                              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 text-sm space-y-1">
                                <p className="font-medium text-foreground">Payout Breakdown:</p>
                                <p>Rep Payout: <span className="font-semibold">{formatCurrency(submission.net_commission_owed)}</span></p>
                                <p className="text-purple-700 dark:text-purple-400">
                                  Sales Manager Override (10%): <span className="font-semibold">{formatCurrency(submission.override_amount)}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleMarkPaid}
                          disabled={updateStatus.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Confirm Payment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Admin-only: Revert to previous phase (record locked for non-admins once marked paid) */}
                {canRevert && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" disabled={revertCommission.isPending}>
                        {revertCommission.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Revert to Previous Phase
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revert Commission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Move this commission back one approval phase. Only admins can revert. This will unlock the record for editing or re-approval.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revertCommission.mutate(submission.id, { onSuccess: () => refetch() })}
                          disabled={revertCommission.isPending}
                        >
                          Revert
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Admin-only: Delete commission record. Non-admins cannot delete. */}
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
                            deleteCommission.mutate(submission.id, {
                              onSuccess: () => navigate("/commissions"),
                            });
                          }}
                          disabled={deleteCommission.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteCommission.isPending ? "Deleting..." : "Delete Permanently"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Show rejection reason if exists */}
              {submission.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Rejected:</p>
                  <p className="text-sm text-destructive/80">{submission.rejection_reason}</p>
                </div>
              )}

              {/* Show reviewer notes if exists */}
              {submission.reviewer_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Reviewer Notes:</p>
                  <p className="text-sm text-muted-foreground">{submission.reviewer_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resubmitted: show what changed (compliance view) */}
        {showChangeHighlights && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="py-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                This is a resubmitted rejected commission. Fields highlighted in yellow were changed from the previous submission.
              </p>
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
              <div className={cn(showChangeHighlights && changedFields.has("job_name") && highlightClass)}>
                <dt className="text-muted-foreground">Job Name</dt>
                <dd className="font-medium">{submission.job_name}</dd>
              </div>
              <div className={cn(showChangeHighlights && changedFields.has("job_address") && highlightClass)}>
                <dt className="text-muted-foreground">Job Address</dt>
                <dd className="font-medium">{submission.job_address}</dd>
              </div>
              <div className={cn(showChangeHighlights && changedFields.has("acculynx_job_id") && highlightClass)}>
                <dt className="text-muted-foreground">AccuLynx Job ID</dt>
                <dd className="font-medium">{submission.acculynx_job_id || "N/A"}</dd>
              </div>
              <div className={cn(showChangeHighlights && changedFields.has("job_type") && highlightClass)}>
                <dt className="text-muted-foreground">Job Type</dt>
                <dd className="font-medium capitalize">{submission.job_type}</dd>
              </div>
              <div className={cn(showChangeHighlights && changedFields.has("roof_type") && highlightClass)}>
                <dt className="text-muted-foreground">Roof Type</dt>
                <dd className="font-medium capitalize">{submission.roof_type}</dd>
              </div>
              <div className={cn(showChangeHighlights && changedFields.has("contract_date") && highlightClass)}>
                <dt className="text-muted-foreground">Contract Date</dt>
                <dd className="font-medium">{format(new Date(submission.contract_date), "MMM d, yyyy")}</dd>
              </div>
              <div className={cn(showChangeHighlights && changedFields.has("install_completion_date") && highlightClass)}>
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
                  <div className={cn(showChangeHighlights && changedFields.has("subcontractor_name") && highlightClass)}>
                    <dt className="text-muted-foreground">Subcontractor Name</dt>
                    <dd className="font-medium">{submission.subcontractor_name}</dd>
                  </div>
                  <div className={cn(showChangeHighlights && changedFields.has("is_flat_fee") && highlightClass)}>
                    <dt className="text-muted-foreground">Commission Type</dt>
                    <dd className="font-medium">
                      {submission.is_flat_fee ? "Flat Fee" : "Percentage"}
                    </dd>
                  </div>
                  {submission.is_flat_fee && (
                    <div className={cn(showChangeHighlights && changedFields.has("flat_fee_amount") && highlightClass)}>
                      <dt className="text-muted-foreground">Flat Fee Amount</dt>
                      <dd className="font-medium">{formatCurrency(submission.flat_fee_amount || 0)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={cn(showChangeHighlights && changedFields.has("sales_rep_name") && highlightClass)}>
                    <dt className="text-muted-foreground">Sales Rep</dt>
                    <dd className="font-medium">{formatDisplayName(submission.sales_rep_name)}</dd>
                  </div>
                  <div className={cn(showChangeHighlights && changedFields.has("rep_role") && highlightClass)}>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="font-medium capitalize">{submission.rep_role}</dd>
                  </div>
                  <div className={cn(showChangeHighlights && (changedFields.has("commission_tier") || changedFields.has("custom_commission_percentage")) && highlightClass)}>
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

        {/* Draw + Final Commission amounts (for closed-out draws) */}
        {submission.is_draw && (submission as { draw_closed_out?: boolean; draw_amount_paid?: number }).draw_closed_out && (
          <Card className="border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-800/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Draw + Final Commission
              </CardTitle>
              <CardDescription>
                This job had a draw advance; both amounts are shown for accounting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Draw paid</dt>
                  <dd className="font-semibold text-amber-700 dark:text-amber-400">
                    {formatCurrency((submission as { draw_amount_paid?: number }).draw_amount_paid ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Final commission</dt>
                  <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(submission.net_commission_owed ?? 0)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Sales Manager Override Section */}
        <OverrideDetailSection commission={submission} />

        {/* Commission Worksheet (Read-only) */}
        <div className={cn(
          showChangeHighlights && (
            changedFields.has("contract_amount") ||
            changedFields.has("supplements_approved") ||
            changedFields.has("commission_percentage") ||
            changedFields.has("advances_paid") ||
            changedFields.has("net_commission_owed") ||
            changedFields.has("gross_commission") ||
            changedFields.has("total_job_revenue")
          ) && "ring-2 ring-yellow-400 dark:ring-yellow-600 rounded-lg p-1"
        )}>
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
        </div>

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
