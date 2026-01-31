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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Escalation {
  id: string;
  created_at: string;
  violation_id: string;
  escalated_by_user_id: string | null;
  reason: string | null;
  status: string | null;
  final_decision_notes: string | null;
  decided_at: string | null;
  decided_by_user_id: string | null;
  compliance_violations?: {
    id: string;
    sop_key: string;
    description: string;
    severity: string;
    status: string | null;
    department: string | null;
    job_id: string | null;
    violation_type: string;
  } | null;
  escalated_by_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface EscalationActionModalsProps {
  escalation: Escalation | null;
  action: string | null;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  minor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  severe: "bg-red-500/15 text-red-600 border-red-500/30",
};

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  approved: "bg-green-500/15 text-green-600 border-green-500/30",
  denied: "bg-red-500/15 text-red-600 border-red-500/30",
  closed: "bg-gray-500/15 text-gray-600 border-gray-500/30",
};

export function EscalationActionModals({ escalation, action, onClose }: EscalationActionModalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<"approve" | "deny">(action === "deny" ? "deny" : "approve");
  const [notes, setNotes] = useState("");

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["compliance-escalations"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-escalations-pending-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-violations"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-violations-open-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-holds"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-holds-active-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-audit-log"] });
  };

  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!escalation) return;
      
      const isApproved = decision === "approve";
      const violationId = escalation.violation_id;

      // 1. Update escalation
      const { error: escError } = await supabase
        .from("compliance_escalations")
        .update({
          status: isApproved ? "approved" : "denied",
          decided_by_user_id: user?.id,
          decided_at: new Date().toISOString(),
          final_decision_notes: notes,
        })
        .eq("id", escalation.id);
      
      if (escError) throw escError;

      // 2. Update related violation
      const violationUpdate: any = {
        status: isApproved ? "resolved" : "blocked",
      };
      
      if (isApproved) {
        violationUpdate.resolved_by_user_id = user?.id;
        violationUpdate.resolved_at = new Date().toISOString();
        violationUpdate.resolution_notes = `Exception approved by admin: ${notes}`;
      }

      const { error: violError } = await supabase
        .from("compliance_violations")
        .update(violationUpdate)
        .eq("id", violationId);
      
      if (violError) throw violError;

      // 3. If approved, release any related holds
      if (isApproved) {
        await supabase
          .from("compliance_holds")
          .update({
            status: "released",
            released_by_user_id: user?.id,
            released_at: new Date().toISOString(),
          })
          .eq("related_entity_id", violationId)
          .eq("status", "active");
      }

      // 4. Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: isApproved ? "approve_escalation" : "deny_escalation",
        target_type: "escalation",
        target_id: escalation.id,
        metadata: { 
          decision: isApproved ? "approved" : "denied",
          violation_id: violationId,
          notes,
          exception_granted: isApproved,
        },
      });

      // 5. Additional audit log for violation resolution/blocking
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: isApproved ? "resolve_violation_via_escalation" : "block_violation_via_escalation",
        target_type: "violation",
        target_id: violationId,
        metadata: { 
          escalation_id: escalation.id,
          decision: isApproved ? "exception_approved" : "enforcement_continued",
        },
      });
    },
    onSuccess: () => {
      toast.success(decision === "approve" 
        ? "Escalation approved - violation resolved and holds released" 
        : "Escalation denied - enforcement continues"
      );
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed to process decision: " + e.message),
  });

  if (!escalation) return null;

  const violation = escalation.compliance_violations;

  // View Details Dialog
  if (action === "view") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Escalation Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge variant="outline" className={statusColors[escalation.status || "pending"]}>
                    {escalation.status || "pending"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p>{format(new Date(escalation.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Escalated By</Label>
                <p>{escalation.escalated_by_profile?.full_name || escalation.escalated_by_profile?.email || "Unknown"}</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Reason for Escalation</Label>
              <p className="text-sm mt-1">{escalation.reason || "No reason provided"}</p>
            </div>

            {violation && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Related Violation
                  </Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{violation.sop_key}</span>
                      <Badge variant="outline" className={severityColors[violation.severity]}>
                        {violation.severity}
                      </Badge>
                    </div>
                    <p>{violation.description}</p>
                    {violation.job_id && (
                      <p className="text-muted-foreground">Job: {violation.job_id}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {escalation.final_decision_notes && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Decision Notes</Label>
                  <p className="text-sm mt-1">{escalation.final_decision_notes}</p>
                  {escalation.decided_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Decided: {format(new Date(escalation.decided_at), "MMM d, yyyy h:mm a")}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Approve/Deny Dialog (admin only)
  if (action === "approve" || action === "deny") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decision === "approve" ? (
                <ThumbsUp className="w-5 h-5 text-green-500" />
              ) : (
                <ThumbsDown className="w-5 h-5 text-red-500" />
              )}
              Review Escalation
            </DialogTitle>
            <DialogDescription>
              Make a final decision on this escalated violation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Violation Details (read-only) */}
            {violation && (
              <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Violation Details</span>
                  </div>
                  <Badge variant="outline" className={severityColors[violation.severity]}>
                    {violation.severity}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">SOP:</span>{" "}
                    <span className="font-mono">{violation.sop_key}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dept:</span>{" "}
                    <span className="capitalize">{violation.department || "—"}</span>
                  </div>
                  {violation.job_id && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Job:</span> {violation.job_id}
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">{violation.description}</p>
              </div>
            )}

            {/* Escalation Reason */}
            <div>
              <Label className="text-muted-foreground">Escalation Reason</Label>
              <p className="text-sm mt-1 p-2 bg-muted/50 rounded">
                {escalation.reason || "No reason provided"}
              </p>
            </div>

            <Separator />

            {/* Decision */}
            <div className="space-y-3">
              <Label>Your Decision *</Label>
              <RadioGroup
                value={decision}
                onValueChange={(v) => setDecision(v as "approve" | "deny")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="approve" id="approve" />
                  <Label htmlFor="approve" className="font-normal flex items-center gap-1 text-green-600">
                    <ThumbsUp className="w-4 h-4" />
                    Approve (Grant Exception)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="deny" id="deny" />
                  <Label htmlFor="deny" className="font-normal flex items-center gap-1 text-red-600">
                    <ThumbsDown className="w-4 h-4" />
                    Deny (Continue Enforcement)
                  </Label>
                </div>
              </RadioGroup>

              {decision === "approve" && (
                <p className="text-xs text-green-600 bg-green-500/10 p-2 rounded">
                  ✓ This will resolve the violation and release any related holds.
                </p>
              )}
              {decision === "deny" && (
                <p className="text-xs text-red-600 bg-red-500/10 p-2 rounded">
                  ✗ This will block the violation and enforcement will continue.
                </p>
              )}
            </div>

            {/* Decision Notes */}
            <div className="space-y-2">
              <Label>Decision Notes *</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Document your decision and reasoning..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={decision === "approve" ? "default" : "destructive"}
              onClick={() => decisionMutation.mutate()}
              disabled={!notes || decisionMutation.isPending}
            >
              {decisionMutation.isPending 
                ? "Processing..." 
                : decision === "approve" 
                  ? "Approve & Resolve" 
                  : "Deny & Block"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
