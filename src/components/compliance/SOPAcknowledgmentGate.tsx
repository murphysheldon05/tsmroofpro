import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, FileText, Loader2 } from "lucide-react";
import { useSOPAcknowledgment } from "@/hooks/useSOPAcknowledgment";
import { SOPMASTER_SUMMARY, SOPMASTER_VERSION } from "@/lib/sopMasterConstants";
import { toast } from "sonner";

interface SOPAcknowledgmentGateProps {
  open: boolean;
  onClose: () => void;
  onAcknowledged?: () => void;
}

export function SOPAcknowledgmentGate({ open, onClose, onAcknowledged }: SOPAcknowledgmentGateProps) {
  const [agreed, setAgreed] = useState(false);
  const { acknowledge, isAcknowledging } = useSOPAcknowledgment();

  const handleAcknowledge = async () => {
    try {
      await acknowledge();
      toast.success("SOP Acknowledgment recorded successfully");
      onAcknowledged?.();
      onClose();
    } catch (e: any) {
      toast.error("Failed to record acknowledgment: " + e.message);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={() => {
        // Cannot dismiss by clicking outside
      }}
    >
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide close button
        hideClose
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                TSM Roof Pro — Master SOP Acknowledgment Required
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Version: {SOPMASTER_VERSION}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            Before performing governed actions (commission submissions, approvals, scheduling, etc.), 
            you must acknowledge that you have read and understand all Standard Operating Procedures.
          </p>
        </div>

        <Separator />

        <ScrollArea className="flex-1 max-h-[400px] pr-4">
          <div className="space-y-4 py-4">
            {SOPMASTER_SUMMARY.map((sop) => (
              <div key={sop.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {sop.id}
                  </Badge>
                  <h4 className="font-medium text-sm">{sop.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-0.5">
                  {sop.summary}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <div className="py-4">
          <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="sop-agreement"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="sop-agreement" 
              className="text-sm font-medium cursor-pointer leading-relaxed"
            >
              I have read, understand, and agree to comply with all Standard Operating Procedures 
              outlined above. I understand that violations may result in disciplinary action.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAcknowledge}
            disabled={!agreed || isAcknowledging}
            className="w-full sm:w-auto"
          >
            {isAcknowledging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Acknowledge & Continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
