const routeModules: Record<string, () => Promise<unknown>> = {
  "/command-center": () => import("@/pages/CommandCenter"),
  "/commissions": () => import("@/pages/Commissions"),
  "/commissions/new": () => import("@/pages/CommissionNew"),
  "/my-commissions": () => import("@/pages/MyCommissionTracker"),
  "/commission-tracker": () => import("@/pages/CommissionTracker"),
  "/accounting": () => import("@/pages/Accounting"),
  "/build-schedule": () => import("@/pages/BuildSchedule"),
  "/delivery-schedule": () => import("@/pages/DeliverySchedule"),
  "/warranties": () => import("@/pages/Warranties"),
  "/vendors/subcontractors": () => import("@/pages/Directory"),
  "/vendors/contact-list": () => import("@/pages/ContactList"),
  "/user-directory": () => import("@/pages/UserDirectory"),
  "/admin": () => import("@/pages/Admin"),
  "/profile": () => import("@/pages/Profile"),
  "/requests": () => import("@/pages/Requests"),
  "/pending-review": () => import("@/pages/PendingReview"),
  "/commission-documents": () => import("@/pages/CommissionDocuments"),
};

const prefetched = new Set<string>();

export function prefetchRoute(href: string) {
  if (prefetched.has(href)) return;
  const loader = routeModules[href];
  if (loader) {
    prefetched.add(href);
    loader();
  }
}
