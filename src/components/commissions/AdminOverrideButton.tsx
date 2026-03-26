import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Zap, Loader2 } from "lucide-react";
import { useAdminOverridePullIn } from "@/hooks/useCommissionManager";
import { useCurrentPayRun, type PayRun } from "@/hooks/usePayRuns";
import { formatPayRunRange } from "@/lib/commissionPayDateCalculations";

interface AdminOverrideButtonProps {
  commissionId: string;
  currentPayRunId: string | null;
  isLateSubmission: boolean;
  isLateRevision: boolean;
}

export function AdminOverrideButton({
  commissionId,
  currentPayRunId,
  isLateSubmission,
  isLateRevision,
}: AdminOverrideButtonProps) {
  const override = useAdminOverridePullIn();
  const { data: currentPayRun } = useCurrentPayRun();

  if (!isLateSubmission && !isLateRevision) return null;
  if (!currentPayRun) return null;
  // Already in the current pay run
  if (currentPayRunId === currentPayRun.id) return null;

  const currentRange = currentPayRun.period_start && currentPayRun.period_end
    ? formatPayRunRange(currentPayRun.period_start, currentPayRun.period_end)
    : "Current Pay Run";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-purple-400 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950/30"
        >
          <Zap className="h-4 w-4" />
          Pull into Current Pay Run
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Override Pay Run Assignment</AlertDialogTitle>
          <AlertDialogDescription>
            Move this commission into the current pay run ({currentRange})?
            This overrides the deadline.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => override.mutate({ commissionId })}
            disabled={override.isPending}
            className="bg-purple-600 text-white hover:bg-purple-700 gap-2"
          >
            {override.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Confirm Override
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
