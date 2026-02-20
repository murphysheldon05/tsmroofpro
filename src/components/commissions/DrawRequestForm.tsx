import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSubmitDrawRequest } from "@/hooks/useDrawRequests";
import { useUserHoldsCheck } from "@/hooks/useComplianceHoldCheck";
import { AlertTriangle, Loader2, DollarSign } from "lucide-react";

interface DrawRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DrawRequestForm({ open, onOpenChange }: DrawRequestFormProps) {
  const submitDraw = useSubmitDrawRequest();
  const { data: holds } = useUserHoldsCheck();
  const hasCommissionHold = holds?.some(h => h.hold_type === "commission_hold");

  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [estimatedCommission, setEstimatedCommission] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Refs for Enter-to-advance
  const jobNameRef = useRef<HTMLInputElement>(null);
  const estCommRef = useRef<HTMLInputElement>(null);
  const reqAmtRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const advanceOnEnter = useCallback((e: React.KeyboardEvent, nextRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  }, []);

  const estComm = parseFloat(estimatedCommission) || 0;
  const reqAmount = parseFloat(requestedAmount) || 0;
  const maxFromCommission = estComm > 0 ? estComm * 0.5 : 1500;
  const cap = estComm > 0 ? Math.min(maxFromCommission, Infinity) : 1500;
  const exceedsCap = reqAmount > cap;
  const requiresManagerApproval = reqAmount > 1500;
  const needsEstimateForOver1500 = reqAmount > 1500 && estComm <= 0;

  const canSubmit =
    !hasCommissionHold &&
    jobNumber.trim() &&
    reqAmount > 0 &&
    !exceedsCap &&
    !needsEstimateForOver1500 &&
    !submitDraw.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitDraw.mutate(
      {
        job_number: jobNumber.trim(),
        job_name: jobName.trim() || undefined,
        requested_amount: reqAmount,
        estimated_commission: estComm > 0 ? estComm : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setJobNumber("");
          setJobName("");
          setEstimatedCommission("");
          setRequestedAmount("");
          setNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            Request a Draw
          </DialogTitle>
          <DialogDescription>
            Request an advance against a future job's commission. Maximum is 50% of estimated commission, capped at $1,500 without manager approval.
          </DialogDescription>
        </DialogHeader>

        {hasCommissionHold && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            You have an active commission hold. Draw requests are blocked.
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Job Number *</Label>
            <Input
              autoFocus
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              onKeyDown={(e) => advanceOnEnter(e, jobNameRef)}
              onFocus={(e) => e.target.select()}
              placeholder="Enter the AccuLynx job number"
            />
          </div>

          <div className="space-y-2">
            <Label>Job Name / Address</Label>
            <Input
              ref={jobNameRef}
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              onKeyDown={(e) => advanceOnEnter(e, estCommRef)}
              onFocus={(e) => e.target.select()}
              placeholder="Job reference for easy identification"
            />
          </div>

          <div className="space-y-2">
            <Label>Estimated Commission</Label>
            <Input
              ref={estCommRef}
              type="text"
              inputMode="decimal"
              value={estimatedCommission}
              onChange={(e) => setEstimatedCommission(e.target.value)}
              onKeyDown={(e) => advanceOnEnter(e, reqAmtRef)}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
            />
            {estComm > 0 && (
              <p className="text-xs text-muted-foreground">
                Maximum draw: ${(estComm * 0.5).toLocaleString()} (50% of estimated commission)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Draw Amount Requested *</Label>
            <Input
              ref={reqAmtRef}
              type="text"
              inputMode="decimal"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              onKeyDown={(e) => advanceOnEnter(e, notesRef)}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
            />
            {exceedsCap && estComm > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Amount exceeds 50% of estimated commission (${(estComm * 0.5).toLocaleString()})
              </p>
            )}
            {needsEstimateForOver1500 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Please enter the estimated commission to request more than $1,500
              </p>
            )}
            {requiresManagerApproval && !needsEstimateForOver1500 && !exceedsCap && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                Draw requests over $1,500 require Sales Manager approval and may take additional review time
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason / Notes</Label>
            <Textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why do you need this advance?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitDraw.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
