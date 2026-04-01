import { useNavigate } from "react-router-dom";
import {
  useTemplates,
  useAssignmentCountsByTemplate,
  useTemplateKpis,
} from "@/hooks/useKpiScorecards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Users, Loader2 } from "lucide-react";
import type { ScorecardTemplate, BonusTier } from "@/lib/kpiTypes";

interface AdminTemplateGridProps {
  onManageAssignments: (template: ScorecardTemplate) => void;
}

function TemplateKpiCount({ templateId }: { templateId: string }) {
  const { data: kpis } = useTemplateKpis(templateId);
  return <span>{kpis?.length ?? 0} KPIs</span>;
}

export function AdminTemplateGrid({
  onManageAssignments,
}: AdminTemplateGridProps) {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useTemplates();
  const assignmentCounts = useAssignmentCountsByTemplate();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Scorecard Templates</h2>
        <Button onClick={() => navigate("/kpi-scorecards/templates/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No templates yet. Create your first scorecard template.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => {
            const bonusTiers = (t.bonus_tiers as unknown) as BonusTier[] | null;
            return (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Badge
                      variant={
                        t.status === "active" ? "default" : "secondary"
                      }
                      className="shrink-0"
                    >
                      {t.status}
                    </Badge>
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <TemplateKpiCount templateId={t.id} />
                    </span>
                    <span>·</span>
                    <span>{assignmentCounts[t.id] ?? 0} assigned</span>
                    <span>·</span>
                    <span className="capitalize">{t.review_frequency}</span>
                  </div>
                  <div className="text-xs">
                    {t.has_bonus && bonusTiers && bonusTiers.length > 0 ? (
                      <span className="text-primary font-medium">
                        {bonusTiers.map((bt) => bt.label).join(" / ")} bonus
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No Bonus</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        navigate(`/kpi-scorecards/templates/${t.id}`)
                      }
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onManageAssignments(t)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Assignments
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
