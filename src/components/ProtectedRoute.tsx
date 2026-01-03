import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, loading, isAdmin, isManager } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
