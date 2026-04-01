import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useTemplateKpis,
  useSubmissions,
  useSubmitScore,
  useProfiles,
} from "@/hooks/useKpiScorecards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { ScoreDots } from "@/components/kpi-scorecards/ScoreDots";
import { ScoringGuideTooltip } from "@/components/kpi-scorecards/ScoringGuideTooltip";
import { PeriodSelector } from "@/components/kpi-scorecards/PeriodSelector";
import { ScoreSummaryBar } from "@/components/kpi-scorecards/ScoreSummaryBar";
import {
  getCurrentPeriod,
  toDateString,
  type BonusTier,
  type ScorecardAssignment,
  type ScorecardTemplate,
  type ScoringGuideLevel,
} from "@/lib/kpiTypes";

export default function KpiScorecardScore() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const submitScore = useSubmitScore();

  const { data: assignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ["scorecard-assignment", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const { data, error } = await (supabase.from as any)("scorecard_assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();
      if (error) throw error;
      return data as ScorecardAssignment | null;
    },
    enabled: !!assignmentId,
  });

  const { data: template } = useQuery({
    queryKey: ["scorecard-template", assignment?.template_id],
    queryFn: async () => {
      if (!assignment?.template_id) return null;
      const { data, error } = await supabase
        .from("scorecard_templates")
        .select("*")
        .eq("id", assignment.template_id)
        .maybeSingle();
      if (error) throw error;
      return data as ScorecardTemplate | null;
    },
    enabled: !!assignment?.template_id,
  });

  const { data: kpis = [] } = useTemplateKpis(assignment?.template_id);
  const { data: submissions = [] } = useSubmissions(assignmentId);

  const freq = template?.review_frequency ?? "weekly";
  const initialPeriod = getCurrentPeriod(freq);
  const [periodStart, setPeriodStart] = useState(initialPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.end);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const existingSubmission = useMemo(() => {
    if (!user?.id) return null;
    return submissions.find(
      (s) =>
        s.reviewer_id === user.id &&
        s.period_start === toDateString(periodStart)
    ) ?? null;
  }, [submissions, user?.id, periodStart]);

  useEffect(() => {
    if (existingSubmission) {
      const existingScores = existingSubmission.scores as Record<string, number>;
      setScores(existingScores ?? {});
      setNotes(existingSubmission.notes ?? "");
    } else {
      setScores({});
      setNotes("");
    }
    setSubmitted(false);
  }, [existingSubmission]);

  const employee = profiles.find((p) => p.id === assignment?.employee_id);
  const allScored = kpis.length > 0 && kpis.every((k) => scores[k.id] != null);
  const bonusTiers = template?.bonus_tiers as BonusTier[] | null;

  const handleSetScore = (kpiId: string, value: number | null) => {
    setScores((prev) => {
      const next = { ...prev };
      if (value == null) {
        delete next[kpiId];
      } else {
        next[kpiId] = value;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id || !assignmentId || !allScored) return;

    const scoredKpis = kpis.filter((k) => scores[k.id] != null);
    const average =
      scoredKpis.reduce((sum, k) => sum + scores[k.id], 0) / scoredKpis.length;

    try {
      await submitScore.mutateAsync({
        assignment_id: assignmentId,
        reviewer_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        scores,
        average: Math.round(average * 100) / 100,
        notes,
      });

      setSubmitted(true);
      toast.success(
        `Score submitted — ${employee?.full_name ?? "Employee"} averaged ${average.toFixed(1)}`
      );

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#00D26A", "#7BC67E", "#FFB020", "#FFD700"],
      });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit score");
    }
  };

  if (loadingAssignment) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-muted-foreground">Assignment not found or you don't have access.</p>
        <Button variant="outline" asChild>
          <Link to="/kpi-scorecards">Back to KPI Scorecards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <Link
          to="/kpi-scorecards"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KPI Scorecards
        </Link>

        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={employee?.avatar_url ?? undefined} />
            <AvatarFallback>{(employee?.full_name ?? "?")[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-bold">
              {employee?.full_name ?? "Employee"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {template?.name ?? "Scorecard"}
            </p>
          </div>
        </div>

        <PeriodSelector
          frequency={freq}
          periodStart={periodStart}
          periodEnd={periodEnd}
          onChange={(s, e) => {
            setPeriodStart(s);
            setPeriodEnd(e);
          }}
        />
      </header>

      {/* KPI Scoring Cards */}
      <div className="space-y-3">
        {kpis.map((kpi, i) => {
          const guide = (kpi.scoring_guide as ScoringGuideLevel[]) ?? [];
          return (
            <Card key={kpi.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">
                        {kpi.full_name || kpi.name}
                      </h3>
                      {guide.length > 0 && (
                        <ScoringGuideTooltip guide={guide} />
                      )}
                    </div>
                    {kpi.description && (
                      <p className="text-xs text-muted-foreground">
                        {kpi.description}
                      </p>
                    )}
                    <ScoreDots
                      value={scores[kpi.id] ?? null}
                      onChange={(v) => handleSetScore(kpi.id, v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes (optional)</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations, context, or feedback for this review period..."
          rows={3}
        />
      </div>

      {/* Summary */}
      <ScoreSummaryBar
        scores={scores}
        kpis={kpis}
        bonusTiers={bonusTiers ?? null}
        hasBonus={template?.has_bonus ?? false}
      />

      {/* Submit */}
      <div className="space-y-2 pb-8">
        {existingSubmission && (
          <p className="text-xs text-muted-foreground text-center">
            Last submitted: {new Date(existingSubmission.submitted_at).toLocaleString()}
          </p>
        )}

        {!allScored && (
          <p className="text-sm text-muted-foreground text-center">
            Score all KPIs to submit
          </p>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={!allScored || submitScore.isPending}
          onClick={handleSubmit}
        >
          {submitScore.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {existingSubmission ? "Update Score" : "Submit Score"}
        </Button>

        {submitted && (
          <Button variant="outline" className="w-full" asChild>
            <Link to="/kpi-scorecards">Back to Scorecards</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
