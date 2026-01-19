import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Clock, Mail, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
}

function PendingApprovalScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />
          
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Pending Approval
              </h1>
              <p className="text-muted-foreground">
                Your account is awaiting admin approval. You'll receive an email notification once your access has been granted.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-4">
                If you believe this is an error or need immediate access, please contact your administrator.
              </p>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RejectedScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--destructive)/0.08)_0%,_transparent_50%)]" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />
          
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Access Denied
              </h1>
              <p className="text-muted-foreground">
                Your account request has been reviewed and was not approved. Please contact your administrator if you believe this is an error.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InactiveScreen() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--muted)/0.15)_0%,_transparent_50%)]" />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" className="justify-center mb-8" />
          
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Account Inactive
              </h1>
              <p className="text-muted-foreground">
                Your account has been deactivated. Please contact your administrator if you need access restored.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireManager = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isManager, isApproved, employeeStatus, isActive } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // GOVERNANCE RULE: No user = redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // GOVERNANCE RULE: Rejected users see rejection screen
  if (employeeStatus === 'rejected') {
    return <RejectedScreen />;
  }

  // GOVERNANCE RULE: Inactive/deactivated users see inactive screen
  if (employeeStatus === 'inactive') {
    return <InactiveScreen />;
  }

  // GOVERNANCE RULE: Pending approval users see pending screen
  if (isApproved === false || employeeStatus === 'pending') {
    return <PendingApprovalScreen />;
  }

  // GOVERNANCE RULE: Only active users can proceed
  if (!isActive) {
    return <PendingApprovalScreen />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/command-center" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/command-center" replace />;
  }

  return <>{children}</>;
}
