const routeModules: Record<string, () => Promise<unknown>> = {
  "/command-center": () => import("@/pages/CommandCenter"),
  "/commissions": () => import("@/pages/MyCommissions"),
  "/commissions/new": () => import("@/pages/CommissionNew"),
  "/commission-manager": () => import("@/pages/CommissionManager"),
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
