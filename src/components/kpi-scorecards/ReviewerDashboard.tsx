import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMyReviewAssignments,
  useTemplates,
  useProfiles,
  useRecentSubmissions,
} from "@/hooks/useKpiScorecards";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  getCurrentPeriod,
  formatPeriodLabel,
  toDateString,
  getScoreBgClass,
} from "@/lib/kpiTypes";

export function ReviewerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assignments = [], isLoading } = useMyReviewAssignments();
  const { data: templates = [] } = useTemplates();
  const { data: profiles = [] } = useProfiles();
  const { data: submissions = [] } = useRecentSubmissions();

  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const enriched = useMemo(() => {
    return assignments.map((a) => {
      const template = templateMap.get(a.template_id);
      const employee = profileMap.get(a.employee_id);
      const freq = template?.review_frequency ?? "weekly";
      const period = getCurrentPeriod(freq);
      const periodStr = toDateString(period.start);

      const scored = submissions.some(
        (s) =>
          s.assignment_id === a.id &&
          s.reviewer_id === user?.id &&
          s.period_start === periodStr
      );

      return { assignment: a, template, employee, period, freq, scored };
    });
  }, [assignments, templateMap, profileMap, submissions, user?.id]);

  const sorted = useMemo(
    () =>
      [...enriched].sort((a, b) => {
        if (a.scored !== b.scored) return a.scored ? 1 : -1;
        const nameA = a.employee?.full_name ?? "";
        const nameB = b.employee?.full_name ?? "";
        return nameA.localeCompare(nameB);
      }),
    [enriched]
  );

  const mySubmissions = useMemo(
    () => submissions.filter((s) => s.reviewer_id === user?.id),
    [submissions, user?.id]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Scorecards to Review</h2>
        {sorted.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No scorecards assigned to you for review.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(({ assignment, template, employee, period, freq, scored }) => (
              <Card key={assignment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={employee?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(employee?.full_name ?? "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {employee?.full_name ?? "Unknown"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {template?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-sm text-muted-foreground">
                    {formatPeriodLabel(period.start, period.end, freq)}
                  </p>
                  {scored ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Scored
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      Needs Scoring
                    </Badge>
                  )}
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() =>
                      navigate(`/kpi-scorecards/score/${assignment.id}`)
                    }
                  >
                    {scored ? "Update Score" : "Score Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {mySubmissions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Submission History</h2>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Average</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mySubmissions.map((s) => {
                  const a = assignments.find((a) => a.id === s.assignment_id);
                  const emp = a ? profileMap.get(a.employee_id) : null;
                  const tmpl = a ? templateMap.get(a.template_id) : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{emp?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatPeriodLabel(
                          s.period_start,
                          s.period_end,
                          tmpl?.review_frequency ?? "weekly"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getScoreBgClass(s.average)}>
                          {Number(s.average).toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
