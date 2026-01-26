import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  // GOVERNANCE: Use isActive (employee_status='active') as the canonical check
  const { user, loading, isActive } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // While loading auth state, show a spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // SAFETY NET: Redirect to appropriate route based on auth state
  // - Authenticated & active users → /command-center
  // - Authenticated but pending/inactive → /auth (ProtectedRoute will handle display)
  // - Unauthenticated users → /auth
  if (user && isActive) {
    return <Navigate to="/command-center" replace />;
  }

  // For unauthenticated or non-active users, redirect to /auth
  return <Navigate to="/auth" replace />;
};

export default NotFound;
