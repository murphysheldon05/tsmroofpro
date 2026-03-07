import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalkthroughProvider } from "@/contexts/WalkthroughContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages — each chunk loads only when navigated to
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
          <PageTransition>
          <Routes>
            {/* Public routes - root redirects to auth for login/signup flow */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            {/* Protected routes */}
            <Route
              path="/command-center"
              element={
                <ProtectedRoute>
                  <CommandCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pending-review"
              element={
                <ProtectedRoute>
                  <PendingReview />
                </ProtectedRoute>
              }
            />
            {/* Redirect old dashboard route to command center */}
            <Route
              path="/dashboard"
              element={<Navigate to="/command-center" replace />}
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <Requests />
                </ProtectedRoute>
              }
            />
            {/* Redirect /company to /command-center */}
            <Route
              path="/company"
              element={<Navigate to="/command-center" replace />}
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/directory" element={<Navigate to="/vendors/contact-list" replace />} />
            <Route
              path="/user-directory"
              element={
                <ProtectedRoute>
                  <UserDirectory />
                </ProtectedRoute>
              }
            />
            <Route path="/vendors" element={<Navigate to="/vendors/subcontractors" replace />} />
            <Route
              path="/vendors/subcontractors"
              element={
                <ProtectedRoute>
                  <Directory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors/contact-list"
              element={
                <ProtectedRoute>
                  <ContactList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warranties"
              element={
                <ProtectedRoute>
                  <Warranties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/build-schedule"
              element={
                <ProtectedRoute>
                  <BuildSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery-schedule"
              element={
                <ProtectedRoute>
                  <DeliverySchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commissions"
              element={
                <ProtectedRoute>
                  <Commissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commissions/new"
              element={
                <ProtectedRoute>
                  <CommissionNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commissions/draw/new"
              element={
                <ProtectedRoute>
                  <CommissionDrawNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commissions/draws"
              element={<Navigate to="/commissions" replace />}
            />
            <Route
              path="/commissions/:id"
              element={
                <ProtectedRoute>
                  <CommissionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commission-documents"
              element={
                <ProtectedRoute>
                  <CommissionDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commission-documents/new"
              element={
                <ProtectedRoute>
                  <CommissionDocumentNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commission-documents/:id"
              element={
                <ProtectedRoute>
                  <CommissionDocumentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commission-tracker"
              element={
                <ProtectedRoute requireManager>
                  <CommissionTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commission-tracker/:repSlug"
              element={
                <ProtectedRoute requireManager>
                  <CommissionTrackerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-commissions"
              element={
                <ProtectedRoute>
                  <MyCommissionTracker />
                </ProtectedRoute>
              }
            />
            {/* Ops Compliance moved to Admin Panel — redirect old route for backwards compatibility */}
            <Route
              path="/ops-compliance"
              element={<Navigate to="/admin?tab=ops-compliance" replace />}
            />
            <Route
              path="/accounting"
              element={
                <ProtectedRoute requireAdmin>
                  <Accounting />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PageTransition>
          </Suspense>
          </WalkthroughProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
