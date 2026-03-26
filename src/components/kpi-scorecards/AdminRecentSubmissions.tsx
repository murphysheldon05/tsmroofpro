import { useRecentSubmissions, useProfiles, useAssignments, useTemplates } from "@/hooks/useKpiScorecards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getScoreBgClass, formatPeriodLabel } from "@/lib/kpiTypes";

export function AdminRecentSubmissions() {
  const { data: submissions = [], isLoading } = useRecentSubmissions();
  const { data: profiles = [] } = useProfiles();
  const { data: assignments = [] } = useAssignments();
  const { data: templates = [] } = useTemplates();

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const assignmentMap = new Map(assignments.map((a) => [a.id, a]));
  const templateMap = new Map(templates.map((t) => [t.id, t]));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (submissions.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Submissions</h2>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Scorecard</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-center">Average</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((s) => {
              const assignment = assignmentMap.get(s.assignment_id);
              const template = assignment
                ? templateMap.get(assignment.template_id)
                : null;
              const employee = assignment
                ? profileMap.get(assignment.employee_id)
                : null;
              const reviewer = profileMap.get(s.reviewer_id);
              const freq = template?.review_frequency ?? "weekly";

              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {employee?.full_name ?? "—"}
                  </TableCell>
                  <TableCell>{template?.name ?? "—"}</TableCell>
                  <TableCell>{reviewer?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatPeriodLabel(s.period_start, s.period_end, freq)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={getScoreBgClass(s.average)}
                    >
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
  );
}
