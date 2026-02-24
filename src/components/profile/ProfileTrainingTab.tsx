import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, CheckCircle2, ArrowRight } from "lucide-react";
import { useMasterSOPAcknowledgments } from "@/hooks/useMasterSOPAcknowledgments";

export function ProfileTrainingTab() {
  const { completedCount, totalCount, allCompleted, isLoading } = useMasterSOPAcknowledgments();
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Master Playbook Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Master Playbook
          </CardTitle>
          <CardDescription>
            Acknowledge all required SOPs to complete your onboarding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {allCompleted ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        All {totalCount} SOPs completed
                      </span>
                    ) : (
                      `${completedCount} of ${totalCount} SOPs acknowledged`
                    )}
                  </span>
                  {!allCompleted && (
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  )}
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              {!allCompleted && (
                <Button asChild variant="default">
                  <Link to="/playbook-library/master-playbook" className="flex items-center gap-2">
                    Complete Master Playbook
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Additional Training Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Additional Training
          </CardTitle>
          <CardDescription>
            View your assigned training modules and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No additional training assigned</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Training assignments will appear here when assigned to you
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/training/documents">Browse Training Documents</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
