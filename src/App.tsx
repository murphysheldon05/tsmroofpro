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
const SOPLibrary = lazy(() => import("./pages/SOPLibrary"));
const MasterPlaybook = lazy(() => import("./pages/MasterPlaybook"));
const EmployeeHandbook = lazy(() => import("./pages/EmployeeHandbook"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const Training = lazy(() => import("./pages/Training"));
const ShingleIdentification = lazy(() => import("./pages/ShingleIdentification"));
const TrainingDocuments = lazy(() => import("./pages/TrainingDocuments"));
const RoleOnboarding = lazy(() => import("./pages/RoleOnboarding"));
const Tools = lazy(() => import("./pages/Tools"));
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
const MessageCenter = lazy(() => import("./pages/MessageCenter"));
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
              path="/message-center"
              element={
                <ProtectedRoute>
                  <MessageCenter />
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
            {/* Playbook Library routes */}
            <Route
              path="/playbook-library"
              element={
                <ProtectedRoute>
                  <SOPLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playbook-library/master-playbook"
              element={
                <ProtectedRoute>
                  <MasterPlaybook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playbook-library/employee-handbook"
              element={
                <ProtectedRoute>
                  <EmployeeHandbook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playbook-library/:category"
              element={
                <ProtectedRoute>
                  <SOPLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playbook-library/:category/resource/:resourceId"
              element={
                <ProtectedRoute>
                  <ResourceDetail />
                </ProtectedRoute>
              }
            />
            {/* Legacy SOP routes redirect to Playbook Library */}
            <Route path="/sops" element={<Navigate to="/playbook-library" replace />} />
            <Route path="/sops/master-playbook" element={<Navigate to="/playbook-library/master-playbook" replace />} />
            <Route path="/sops/:category" element={<Navigate to="/playbook-library" replace />} />
            <Route path="/sop-library" element={<Navigate to="/playbook-library" replace />} />
            {/* Training Documents route */}
            <Route
              path="/training/documents"
              element={
                <ProtectedRoute>
                  <TrainingDocuments />
                </ProtectedRoute>
              }
            />
            {/* Role Onboarding SOP */}
            <Route
              path="/training/onboarding"
              element={
                <ProtectedRoute>
                  <RoleOnboarding />
                </ProtectedRoute>
              }
            />
            {/* Redirect old role-training to documents */}
            <Route
              path="/training/role-training"
              element={<Navigate to="/training/documents" replace />}
            />
            <Route
              path="/training/shingle-identification"
              element={
                <ProtectedRoute>
                  <ShingleIdentification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training/:category"
              element={
                <ProtectedRoute>
                  <Training />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools"
              element={
                <ProtectedRoute>
                  <Tools />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <Requests />
                </ProtectedRoute>
              }
            />
            {/* Training request forms (migrated from Forms & Requests) */}
            <Route path="/training/requests/it" element={<Navigate to="/requests?type=it_access" replace />} />
            <Route path="/training/requests/hr" element={<Navigate to="/requests?type=hr" replace />} />
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
