import { useCallback, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

const fromAny = (table: string) => (supabase.from as any)(table);

interface WeeklyScorecardPayload {
  scorecardRole: string;
  employeeName: string;
  reviewerName: string;
  weekStartDate: string;
  scores: Record<string, unknown>;
  notes?: string;
}

export function useWeeklyScorecardSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitEntry = useCallback(async (payload: WeeklyScorecardPayload) => {
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
  }, []);

  return { submitEntry, isSubmitting };
}
