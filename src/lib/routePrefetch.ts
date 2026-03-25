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
  "/kpi-scorecards": () => import("@/pages/KpiScorecards"),
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

const PRIORITY_ROUTES = [
  "/command-center",
  "/commissions",
  "/commission-manager",
  "/build-schedule",
  "/profile",
];

let idlePrefetchScheduled = false;

export function scheduleIdlePrefetch() {
  if (idlePrefetchScheduled) return;
  idlePrefetchScheduled = true;

  const prefetchBatch = () => {
    let i = 0;
    const step = () => {
      if (i >= PRIORITY_ROUTES.length) return;
      prefetchRoute(PRIORITY_ROUTES[i]);
      i++;
      if (i < PRIORITY_ROUTES.length) {
        setTimeout(step, 200);
      }
    };
    step();
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetchBatch, { timeout: 4000 });
  } else {
    setTimeout(prefetchBatch, 2000);
  }
}
