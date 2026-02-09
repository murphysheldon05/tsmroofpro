import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { AlertTriangle, ArrowRight, CheckCircle2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlaybookCompletionBanner() {
  const navigate = useNavigate();
  const { completedCount, totalCount, allCompleted, isLoading } = useMasterSOPAcknowledgments();

  // Don't show if loading or already complete
  if (isLoading || allCompleted) return null;

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const remaining = totalCount - completedCount;

  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-500" />
              Action Required: Complete Master Playbook
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Acknowledge all 10 core playbooks to unlock full hub access.
              <span className="text-amber-500 font-medium"> {remaining} remaining.</span>
            </p>
            
            {/* Progress bar */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{completedCount}/{totalCount} Complete</span>
                <span className="font-medium text-foreground">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        </div>
        
        <Button
          onClick={() => navigate("/playbook-library/master-playbook")}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold w-full sm:w-auto"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
