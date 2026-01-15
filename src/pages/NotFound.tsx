import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { user, loading, isApproved } = useAuth();

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
  // - Authenticated & approved users → /command-center
  // - Authenticated but pending → /auth (will show pending approval screen)
  // - Unauthenticated users → /auth
  if (user && isApproved === true) {
    return <Navigate to="/command-center" replace />;
  }

  // For unauthenticated or pending approval users, redirect to /auth
  return <Navigate to="/auth" replace />;
};

export default NotFound;
