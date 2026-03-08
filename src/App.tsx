import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WalkthroughProvider } from "@/contexts/WalkthroughContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageTransition } from "@/components/PageTransition";
import { Loader2 } from "lucide-react";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const Requests = lazy(() => import("./pages/Requests"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const UserDirectory = lazy(() => import("./pages/UserDirectory"));
const Directory = lazy(() => import("./pages/Directory"));
const Warranties = lazy(() => import("./pages/Warranties"));
const Commissions = lazy(() => import("./pages/Commissions"));
const CommissionNew = lazy(() => import("./pages/CommissionNew"));
const CommissionDrawNew = lazy(() => import("./pages/CommissionDrawNew"));
const CommissionDetail = lazy(() => import("./pages/CommissionDetail"));
const CommissionDocuments = lazy(() => import("./pages/CommissionDocuments"));
const CommissionDocumentNew = lazy(() => import("./pages/CommissionDocumentNew"));
const CommissionDocumentDetail = lazy(() => import("./pages/CommissionDocumentDetail"));
const CommissionTracker = lazy(() => import("./pages/CommissionTracker"));
const CommissionTrackerDetail = lazy(() => import("./pages/CommissionTrackerDetail"));
const MyCommissionTracker = lazy(() => import("./pages/MyCommissionTracker"));
const BuildSchedule = lazy(() => import("./pages/BuildSchedule"));
const DeliverySchedule = lazy(() => import("./pages/DeliverySchedule"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const PendingReview = lazy(() => import("./pages/PendingReview"));
const Accounting = lazy(() => import("./pages/Accounting"));
const ContactList = lazy(() => import("./pages/ContactList"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function InlinePageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProtectedAppShell() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <PageTransition>
          <Suspense fallback={<InlinePageLoader />}>
            <Outlet />
          </Suspense>
        </PageTransition>
      </AppLayout>
    </ProtectedRoute>
  );
}

function RequireAdmin() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/command-center" replace />;
  return <Outlet />;
}

function RequireManager() {
  const { isManager } = useAuth();
  if (!isManager) return <Navigate to="/command-center" replace />;
  return <Outlet />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <WalkthroughProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedAppShell />}>
              <Route path="/command-center" element={<CommandCenter />} />
              <Route path="/pending-review" element={<PendingReview />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user-directory" element={<UserDirectory />} />
              <Route path="/vendors/subcontractors" element={<Directory />} />
              <Route path="/vendors/contact-list" element={<ContactList />} />
              <Route path="/warranties" element={<Warranties />} />
              <Route path="/build-schedule" element={<BuildSchedule />} />
              <Route path="/delivery-schedule" element={<DeliverySchedule />} />
              <Route path="/commissions" element={<Commissions />} />
              <Route path="/commissions/new" element={<CommissionNew />} />
              <Route path="/commissions/draw/new" element={<CommissionDrawNew />} />
              <Route path="/commissions/:id" element={<CommissionDetail />} />
              <Route path="/commission-documents" element={<CommissionDocuments />} />
              <Route path="/commission-documents/new" element={<CommissionDocumentNew />} />
              <Route path="/commission-documents/:id" element={<CommissionDocumentDetail />} />
              <Route path="/my-commissions" element={<MyCommissionTracker />} />

              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Admin />} />
                <Route path="/accounting" element={<Accounting />} />
              </Route>

              <Route element={<RequireManager />}>
                <Route path="/commission-tracker" element={<CommissionTracker />} />
                <Route path="/commission-tracker/:repSlug" element={<CommissionTrackerDetail />} />
              </Route>
            </Route>

            <Route path="/dashboard" element={<Navigate to="/command-center" replace />} />
            <Route path="/company" element={<Navigate to="/command-center" replace />} />
            <Route path="/directory" element={<Navigate to="/vendors/contact-list" replace />} />
            <Route path="/vendors" element={<Navigate to="/vendors/subcontractors" replace />} />
            <Route path="/commissions/draws" element={<Navigate to="/commissions" replace />} />
            <Route path="/ops-compliance" element={<Navigate to="/admin?tab=ops-compliance" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </WalkthroughProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
