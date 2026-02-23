import { useNavigate, useLocation } from "react-router-dom";
import { useHandbookGateRequired } from "@/hooks/useEmployeeHandbook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowRight, FileText } from "lucide-react";
import { ReactNode } from "react";
import tsmLogo from "@/assets/tsm-logo.png";

interface EmployeeHandbookGateProps {
  children: ReactNode;
}

/**
 * EMPLOYEE HANDBOOK GATE
 *
 * Blocks app access until the user has opened and acknowledged the current
 * Employee Handbook. When a new version is uploaded, everyone must re-acknowledge.
 * The route /playbook-library/employee-handbook is exempt so users can open and acknowledge.
 */
export function EmployeeHandbookGate({ children }: EmployeeHandbookGateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentVersion,
    hasAcknowledged,
    gateRequired,
    isLoading,
  } = useHandbookGateRequired();

  const isHandbookPage = location.pathname === "/playbook-library/employee-handbook";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No handbook uploaded yet → no gate
  if (!currentVersion) {
    return <>{children}</>;
  }

  // On the handbook page → allow through so they can view and acknowledge
  if (isHandbookPage) {
    return <>{children}</>;
  }

  // Acknowledged → allow through
  if (hasAcknowledged) {
    return <>{children}</>;
  }

  // Gate: must acknowledge handbook
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <header className="p-4 border-b bg-card/50 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img src={tsmLogo} alt="TSM Roofing" className="h-10 w-auto" />
          <div>
            <h1 className="font-bold text-lg">TSM Roof Pro Hub</h1>
            <p className="text-xs text-muted-foreground">Employee Handbook Required</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Acknowledge Employee Handbook
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              A new or updated Employee Handbook is available. You must open and
              acknowledge it before continuing to use the hub.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <Badge variant="outline" className="gap-1">
                <BookOpen className="h-3 w-3" />
                Version: {currentVersion.version}
              </Badge>
            </div>

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => navigate("/playbook-library/employee-handbook")}
            >
              <FileText className="h-4 w-4" />
              Open & Acknowledge Handbook
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You will be able to use the hub after you open the handbook and
              confirm acknowledgment.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
