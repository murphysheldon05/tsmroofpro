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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Ban, Unlock, DollarSign, FileText, Calendar, UserX } from "lucide-react";
import { format } from "date-fns";

interface Hold {
  id: string;
  created_at: string;
  hold_type: string;
  job_id: string | null;
  user_id: string | null;
  reason: string;
  status: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

interface HoldActionModalsProps {
  hold: Hold | null;
  action: string | null;
  onClose: () => void;
}

const holdTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  commission_hold: { label: "Commission Hold", icon: DollarSign, color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  invoice_hold: { label: "Invoice Hold", icon: FileText, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  scheduling_hold: { label: "Scheduling Hold", icon: Calendar, color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  access_hold: { label: "Access Hold", icon: UserX, color: "bg-red-500/15 text-red-600 border-red-500/30" },
  violation_hold: { label: "Violation Hold", icon: FileText, color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
};

export function HoldActionModals({ hold, action, onClose }: HoldActionModalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["compliance-holds"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-holds-active-count"] });
    queryClient.invalidateQueries({ queryKey: ["compliance-audit-log"] });
  };

  const releaseHoldMutation = useMutation({
    mutationFn: async () => {
      if (!hold) return;
      
      const { error } = await supabase
        .from("compliance_holds")
        .update({
          status: "released",
          released_by_user_id: user?.id,
          released_at: new Date().toISOString(),
        })
        .eq("id", hold.id);
      
      if (error) throw error;

      // Audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user?.id,
        action: "release_hold",
        target_type: "hold",
        target_id: hold.id,
        metadata: { hold_type: hold.hold_type, job_id: hold.job_id },
      });
    },
    onSuccess: () => {
      toast.success("Hold released successfully");
      invalidateQueries();
      onClose();
    },
    onError: (e: any) => toast.error("Failed to release hold: " + e.message),
  });

  if (!hold) return null;

  const config = holdTypeConfig[hold.hold_type] || { 
    label: hold.hold_type, 
    icon: Ban, 
    color: "bg-muted" 
  };
  const Icon = config.icon;

  // View Details Dialog
  if (action === "view") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Hold Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Hold Type</Label>
                <div className="mt-1">
                  <Badge variant="outline" className={config.color}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={hold.status === "active" 
                      ? "bg-red-500/15 text-red-600 border-red-500/30" 
                      : "bg-green-500/15 text-green-600 border-green-500/30"
                    }
                  >
                    {hold.status || "active"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p>{format(new Date(hold.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Job ID</Label>
                <p>{hold.job_id || "—"}</p>
              </div>
              {hold.user_id && (
                <div>
                  <Label className="text-muted-foreground">User ID</Label>
                  <p className="font-mono text-xs">{hold.user_id}</p>
                </div>
              )}
              {hold.related_entity_type && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Related Entity</Label>
                    <p className="capitalize">{hold.related_entity_type}</p>
                  </div>
                  {hold.related_entity_id && (
                    <div>
                      <Label className="text-muted-foreground">Entity ID</Label>
                      <p className="font-mono text-xs">{hold.related_entity_id}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Reason</Label>
              <p className="text-sm mt-1">{hold.reason}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Release Hold Confirmation
  if (action === "release") {
    return (
      <AlertDialog open={true} onOpenChange={() => onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-blue-500" />
              Release Hold?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will allow the blocked action to proceed. The hold on{" "}
              {hold.job_id ? `Job ${hold.job_id}` : "this entity"} will be released.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Hold Details:</p>
              <p className="text-muted-foreground">{hold.reason}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => releaseHoldMutation.mutate()}
              disabled={releaseHoldMutation.isPending}
            >
              {releaseHoldMutation.isPending ? "Releasing..." : "Release Hold"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
