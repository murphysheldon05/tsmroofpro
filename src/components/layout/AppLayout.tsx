import { ReactNode, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

// Route hierarchy mapping for proper breadcrumb display
const routeHierarchy: Record<string, BreadcrumbItem[]> = {
  "/command-center": [],
  "/dashboard": [{ label: "Dashboard", href: "/dashboard" }],
  "/sop-library": [{ label: "SOP Library", href: "/sop-library" }],
  "/resources/:id": [
    { label: "SOP Library", href: "/sop-library" },
    { label: "Resource", href: "" },
  ],
  "/training": [{ label: "Training", href: "/training" }],
  "/build-schedule": [{ label: "Production", href: "/build-schedule" }],
  "/delivery-schedule": [
    { label: "Production", href: "/build-schedule" },
    { label: "Delivery Schedule", href: "/delivery-schedule" },
  ],
  "/warranties": [
    { label: "Production", href: "/build-schedule" },
    { label: "Warranties", href: "/warranties" },
  ],
  "/tools": [{ label: "Tools & Systems", href: "/tools" }],
  "/requests": [{ label: "Forms & Requests", href: "/requests" }],
  "/commissions": [{ label: "Commissions", href: "/commissions" }],
  "/commission-documents": [
    { label: "Commissions", href: "/commissions" },
    { label: "Documents", href: "/commission-documents" },
  ],
  "/commissions/new": [
    { label: "Commissions", href: "/commissions" },
    { label: "New Submission", href: "/commissions/new" },
  ],
  "/commission-documents/new": [
    { label: "Commissions", href: "/commissions" },
    { label: "Documents", href: "/commission-documents" },
    { label: "New Document", href: "/commission-documents/new" },
  ],
  "/company": [{ label: "Company", href: "/company" }],
  "/directory": [{ label: "Team Directory", href: "/directory" }],
  "/profile": [{ label: "Profile", href: "/profile" }],
  "/admin": [{ label: "Admin", href: "/admin" }],
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Check for exact match first
  if (routeHierarchy[pathname]) {
    return routeHierarchy[pathname];
  }

  // Check for dynamic routes (e.g., /commissions/:id)
  if (pathname.startsWith("/commissions/") && pathname !== "/commissions/new") {
    return [
      { label: "Commissions", href: "/commissions" },
      { label: "Submission Details", href: pathname },
    ];
  }

  if (pathname.startsWith("/commission-documents/") && pathname !== "/commission-documents/new") {
    return [
      { label: "Commissions", href: "/commissions" },
      { label: "Documents", href: "/commission-documents" },
      { label: "Document Details", href: pathname },
    ];
  }

  if (pathname.startsWith("/resources/")) {
    return [
      { label: "SOP Library", href: "/sop-library" },
      { label: "Resource", href: pathname },
    ];
  }

  if (pathname.startsWith("/warranties/")) {
    return [
      { label: "Production", href: "/build-schedule" },
      { label: "Warranties", href: "/warranties" },
      { label: "Warranty Details", href: pathname },
    ];
  }

  // Fallback: generate from path segments
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === "/command-center";

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname),
    [location.pathname]
  );

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-8">
          {!isHome && breadcrumbs.length > 0 && (
            <nav className="mb-4 flex items-center gap-1 text-sm" aria-label="Breadcrumb">
              <Link
                to="/command-center"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={crumb.href || index} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {isLast ? (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
