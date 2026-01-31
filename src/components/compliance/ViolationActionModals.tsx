import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Ban, TrendingUp, CheckCircle, Unlock, ThumbsUp, ThumbsDown } from "lucide-react";

interface Violation {
  id: string;
  created_at: string;
  severity: string;
  sop_key: string;
  department: string | null;
  job_id: string | null;
  description: string;
  status: string | null;
  violation_type: string;
  evidence?: any;
}

interface ViolationActionModalsProps {
  violation: Violation | null;
  action: string | null;
  onClose: () => void;
}

export function ViolationActionModals({ violation, action, onClose }: ViolationActionModalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["compliance-violations"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-violations-open-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-holds"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-holds-active-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-escalations"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-escalations-pending-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-audit-log"] });
  };

  const applyHoldMutation = useMutation({
    mutationFn: async () => {
      if (!violation) return;
      
      // Create hold
      await supabase.from("compliance_holds").insert({
        created_by_user_id: user?.id,
        hold_type: "violation_hold",
        job_id: violation.job_id,
        related_entity_type: "violation",
        related_entity_id: violation.id,
        reason: notes || `Hold applied for violation: ${violation.sop_key}`,
        status: "active",
      });
      
      // Update violation status
      await supabase
        .from("compliance_violations")
        .update({ status: "blocked" })
        .eq("id", violation.id);
      
      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "apply_hold_to_violation",
        target_type: "violation",
        target_id: violation.id,
        metadata: { sop_key: violation.sop_key, notes },
      });
    },
    onSuccess: () => {
      toast.success("Hold applied successfully");
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!violation) return;
      
      // Create escalation
      await supabase.from("compliance_escalations").insert({
        violation_id: violation.id,
        escalated_by_user_id: user?.id,
        reason: notes || `Escalated: ${violation.description}`,
        status: "pending",
      });
      
      // Update violation
      await supabase
        .from("compliance_violations")
        .update({ status: "escalated", escalation_required: true })
        .eq("id", violation.id);
      
      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "escalate_violation",
        target_type: "violation",
        target_id: violation.id,
        metadata: { sop_key: violation.sop_key, reason: notes },
      });
    },
    onSuccess: () => {
      toast.success("Violation escalated to admin");
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!violation) return;
      
      await supabase
        .from("compliance_violations")
        .update({
          status: "resolved",
          resolved_by_user_id: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq("id", violation.id);
      
      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "resolve_violation",
        target_type: "violation",
        target_id: violation.id,
        metadata: { sop_key: violation.sop_key, resolution_notes: notes },
      });
    },
    onSuccess: () => {
      toast.success("Violation resolved");
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const releaseHoldMutation = useMutation({
    mutationFn: async () => {
      if (!violation) return;
      
      // Release any active holds for this violation
      await supabase
        .from("compliance_holds")
        .update({
          status: "released",
          released_by_user_id: user?.id,
          released_at: new Date().toISOString(),
        })
        .eq("related_entity_id", violation.id)
        .eq("status", "active");
      
      // Update violation status back to open
      await supabase
        .from("compliance_violations")
        .update({ status: "open" })
        .eq("id", violation.id);
      
      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "release_hold_on_violation",
        target_type: "violation",
        target_id: violation.id,
        metadata: { sop_key: violation.sop_key, notes },
      });
    },
    onSuccess: () => {
      toast.success("Hold released");
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  const adminDecisionMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      if (!violation) return;
      
      const newStatus = approved ? "resolved" : "open";
      
      // Update escalation
      await supabase
        .from("compliance_escalations")
        .update({
          status: approved ? "approved" : "denied",
          decided_by_user_id: user?.id,
          decided_at: new Date().toISOString(),
          final_decision_notes: notes,
        })
        .eq("violation_id", violation.id)
        .eq("status", "pending");
      
      // Update violation
      const updateData: any = { status: newStatus };
      if (approved) {
        updateData.resolved_by_user_id = user?.id;
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution_notes = notes;
      }
      
      await supabase
        .from("compliance_violations")
        .update(updateData)
        .eq("id", violation.id);
      
      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: approved ? "approve_escalation" : "deny_escalation",
        target_type: "violation",
        target_id: violation.id,
        metadata: { sop_key: violation.sop_key, decision: approved ? "approved" : "denied", notes },
      });
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed: " + e.message),
  });

  if (!violation || !action) return null;

  const severityColors: Record<string, string> = {
    minor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    severe: "bg-red-500/15 text-red-600 border-red-500/30",
  };

  const renderContent = () => {
    switch (action) {
      case "view":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Violation Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">SOP</Label>
                  <p className="font-mono">{violation.sop_key}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <Badge variant="outline" className={severityColors[violation.severity]}>
                    {violation.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p className="capitalize">{violation.department || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Job ID</Label>
                  <p>{violation.job_id || "—"}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p>{violation.violation_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm">{violation.description}</p>
              </div>
              {violation.evidence && (
                <div>
                  <Label className="text-muted-foreground">Evidence</Label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(violation.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        );

      case "apply_hold":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-orange-500" />
                Apply Hold
              </DialogTitle>
              <DialogDescription>
                This will block the related job/commission until the hold is released.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Reason / Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why this hold is being applied..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => applyHoldMutation.mutate()} disabled={applyHoldMutation.isPending}>
                {applyHoldMutation.isPending ? "Applying..." : "Apply Hold"}
              </Button>
            </DialogFooter>
          </>
        );

      case "escalate":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Escalate to Admin
              </DialogTitle>
              <DialogDescription>
                This violation will be sent to the admin for final decision.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Escalation Reason *</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain why this needs admin attention..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => escalateMutation.mutate()} disabled={!notes || escalateMutation.isPending}>
                {escalateMutation.isPending ? "Escalating..." : "Escalate"}
              </Button>
            </DialogFooter>
          </>
        );

      case "resolve":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Resolve Violation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Resolution Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document how this was resolved..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
                {resolveMutation.isPending ? "Resolving..." : "Mark Resolved"}
              </Button>
            </DialogFooter>
          </>
        );

      case "release_hold":
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-blue-500" />
                Release Hold
              </DialogTitle>
              <DialogDescription>
                This will release any active holds on this violation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for releasing..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => releaseHoldMutation.mutate()} disabled={releaseHoldMutation.isPending}>
                {releaseHoldMutation.isPending ? "Releasing..." : "Release Hold"}
              </Button>
            </DialogFooter>
          </>
        );

      case "approve":
      case "deny":
        const isApprove = action === "approve";
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isApprove ? (
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                ) : (
                  <ThumbsDown className="w-5 h-5 text-red-500" />
                )}
                {isApprove ? "Approve Escalation" : "Deny Escalation"}
              </DialogTitle>
              <DialogDescription>
                {isApprove
                  ? "This will resolve the violation and close the escalation."
                  : "This will return the violation to open status."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Decision Notes *</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document your decision..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                variant={isApprove ? "default" : "destructive"}
                onClick={() => adminDecisionMutation.mutate(isApprove)}
                disabled={!notes || adminDecisionMutation.isPending}
              >
                {adminDecisionMutation.isPending ? "Saving..." : isApprove ? "Approve" : "Deny"}
              </Button>
            </DialogFooter>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={!!action} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
