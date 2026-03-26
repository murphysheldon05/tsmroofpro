import { useState } from "react";
import {
  useAssignments,
  useProfiles,
  useSaveAssignment,
  useRemoveAssignment,
} from "@/hooks/useKpiScorecards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ScorecardTemplate, ScorecardAssignment } from "@/lib/kpiTypes";
import { AssignmentForm } from "./AssignmentForm";
import { cn } from "@/lib/utils";

interface AssignmentsModalProps {
  template: ScorecardTemplate | null;
  onClose: () => void;
}

export function AssignmentsModal({ template, onClose }: AssignmentsModalProps) {
  const { data: assignments = [], isLoading } = useAssignments(
    template?.id
  );
  const { data: profiles = [] } = useProfiles();
  const removeAssignment = useRemoveAssignment();

  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<ScorecardAssignment | null>(null);
  const [removeTarget, setRemoveTarget] =
    useState<ScorecardAssignment | null>(null);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeAssignment.mutateAsync(removeTarget.id);
      toast.success("Assignment removed");
      setRemoveTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove");
    }
  };

  return (
    <>
      <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className={cn(
            "flex flex-col gap-4 min-h-0 overflow-hidden p-4 sm:p-6",
            "inset-0 left-0 top-0 z-50 h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 rounded-none sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[85vh] sm:max-w-xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg"
          )}
        >
          <DialogHeader className="shrink-0 space-y-1.5 text-left">
            <DialogTitle>
              Assignments — {template?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setEditingAssignment(null);
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Assign Employee
              </Button>
            </div>

            {showForm && template && (
              <AssignmentForm
                templateId={template.id}
                assignment={editingAssignment}
                onDone={() => {
                  setShowForm(false);
                  setEditingAssignment(null);
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingAssignment(null);
                }}
              />
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No employees assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => {
                  const employee = profileMap.get(a.employee_id);
                  const reviewerNames = a.reviewer_ids
                    .map((rid) => profileMap.get(rid)?.full_name ?? "Unknown")
                    .join(", ");

                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {employee?.full_name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Reviewers: {reviewerNames}
                        </p>
                      </div>
                      <Badge
                        variant={a.status === "active" ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {a.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          setEditingAssignment(a);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setRemoveTarget(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent
          className={cn(
            "inset-0 left-0 top-0 z-50 mx-auto my-auto h-fit max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 rounded-none p-6 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg"
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {profileMap.get(removeTarget?.employee_id ?? "")?.full_name ?? "this employee"}{" "}
              from {template?.name}? Historical scores will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
