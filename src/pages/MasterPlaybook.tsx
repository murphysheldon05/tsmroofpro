import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MasterSOPCard } from "@/components/sop/MasterSOPCard";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { SOPMASTER_CONTENT, SOPMASTER_VERSION } from "@/lib/sopMasterConstants";
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  Shield,
  Trophy
} from "lucide-react";
import { toast } from "sonner";

export default function MasterPlaybook() {
  const navigate = useNavigate();
  const {
    sopStatuses,
    completedCount,
    totalCount,
    allCompleted,
    isLoading,
    acknowledgeSOP,
    isAcknowledging,
  } = useMasterSOPAcknowledgments();

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAcknowledge = async (sopNumber: number) => {
    try {
      await acknowledgeSOP(sopNumber);
      toast.success(`SOP-${String(sopNumber).padStart(2, "0")} acknowledged!`);
    } catch (e: any) {
      toast.error("Failed to acknowledge: " + e.message);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate("/sops")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">Master Playbook</h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Core operational SOPs — Required reading
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="p-4 rounded-xl border bg-card/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Acknowledgment Progress</span>
              </div>
              <Badge variant={allCompleted ? "default" : "secondary"}>
                Version: {SOPMASTER_VERSION}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedCount} of {totalCount} SOPs acknowledged
                </span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {allCompleted && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                <Trophy className="h-5 w-5" />
                <div>
                  <p className="font-medium">All SOPs Acknowledged!</p>
                  <p className="text-sm opacity-80">
                    You now have full access to the TSM Roof Pro Hub
                  </p>
                </div>
              </div>
            )}

            {!allCompleted && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Complete all 10 SOPs to unlock full hub access</span>
              </div>
            )}
          </div>
        </header>

        {/* SOP Cards */}
        <div className="space-y-3">
          {SOPMASTER_CONTENT.map((sop) => {
            const status = sopStatuses.find((s) => s.sopNumber === sop.number);
            return (
              <MasterSOPCard
                key={sop.number}
                number={sop.number}
                id={sop.id}
                title={sop.title}
                summary={sop.summary}
                fullContent={sop.fullContent}
                isAcknowledged={status?.acknowledged || false}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={isAcknowledging}
              />
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
