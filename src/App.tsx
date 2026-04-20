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
import { NavigationProgress } from "@/components/NavigationProgress";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import {
  SalesRepScorecardRoute,
  SalesManagerScorecardRoute,
  OfficeAdminScorecardRoute,
  OperationsScorecardRoute,
  AccountingScorecardRoute,
  ProductionScorecardRoute,
  SupplementScorecardRoute,
} from "@/pages/KpiWeeklyScorecardRoutes";
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
const MyCommissions = lazy(() => import("./pages/MyCommissions"));
const CommissionNew = lazy(() => import("./pages/CommissionNew"));
const CommissionDocumentNew = lazy(() => import("./pages/CommissionDocumentNew"));
const CommissionDocumentDetail = lazy(() => import("./pages/CommissionDocumentDetail"));
const CommissionManager = lazy(() => import("./pages/CommissionManager"));
const BuildSchedule = lazy(() => import("./pages/BuildSchedule"));
const DeliverySchedule = lazy(() => import("./pages/DeliverySchedule"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const KpiScorecards = lazy(() => import("./pages/KpiScorecards"));
const KpiScorecardTemplateEditor = lazy(() => import("./pages/KpiScorecardTemplateEditor"));
const KpiScorecardScore = lazy(() => import("./pages/KpiScorecardScore"));
const KpiScorecardHistory = lazy(() => import("./pages/KpiScorecardHistory"));
const PendingReview = lazy(() => import("./pages/PendingReview"));
const ContactList = lazy(() => import("./pages/ContactList"));
const ChamberOfCommerce = lazy(() => import("./pages/ChamberOfCommerce"));
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
    <div className="animate-in fade-in duration-300 space-y-6 py-8 max-w-4xl">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-muted/70 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-muted/60 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ProtectedAppShell() {
  return (
    <ProtectedRoute>
      <PushNotificationManager />
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NavigationProgress />
          <WalkthroughProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedAppShell />}>
              <Route path="/command-center" element={<CommandCenter />} />
              <Route path="/kpi-scorecards" element={<KpiScorecards />} />
              <Route path="/kpi-scorecards/sales-rep" element={<SalesRepScorecardRoute />} />
              <Route path="/kpi-scorecards/sales-manager" element={<SalesManagerScorecardRoute />} />
              <Route path="/kpi-scorecards/office-admin" element={<OfficeAdminScorecardRoute />} />
              <Route path="/kpi-scorecards/operations" element={<OperationsScorecardRoute />} />
              <Route path="/kpi-scorecards/accounting" element={<AccountingScorecardRoute />} />
              <Route path="/kpi-scorecards/production" element={<ProductionScorecardRoute />} />
              <Route path="/kpi-scorecards/supplement" element={<SupplementScorecardRoute />} />
              <Route path="/kpi-scorecards/score/:assignmentId" element={<KpiScorecardScore />} />
              <Route path="/kpi-scorecards/view/:assignmentId" element={<KpiScorecardHistory />} />
              <Route path="/pending-review" element={<PendingReview />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user-directory" element={<UserDirectory />} />
              <Route path="/vendors/subcontractors" element={<Directory />} />
              <Route path="/vendors/contact-list" element={<ContactList />} />
              <Route path="/warranties" element={<Warranties />} />
              <Route path="/build-schedule" element={<BuildSchedule />} />
              <Route path="/delivery-schedule" element={<DeliverySchedule />} />
              <Route path="/commissions" element={<MyCommissions />} />
              <Route path="/commissions/new" element={<CommissionNew />} />
              <Route path="/commissions/:id" element={<CommissionDocumentDetail />} />
              <Route path="/commission-documents/new" element={<CommissionDocumentNew />} />
              <Route path="/commission-documents/:id" element={<CommissionDocumentDetail />} />
              <Route path="/chamber-of-commerce" element={<ChamberOfCommerce />} />

              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Admin />} />
                <Route path="/commission-manager" element={<CommissionManager />} />
                <Route path="/kpi-scorecards/templates/:id" element={<KpiScorecardTemplateEditor />} />
              </Route>
            </Route>

            <Route path="/dashboard" element={<Navigate to="/command-center" replace />} />
            <Route path="/company" element={<Navigate to="/command-center" replace />} />
            <Route path="/directory" element={<Navigate to="/vendors/contact-list" replace />} />
            <Route path="/vendors" element={<Navigate to="/vendors/subcontractors" replace />} />
            <Route path="/commissions/draws" element={<Navigate to="/commissions" replace />} />
            <Route path="/commissions/draw/new" element={<Navigate to="/commissions" replace />} />
            <Route path="/commission-documents" element={<Navigate to="/commissions" replace />} />
            <Route path="/my-commissions" element={<Navigate to="/commissions" replace />} />
            <Route path="/commission-tracker" element={<Navigate to="/commission-manager" replace />} />
            <Route path="/accounting" element={<Navigate to="/commission-manager" replace />} />
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
