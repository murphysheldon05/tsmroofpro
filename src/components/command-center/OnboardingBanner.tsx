import { useRoleOnboarding } from "@/hooks/useRoleOnboarding";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight } from "lucide-react";

export function OnboardingBanner() {
  const navigate = useNavigate();
  const { allCompleted: playbookDone, isLoading: playbookLoading } = useMasterSOPAcknowledgments();
  const { sop, isComplete, isLoading, completedCount, totalRequired } = useRoleOnboarding();

  // Only show after playbook is done, if there's an SOP, and it's not complete
  if (playbookLoading || isLoading || !playbookDone || !sop || isComplete) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm">Role Onboarding SOP</p>
            <p className="text-xs text-muted-foreground">
              {completedCount > 0
                ? `${completedCount}/${totalRequired} sections completed — keep going!`
                : "Complete your role-specific onboarding training."}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/training/onboarding")} className="gap-2 flex-shrink-0">
          {completedCount > 0 ? "Continue" : "Start Onboarding"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
