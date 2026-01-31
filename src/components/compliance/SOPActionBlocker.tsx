import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, FileCheck } from "lucide-react";

interface SOPActionBlockerProps {
  open: boolean;
  onClose: () => void;
  onAcknowledgeNow: () => void;
}

export function SOPActionBlocker({ open, onClose, onAcknowledgeNow }: SOPActionBlockerProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Action Blocked</DialogTitle>
              <DialogDescription>
                SOP Acknowledgment Required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This action is governed by TSM Roofing Standard Operating Procedures. 
            You must acknowledge and agree to all SOPs before performing this action.
          </p>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Governed actions include:</p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Commission submissions & approvals</li>
              <li>Production scheduling</li>
              <li>Supplement submissions</li>
              <li>Invoice issuance</li>
              <li>Job status changes</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onAcknowledgeNow}>
            <FileCheck className="w-4 h-4 mr-2" />
            Acknowledge Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
