import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { SCORE_COLORS, type ScoringGuideLevel } from "@/lib/kpiTypes";

interface ScoringGuideTooltipProps {
  guide: ScoringGuideLevel[];
}

export function ScoringGuideTooltip({ guide }: ScoringGuideTooltipProps) {
  if (!guide || guide.length === 0) return null;

  const sorted = [...guide].sort((a, b) => b.score - a.score);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <Info className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs p-3">
        <div className="space-y-1.5">
          {sorted.map((level) => (
            <div key={level.score} className="flex items-start gap-2 text-xs">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold shrink-0"
                style={{ backgroundColor: SCORE_COLORS[level.score] }}
              >
                {level.score}
              </span>
              <div>
                <span className="font-semibold">{level.label}</span>
                {level.description && (
                  <span className="text-muted-foreground ml-1">
                    — {level.description}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
