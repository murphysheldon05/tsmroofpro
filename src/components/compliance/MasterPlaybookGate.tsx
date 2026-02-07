import { useNavigate } from "react-router-dom";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";
import { SOPMASTER_VERSION, SOPMASTER_CONTENT } from "@/lib/sopMasterConstants";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  Lock
} from "lucide-react";
import { ReactNode } from "react";
import tsmLogo from "@/assets/tsm-logo.png";

interface MasterPlaybookGateProps {
  children: ReactNode;
}

/**
 * MASTER PLAYBOOK GATE
 * 
 * This component blocks access to the hub until all 10 Master SOPs
 * have been individually read and acknowledged.
 * 
 * The gate is non-dismissible - users MUST complete acknowledgment
 * to proceed.
 */
export function MasterPlaybookGate({ children }: MasterPlaybookGateProps) {
  const navigate = useNavigate();
  const {
    sopStatuses,
    completedCount,
    totalCount,
    allCompleted,
    isLoading,
  } = useMasterSOPAcknowledgments();

  // Still loading - show nothing to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // All completed - render children
  if (allCompleted) {
    return <>{children}</>;
  }

  // Gate screen - user must complete acknowledgments
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b bg-card/50 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img src={tsmLogo} alt="TSM Roofing" className="h-10 w-auto" />
          <div>
            <h1 className="font-bold text-lg">TSM Roof Pro Hub</h1>
            <p className="text-xs text-muted-foreground">Welcome Aboard</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Master Playbook Required
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Before you can access the TSM Roof Pro Hub, you must read and 
              acknowledge all 10 core Standard Operating Procedures.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Version Badge */}
            <div className="flex justify-center">
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Version: {SOPMASTER_VERSION}
              </Badge>
            </div>

            {/* Progress */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Your Progress</span>
                <span className="text-muted-foreground">
                  {completedCount} of {totalCount} completed
                </span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {totalCount - completedCount} remaining
              </p>
            </div>

            {/* SOP List Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Master SOPs (1-10)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SOPMASTER_CONTENT.map((sop) => {
                  const sopNum = parseInt(sop.number, 10);
                  const status = sopStatuses.find((s) => s.sopNumber === sopNum);
                  const isComplete = status?.acknowledged || false;
                  return (
                    <div
                      key={sop.number}
                      className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                        isComplete 
                          ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{sop.id}: {sop.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              size="lg" 
              className="w-full gap-2"
              onClick={() => navigate("/sops/master-playbook")}
            >
              {completedCount === 0 ? (
                <>
                  <BookOpen className="h-4 w-4" />
                  Begin Master Playbook
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Continue Reading ({totalCount - completedCount} remaining)
                </>
              )}
            </Button>

            {/* Info text */}
            <p className="text-xs text-center text-muted-foreground">
              This is a one-time requirement. Once completed, you'll have 
              full access to all hub features.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
