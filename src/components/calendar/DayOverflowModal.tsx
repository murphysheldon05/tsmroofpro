import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface DayOverflowModalProps {
  date: Date | null;
  onClose: () => void;
  children: React.ReactNode;
}

export function DayOverflowModal({ date, onClose, children }: DayOverflowModalProps) {
  if (!date) return null;

  return (
    <Dialog open={!!date} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(date, "EEEE, MMMM d")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OverflowTriggerProps {
  count: number;
  onClick: (e: React.MouseEvent) => void;
}

export function OverflowTrigger({ count, onClick }: OverflowTriggerProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className="text-xs font-medium text-primary hover:underline cursor-pointer text-center w-full py-0.5 min-h-[28px] transition-colors"
    >
      +{count} more
    </button>
  );
}
