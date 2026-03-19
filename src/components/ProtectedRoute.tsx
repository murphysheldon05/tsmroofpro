import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RejectedScreen } from "@/components/auth/RejectedScreen";
import { InactiveScreen } from "@/components/auth/InactiveScreen";
import { AccessHoldScreen } from "@/components/compliance/AccessHoldScreen";
import { useAccessHoldCheck } from "@/hooks/useComplianceHoldCheck";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireManager = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isManager, employeeStatus } = useAuth();
  const { data: accessHold, isLoading: accessHoldLoading } = useAccessHoldCheck();

  if (loading || accessHoldLoading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (accessHold?.blocked && accessHold.reason) {
    return <AccessHoldScreen reason={accessHold.reason} />;
  }

  switch (employeeStatus) {
    case 'rejected':
      return <RejectedScreen />;
    
    case 'inactive':
      return <InactiveScreen />;
    
    case 'active':
    case 'pending':
    case null:
    default:
      if (requireAdmin && !isAdmin) {
        return <Navigate to="/command-center" replace />;
      }

      if (requireManager && !isManager) {
        return <Navigate to="/command-center" replace />;
      }

      return <>{children}</>;
  }
}
