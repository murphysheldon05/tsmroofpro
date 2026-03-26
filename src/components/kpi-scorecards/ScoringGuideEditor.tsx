import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SCORE_COLORS, type ScoringGuideLevel } from "@/lib/kpiTypes";

interface ScoringGuideEditorProps {
  value: ScoringGuideLevel[];
  onChange: (value: ScoringGuideLevel[]) => void;
}

const DEFAULT_LABELS: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Acceptable",
  2: "Needs Work",
  1: "Unacceptable",
};

export function ScoringGuideEditor({
  value,
  onChange,
}: ScoringGuideEditorProps) {
  const levels =
    value.length === 5
      ? value
      : [5, 4, 3, 2, 1].map(
          (score) =>
            value.find((v) => v.score === score) ?? {
              score,
              label: DEFAULT_LABELS[score],
              description: "",
            }
        );

  const update = (score: number, field: "label" | "description", val: string) => {
    const next = levels.map((l) =>
      l.score === score ? { ...l, [field]: val } : l
    );
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {levels.map((level) => (
        <div
          key={level.score}
          className="flex items-start gap-3 rounded-md border border-border p-2.5"
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shrink-0 mt-0.5"
            style={{ backgroundColor: SCORE_COLORS[level.score] }}
          >
            {level.score}
          </div>
          <div className="flex-1 space-y-1.5">
            <Input
              value={level.label}
              onChange={(e) => update(level.score, "label", e.target.value)}
              placeholder={`Label for score ${level.score}`}
              className="h-8 text-sm"
            />
            <Textarea
              value={level.description}
              onChange={(e) =>
                update(level.score, "description", e.target.value)
              }
              placeholder={`What does a ${level.score} look like?`}
              className="text-sm min-h-[50px] resize-none"
              rows={2}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
