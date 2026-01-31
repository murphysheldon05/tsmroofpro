import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { MasterSOPSection } from "./MasterSOPSection";
import { useSOPAcknowledgment } from "@/hooks/useSOPAcknowledgment";
import { useAuth } from "@/contexts/AuthContext";
import { SOPMASTER_VERSION } from "@/lib/sopMasterConstants";

/**
 * Full-page gate that blocks access until user acknowledges all Master SOPs.
 * Shown after first login for new users or when SOPMASTER_VERSION changes.
 */
export function SOPAcknowledgmentGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading, employeeStatus } = useAuth();
  const { hasAcknowledged, isLoading: ackLoading } = useSOPAcknowledgment();
  const [dismissed, setDismissed] = useState(false);

  // Skip gate if still loading
  if (authLoading || ackLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Skip gate if user not logged in (let auth handle redirect)
  if (!user) {
    return <>{children}</>;
  }

  // Skip gate if user is pending approval (let that screen show)
  if (employeeStatus === "pending") {
    return <>{children}</>;
  }

  // Skip gate if already acknowledged or dismissed
  if (hasAcknowledged || dismissed) {
    return <>{children}</>;
  }

  // Show full-page acknowledgment gate
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Required: SOP Acknowledgment</h1>
            <p className="text-xs text-muted-foreground">
              Version {SOPMASTER_VERSION}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        <MasterSOPSection
          mode="acknowledge"
          onAcknowledged={() => {
            setDismissed(true);
            navigate("/command-center");
          }}
        />
      </main>
    </div>
  );
}
