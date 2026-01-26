import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PendingApprovalScreen } from "@/components/auth/PendingApprovalScreen";
import { RejectedScreen } from "@/components/auth/RejectedScreen";
import { InactiveScreen } from "@/components/auth/InactiveScreen";

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
 */
export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireManager = false,
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isManager, employeeStatus, isActive } = useAuth();

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

      // All checks passed
      return <>{children}</>;
    
    default:
      // Unknown status - treat as pending for safety
      return <PendingApprovalScreen />;
  }
}
