import { useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PartyPopper, ArrowRight } from "lucide-react";

interface PlaybookCompletionModalProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
}

export function PlaybookCompletionModal({
  open,
  onClose,
  userName = "Team Member",
}: PlaybookCompletionModalProps) {
  // Trigger confetti when modal opens
  useEffect(() => {
    if (open) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#00D26A", "#00FF85", "#FFD700", "#FFFFFF"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#00D26A", "#00FF85", "#FFD700", "#FFFFFF"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#00D26A", "#00FF85", "#FFD700", "#FFFFFF", "#22C55E"],
      });

      // Continuous side confetti
      frame();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <PartyPopper className="w-10 h-10 text-primary" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl">
            Congratulations, {userName}! 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            You've successfully completed all 10 Master Playbook acknowledgments.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/30">
              <CheckCircle2 className="h-3 w-3" />
              10/10 Complete
            </Badge>
            <Badge variant="outline" className="gap-1">
              Full Access Granted
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            You now have full access to all TSM Roof Pro Hub features. 
            Your manager has been notified of your completion.
          </p>

          <div className="p-4 rounded-xl bg-muted/50 text-sm">
            <p className="font-medium mb-1">What's Next?</p>
            <ul className="text-muted-foreground text-left space-y-1">
              <li>• Explore the Command Center for daily operations</li>
              <li>• Submit commissions through the Commissions module</li>
              <li>• Access training materials and resources</li>
            </ul>
          </div>
        </div>

        <Button onClick={onClose} className="w-full gap-2">
          <ArrowRight className="h-4 w-4" />
          Enter the Hub
        </Button>
      </DialogContent>
    </Dialog>
  );
}
