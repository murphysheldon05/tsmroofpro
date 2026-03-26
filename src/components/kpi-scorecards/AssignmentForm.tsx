import { useState } from "react";
import { useSaveAssignment } from "@/hooks/useKpiScorecards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelect, UserMultiSelect } from "./UserSelect";
import { toast } from "sonner";
import type { ScorecardAssignment } from "@/lib/kpiTypes";

interface AssignmentFormProps {
  templateId: string;
  assignment: ScorecardAssignment | null;
  onDone: () => void;
  onCancel: () => void;
}

export function AssignmentForm({
  templateId,
  assignment,
  onDone,
  onCancel,
}: AssignmentFormProps) {
  const [employeeId, setEmployeeId] = useState<string | null>(
    assignment?.employee_id ?? null
  );
  const [reviewerIds, setReviewerIds] = useState<string[]>(
    assignment?.reviewer_ids ?? []
  );
  const [status, setStatus] = useState(assignment?.status ?? "active");
  const save = useSaveAssignment();

  const handleSubmit = async () => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (reviewerIds.length === 0) {
      toast.error("Select at least one reviewer");
      return;
    }
    try {
      await save.mutateAsync({
        id: assignment?.id,
        template_id: templateId,
        employee_id: employeeId,
        reviewer_ids: reviewerIds,
        status,
      });
      toast.success(assignment ? "Assignment updated" : "Employee assigned");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4 bg-card">
      <h3 className="text-sm font-semibold">
        {assignment ? "Edit Assignment" : "Assign Employee"}
      </h3>

      <div className="space-y-2">
        <Label>Employee</Label>
        <UserSelect
          value={employeeId}
          onChange={setEmployeeId}
          placeholder="Select employee..."
        />
      </div>

      <div className="space-y-2">
        <Label>Reviewer(s)</Label>
        <UserMultiSelect
          value={reviewerIds}
          onChange={setReviewerIds}
          placeholder="Add reviewers..."
        />
      </div>

      {assignment && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={save.isPending}>
          {assignment ? "Update" : "Assign"}
        </Button>
      </div>
    </div>
  );
}
