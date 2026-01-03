import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  Wrench,
  Send,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  Hammer,
  FileCode,
  Calculator,
  Shield,
  UserPlus,
  Video,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string; icon?: React.ElementType }[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "SOP Library",
    icon: FileText,
    children: [
      { title: "Sales", href: "/sops/sales", icon: TrendingUp },
      { title: "Production", href: "/sops/production", icon: Hammer },
      { title: "Supplements", href: "/sops/supplements", icon: FileCode },
      { title: "Office Admin", href: "/sops/office-admin", icon: Building2 },
      { title: "Accounting", href: "/sops/accounting", icon: Calculator },
      { title: "Safety / HR", href: "/sops/safety-hr", icon: Shield },
      { title: "Templates", href: "/sops/templates-scripts", icon: FileCode },
    ],
  },
  {
    title: "Training",
    icon: GraduationCap,
    children: [
      { title: "New Hire", href: "/training/new-hire", icon: UserPlus },
      { title: "Role Training", href: "/training/role-training", icon: GraduationCap },
      { title: "Video Library", href: "/training/video-library", icon: Video },
    ],
  },
  {
    title: "Tools & Systems",
    href: "/tools",
    icon: Wrench,
  },
  {
    title: "Forms & Requests",
    href: "/requests",
    icon: Send,
  },
  {
    title: "Company",
    href: "/company",
    icon: Building2,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["SOP Library", "Training"]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (children?: { href: string }[]) =>
    children?.some((child) => location.pathname.startsWith(child.href));

  const handleNavClick = (href: string) => {
    navigate(href);
    setMobileOpen(false);
  };

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navigation.map((item) => (
          <div key={item.title}>
            {item.children ? (
              <Collapsible
                open={openSections.includes(item.title)}
                onOpenChange={() => toggleSection(item.title)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isParentActive(item.children)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {item.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        openSections.includes(item.title) && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 space-y-1">
                  {item.children.map((child) => (
                    <button
                      key={child.href}
                      onClick={() => handleNavClick(child.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive(child.href)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      {child.icon && <child.icon className="w-4 h-4" />}
                      {child.title}
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <button
                onClick={() => handleNavClick(item.href!)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href!)
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {isAdmin && (
          <button
            onClick={() => handleNavClick("/admin")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive("/admin")
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Settings className="w-4 h-4" />
            Admin Panel
          </button>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
