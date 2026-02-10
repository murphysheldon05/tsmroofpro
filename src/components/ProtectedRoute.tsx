import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PendingApprovalScreen } from "@/components/auth/PendingApprovalScreen";
import { RejectedScreen } from "@/components/auth/RejectedScreen";
import { InactiveScreen } from "@/components/auth/InactiveScreen";
import { AccessHoldScreen } from "@/components/compliance/AccessHoldScreen";
import { MasterPlaybookGate } from "@/components/compliance/MasterPlaybookGate";
import { useAccessHoldCheck } from "@/hooks/useComplianceHoldCheck";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
}

/**
 * GOVERNED PROTECTED ROUTE
 * 
 * CANONICAL ACCESS RULE: employee_status is the SINGLE source of truth for access.
 * 
 * Access Matrix:
 * - employee_status = 'active'   → Full access to protected routes
 * - employee_status = 'pending'  → Show "Pending Approval" screen
 * - employee_status = 'rejected' → Show "Access Denied" screen
 * - employee_status = 'inactive' → Show "Account Inactive" screen
 * - No user                      → Redirect to /auth
 * 
 * COMPLIANCE HOLD CHECK:
 * - If user has active access_hold → Show "Access Suspended" screen
 */
export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireManager = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isManager, employeeStatus } = useAuth();
  const { data: accessHold, isLoading: accessHoldLoading } = useAccessHoldCheck();
  const location = useLocation();
  
  // Routes that are exempt from the Master Playbook gate
  // (the playbook page itself, and the profile page for reference)
  const isExemptRoute = location.pathname.startsWith("/playbook-library/master-playbook") ||
    location.pathname === "/playbook-library" ||
    location.pathname === "/profile";
  if (loading || accessHoldLoading) {
    return <AppLoadingScreen />;
  }

  // GOVERNANCE RULE: No user = redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // COMPLIANCE HOLD CHECK: Block access if user has access_hold
  if (accessHold?.blocked && accessHold.reason) {
    return <AccessHoldScreen reason={accessHold.reason} />;
  }

  // CANONICAL ACCESS GATING: Based solely on employee_status
  switch (employeeStatus) {
    case 'rejected':
      return <RejectedScreen />;
    
    case 'inactive':
      return <InactiveScreen />;
    
    case 'pending':
    case null:
      return <PendingApprovalScreen />;
    
    case 'active':
      // User is active - check role requirements
      if (requireAdmin && !isAdmin) {
        return <Navigate to="/command-center" replace />;
      }

      if (requireManager && !isManager) {
        return <Navigate to="/command-center" replace />;
      }

      // If not on exempt route, wrap with Master Playbook gate
      if (!isExemptRoute) {
        return <MasterPlaybookGate>{children}</MasterPlaybookGate>;
      }

      // Exempt routes pass through directly
      return <>{children}</>;
    
    default:
      // Unknown status - treat as pending for safety
      return <PendingApprovalScreen />;
  }
}
