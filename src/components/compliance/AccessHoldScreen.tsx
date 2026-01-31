import { ShieldAlert, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AccessHoldScreenProps {
  reason: string;
}

/**
 * Full-screen blocker shown when user has an active access_hold
 */
export function AccessHoldScreen({ reason }: AccessHoldScreenProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Access Suspended
          </h1>
          <p className="text-muted-foreground">
            Your access to TSM Roof Pro has been temporarily suspended.
          </p>
        </div>

        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm font-medium text-destructive">
            Reason: {reason}
          </p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>To resolve this issue, please contact:</p>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>HR Department or Ops Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Your Direct Manager</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
