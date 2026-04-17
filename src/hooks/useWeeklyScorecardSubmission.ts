import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const fromAny = (table: string) => (supabase.from as any)(table);

interface WeeklyScorecardPayload {
  scorecardRole: string;
  employeeName: string;
  reviewerName: string;
  weekStartDate: string;
  scores: Record<string, unknown>;
  assignedUserId?: string | null;
  notes?: string;
}

export function useWeeklyScorecardSubmission() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEntry = useCallback(async (payload: WeeklyScorecardPayload) => {
    if (!user?.id) {
      toast.error("You must be signed in to submit a scorecard.");
      return false;
    }

    if (!payload.reviewerName) {
      toast.error("Please select a reviewer before submitting.");
      return false;
    }

    try {
      setIsSubmitting(true);

      const { error } = await fromAny("kpi_scorecard_entries").insert({
        scorecard_role: payload.scorecardRole,
        employee_name: payload.employeeName,
        reviewer_name: payload.reviewerName,
        week_start_date: payload.weekStartDate,
        assigned_user_id: payload.assignedUserId ?? user.id,
        submitted_by_user_id: user.id,
        scores: payload.scores,
        notes: payload.notes?.trim() ? payload.notes.trim() : null,
      });

      if (error) throw error;

      toast.success("Scorecard saved ✓");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save scorecard.";
      toast.error(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id]);

  return { submitEntry, isSubmitting };
}
