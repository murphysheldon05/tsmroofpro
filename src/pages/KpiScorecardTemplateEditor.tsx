import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTemplate, useTemplateKpis, useSaveTemplate } from "@/hooks/useKpiScorecards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { KpiListEditor } from "@/components/kpi-scorecards/KpiListEditor";
import { BonusTierEditor } from "@/components/kpi-scorecards/BonusTierEditor";
import { BonusTierPreview } from "@/components/kpi-scorecards/BonusTierPreview";
import type { KpiFormValues, BonusTier, ScoringGuideLevel } from "@/lib/kpiTypes";

export default function KpiScorecardTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const { data: template, isLoading: loadingTemplate } = useTemplate(id);
  const { data: existingKpis = [], isLoading: loadingKpis } = useTemplateKpis(id);
  const saveTemplate = useSaveTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reviewFrequency, setReviewFrequency] = useState("weekly");
  const [status, setStatus] = useState("active");
  const [hasBonus, setHasBonus] = useState(false);
  const [bonusPeriod, setBonusPeriod] = useState("monthly");
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>([]);
  const [kpis, setKpis] = useState<KpiFormValues[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isNew && !initialized) {
      setInitialized(true);
      return;
    }
    if (!isNew && template && existingKpis && !initialized) {
      setName(template.name);
      setDescription(template.description ?? "");
      setReviewFrequency(template.review_frequency);
      setStatus(template.status);
      setHasBonus(template.has_bonus);
      setBonusPeriod(template.bonus_period);
      setBonusTiers((template.bonus_tiers as BonusTier[]) ?? []);
      setKpis(
        existingKpis.map((k) => ({
          id: k.id,
          name: k.name,
          full_name: k.full_name ?? "",
          description: k.description ?? "",
          scoring_guide: (k.scoring_guide as ScoringGuideLevel[]) ?? [],
          sort_order: k.sort_order,
        }))
      );
      setInitialized(true);
    }
  }, [isNew, template, existingKpis, initialized]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Scorecard name is required");
      return;
    }
    if (kpis.length === 0) {
      toast.error("Add at least one KPI");
      return;
    }
    if (kpis.some((k) => !k.name.trim())) {
      toast.error("All KPIs must have a name");
      return;
    }

    try {
      const savedId = await saveTemplate.mutateAsync({
        id: isNew ? undefined : id,
        name: name.trim(),
        description: description.trim(),
        review_frequency: reviewFrequency,
        status,
        has_bonus: hasBonus,
        bonus_tiers: hasBonus ? bonusTiers : null,
        bonus_period: bonusPeriod,
        kpis: kpis.map((k, i) => ({
          name: k.name,
          full_name: k.full_name || null,
          description: k.description || null,
          sort_order: i,
          scoring_guide:
            k.scoring_guide.length > 0
              ? (k.scoring_guide as any)
              : null,
        })),
      });
      toast.success("Scorecard template saved");
      navigate("/kpi-scorecards");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save template");
    }
  };

  if (!isNew && (loadingTemplate || loadingKpis)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
      <header className="flex flex-col gap-2">
        <Link
          to="/kpi-scorecards"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KPI Scorecards
        </Link>
        <h1 className="text-xl sm:text-2xl font-extrabold">
          {isNew ? "Create Scorecard Template" : "Edit Scorecard Template"}
        </h1>
      </header>

      {/* Template Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Scorecard Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Office Admin KPI"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this scorecard measures..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Review Frequency</Label>
              <Select value={reviewFrequency} onValueChange={setReviewFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={status === "active"}
                  onCheckedChange={(c) => setStatus(c ? "active" : "inactive")}
                />
                <span className="text-sm">
                  {status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiListEditor kpis={kpis} onChange={setKpis} />
        </CardContent>
      </Card>

      {/* Bonus Structure */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bonus Structure</CardTitle>
            <div className="flex items-center gap-2">
              <Switch checked={hasBonus} onCheckedChange={setHasBonus} />
              <span className="text-sm text-muted-foreground">
                {hasBonus ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </CardHeader>
        {hasBonus && (
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label>Bonus Period</Label>
              <Select value={bonusPeriod} onValueChange={setBonusPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <BonusTierEditor value={bonusTiers} onChange={setBonusTiers} />

            {bonusTiers.length > 0 && (
              <div className="pt-2 border-t border-border">
                <BonusTierPreview tiers={bonusTiers} />
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={saveTemplate.isPending}
          size="lg"
        >
          {saveTemplate.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isNew ? "Create Template" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
