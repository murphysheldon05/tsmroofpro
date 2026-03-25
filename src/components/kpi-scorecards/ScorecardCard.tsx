import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { KpiScorecardRow } from "@/lib/kpiScorecardVisibility";
import { cn } from "@/lib/utils";

interface ScorecardCardProps {
  row: KpiScorecardRow;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function ScorecardCard({ row, isAdmin, onOpen, onEdit, onRemove }: ScorecardCardProps) {
  const reviewers = row.assigned_reviewers?.length ?? 0;
  const isActive = row.status === "active";

  return (
    <Card className="relative flex flex-col h-full border-border/60 shadow-sm">
      {isAdmin && (
        <div className="absolute right-2 top-2 flex gap-0.5 z-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit scorecard"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove scorecard"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <CardHeader className="pb-2 pr-20">
        <h3 className="font-semibold text-foreground leading-tight pr-2">{row.name}</h3>
        {row.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{row.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "font-medium border-0",
              isActive
                ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {reviewers === 1 ? "1 reviewer" : `${reviewers} reviewers`}
          </span>
        </div>
        <Button className="w-full mt-auto" onClick={onOpen}>
          Open Scorecard
        </Button>
      </CardContent>
    </Card>
  );
}
