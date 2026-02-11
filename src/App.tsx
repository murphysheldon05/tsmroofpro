import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SOPLibrary from "./pages/SOPLibrary"; // Playbook Library
import MasterPlaybook from "./pages/MasterPlaybook";
import ResourceDetail from "./pages/ResourceDetail";
import Training from "./pages/Training";
import TrainingDocuments from "./pages/TrainingDocuments";
import RoleOnboarding from "./pages/RoleOnboarding";
import Tools from "./pages/Tools";
import Requests from "./pages/Requests";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import UserDirectory from "./pages/UserDirectory";
import Directory from "./pages/Directory";
import Warranties from "./pages/Warranties";
import Commissions from "./pages/Commissions";
import CommissionNew from "./pages/CommissionNew";
import CommissionDetail from "./pages/CommissionDetail";
import CommissionDocuments from "./pages/CommissionDocuments";
import CommissionDocumentNew from "./pages/CommissionDocumentNew";
import CommissionDocumentDetail from "./pages/CommissionDocumentDetail";
import BuildSchedule from "./pages/BuildSchedule";
import DeliverySchedule from "./pages/DeliverySchedule";
import CommandCenter from "./pages/CommandCenter";
import PendingReview from "./pages/PendingReview";
import OpsCompliance from "./pages/OpsCompliance";
import Draws from "./pages/Draws";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route
              path="/directory"
              element={
                <ProtectedRoute>
                  <UserDirectory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute>
                  <Directory />
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
              path="/ops-compliance"
              element={
                <ProtectedRoute>
                  <OpsCompliance />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
